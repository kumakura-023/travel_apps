import { create } from "zustand";

/**
 * サジェスト関連の状態インターフェース
 */
interface SuggestionState {
  /** 検索クエリ文字列 */
  query: string;
  /** Autocomplete 予測候補リスト */
  predictions: google.maps.places.AutocompletePrediction[];
  /** 上位3件のリッチ詳細情報（place_id -> PlaceResult） */
  richDetails: Map<string, google.maps.places.PlaceResult>;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;

  // === Actions ===
  /** クエリを設定 */
  setQuery: (query: string) => void;
  /** 予測候補を設定 */
  setPredictions: (
    predictions: google.maps.places.AutocompletePrediction[],
  ) => void;
  /** リッチ詳細を追加（Map更新） */
  setRichDetail: (
    placeId: string,
    detail: google.maps.places.PlaceResult,
  ) => void;
  /** ローディング状態を設定 */
  setLoading: (isLoading: boolean) => void;
  /** エラーを設定 */
  setError: (error: string | null) => void;
  /** すべての状態を初期値にリセット */
  clear: () => void;
}

/**
 * サジェスト状態管理Store
 */
export const useSuggestionStore = create<SuggestionState>((set) => ({
  query: "",
  predictions: [],
  richDetails: new Map(),
  isLoading: false,
  error: null,

  setQuery: (query) => set({ query }),

  setPredictions: (predictions) => set({ predictions }),

  setRichDetail: (placeId, detail) =>
    set((state) => {
      const newMap = new Map(state.richDetails);
      newMap.set(placeId, detail);
      return { richDetails: newMap };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      query: "",
      predictions: [],
      richDetails: new Map(),
      isLoading: false,
      error: null,
    }),
}));
