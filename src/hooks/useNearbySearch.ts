import { useCallback, useEffect, useRef } from "react";
import { useRegionSearchStore } from "../store/regionSearchStore";
import { getPlacesApiService } from "../services/placesApiService";

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
 * Nearby Search ロジックを管理するカスタムフック
 *
 * 地域選択後のスポット検索を実現する
 * - スポットリストが開かれた時に自動検索
 * - カテゴリ変更時に再検索
 * - ページネーションによる追加読み込み
 */
export function useNearbySearch() {
  const {
    selectedCity,
    selectedCategory,
    isSpotListOpen,
    setSpots,
    appendSpots,
    setLoading,
    setError,
  } = useRegionSearchStore();

  // ページネーション用の参照
  const paginationRef = useRef<google.maps.places.PlaceSearchPagination | null>(
    null,
  );
  const hasMoreRef = useRef(false);

  /**
   * スポットを検索する
   */
  const searchSpots = useCallback(async () => {
    if (!selectedCity) return;

    setLoading(true);
    setError(null);
    setSpots([]);

    try {
      const service = getPlacesApiService();
      const { results, pagination } = await service.searchNearbySpots(
        selectedCity.center,
        {
          radius: selectedCity.searchRadius,
          type: selectedCategory || "tourist_attraction",
        },
      );

      setSpots(results);
      paginationRef.current = pagination;
      hasMoreRef.current = pagination?.hasNextPage ?? false;
    } catch (error) {
      console.error("Nearby search failed:", error);
      setError(getPlacesErrorMessage(error, "スポットの検索に失敗しました"));
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCategory, setSpots, setLoading, setError]);

  /**
   * 追加のスポットを読み込む
   */
  const loadMore = useCallback(async () => {
    if (!paginationRef.current || !hasMoreRef.current) return;

    setLoading(true);

    try {
      const service = getPlacesApiService();
      const { results, pagination } = await service.loadMoreSpots(
        paginationRef.current,
      );

      appendSpots(results);
      paginationRef.current = pagination;
      hasMoreRef.current = pagination?.hasNextPage ?? false;
    } catch (error) {
      console.error("Load more failed:", error);
      setError(
        getPlacesErrorMessage(error, "追加のスポット読み込みに失敗しました"),
      );
    } finally {
      setLoading(false);
    }
  }, [appendSpots, setLoading, setError]);

  /**
   * もっと読み込めるかどうか
   */
  const hasMore = () => hasMoreRef.current;

  // スポットリストが開かれた時に自動検索
  useEffect(() => {
    if (isSpotListOpen && selectedCity) {
      searchSpots();
    }
  }, [isSpotListOpen, selectedCity, searchSpots]);

  // カテゴリ変更時に再検索
  useEffect(() => {
    if (isSpotListOpen && selectedCity && selectedCategory !== null) {
      searchSpots();
    }
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    searchSpots,
    loadMore,
    hasMore,
  };
}
