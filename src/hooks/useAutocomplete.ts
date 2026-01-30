import { useCallback, useEffect, useRef } from "react";
import { useSuggestionStore } from "../store/suggestionStore";
import { useSelectedPlaceStore } from "../store/selectedPlaceStore";
import { getPlacesApiService } from "../services/placesApiService";
import { useGoogleMaps } from "./useGoogleMaps";

/** debounce 時間（ミリ秒） */
const DEBOUNCE_MS = 300;

/** リッチ詳細を取得する最大件数 */
const MAX_RICH_DETAILS = 3;

const getPlacesErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("OVER_QUERY_LIMIT")) {
      return "検索回数が上限に達しました。しばらくしてからお試しください。";
    }
    if (message.includes("REQUEST_DENIED")) {
      return "検索が拒否されました。";
    }
    if (message.includes("INVALID_REQUEST")) {
      return "検索条件が無効です。";
    }
  }

  return fallback;
};

/**
 * Autocomplete ロジックを提供するカスタムフック
 *
 * @returns {Object} Autocomplete 操作用のオブジェクト
 */
export function useAutocomplete() {
  // Store から状態とアクションを取得
  const {
    query,
    setQuery,
    setPredictions,
    setRichDetail,
    setLoading,
    setError,
    clear,
  } = useSuggestionStore();

  const setPlace = useSelectedPlaceStore((s) => s.setPlace);
  const { panTo } = useGoogleMaps();

  // debounce 用の ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * クエリ変更時のハンドラ
   * - debounce で API 呼び出しを制御
   * - 予測結果取得後、上位3件の詳細を並列取得
   */
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      // 既存のタイマーをクリア
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 空文字の場合は即座にクリア
      if (!newQuery.trim()) {
        setPredictions([]);
        return;
      }

      // debounce 後に API 呼び出し
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);

        try {
          const service = getPlacesApiService();

          // 新しいセッションを開始
          service.startNewSession();

          // 予測候補を取得
          const predictions = await service.getPredictions(newQuery);
          setPredictions(predictions);

          // 上位3件のリッチ詳細を並列取得
          const top3 = predictions.slice(0, MAX_RICH_DETAILS);
          await Promise.all(
            top3.map(async (prediction) => {
              const detail = await service.getDetailsForSuggestion(
                prediction.place_id,
              );
              if (detail) {
                setRichDetail(prediction.place_id, detail);
              }
            }),
          );
        } catch (error) {
          console.error("Autocomplete error:", error);
          setPredictions([]);
          setError(
            getPlacesErrorMessage(error, "検索中にエラーが発生しました"),
          );
        } finally {
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [setQuery, setPredictions, setRichDetail, setLoading, setError],
  );

  /**
   * 候補選択時のハンドラ
   * - 完全な詳細を取得
   * - selectedPlaceStore を更新
   * - 地図を移動
   * - サジェスト状態をクリア
   */
  const handleSelect = useCallback(
    async (placeId: string): Promise<boolean> => {
      setLoading(true);
      let didSelect = false;

      try {
        const service = getPlacesApiService();
        const detail = await service.getFullDetails(placeId);

        if (detail && detail.geometry?.location) {
          // Store を更新
          setPlace(detail);

          // 地図を移動
          panTo(
            detail.geometry.location.lat(),
            detail.geometry.location.lng(),
            15, // ズームレベル
          );

          didSelect = true;
        }
      } catch (error) {
        console.error("Place details error:", error);
        setError(getPlacesErrorMessage(error, "詳細の取得に失敗しました"));
      } finally {
        setLoading(false);
        if (didSelect) {
          clear();
        }
      }

      return didSelect;
    },
    [setPlace, panTo, setLoading, setError, clear],
  );

  // クリーンアップ: コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    /** 現在の検索クエリ */
    query,
    /** クエリ変更ハンドラ（debounce付き） */
    handleQueryChange,
    /** 候補選択ハンドラ */
    handleSelect,
    /** 状態をクリア */
    clear,
  };
}
