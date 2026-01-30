import { create } from "zustand";
import type { Prefecture, City } from "../types/region";

/**
 * 地域検索の状態インターフェース
 */
interface RegionSearchState {
  // Modal state
  /** モーダルの開閉状態 */
  isModalOpen: boolean;

  // Spot list state
  /** スポットリストの開閉状態 */
  isSpotListOpen: boolean;

  // Selection state
  /** 選択中の都道府県 */
  selectedPrefecture: Prefecture | null;
  /** 選択中の市区町村 */
  selectedCity: City | null;

  // Spots state
  /** 検索結果のスポットリスト */
  spots: google.maps.places.PlaceResult[];

  // Filter state
  /** 選択中のカテゴリ */
  selectedCategory: string | null;

  // Loading state
  /** ローディング状態 */
  isLoading: boolean;

  // Error state
  /** エラーメッセージ */
  error: string | null;

  // === Modal actions ===
  /** モーダルを開く */
  openModal: () => void;
  /** モーダルを閉じる */
  closeModal: () => void;

  // === Selection actions ===
  /** 都道府県を選択（市区町村はクリア） */
  selectPrefecture: (prefecture: Prefecture) => void;
  /** 市区町村を選択 */
  selectCity: (city: City) => void;
  /** 選択をクリア */
  clearSelection: () => void;

  // === Spot list actions ===
  /** スポットリストを開く（モーダルを閉じる） */
  openSpotList: () => void;
  /** スポットリストを閉じる（スポットとカテゴリをクリア） */
  closeSpotList: () => void;
  /** スポットを設定 */
  setSpots: (spots: google.maps.places.PlaceResult[]) => void;
  /** スポットを追加 */
  appendSpots: (spots: google.maps.places.PlaceResult[]) => void;

  // === Filter actions ===
  /** カテゴリを設定 */
  setCategory: (category: string | null) => void;

  // === Loading/Error actions ===
  /** ローディング状態を設定 */
  setLoading: (isLoading: boolean) => void;
  /** エラーを設定 */
  setError: (error: string | null) => void;

  // === Reset ===
  /** すべての状態を初期値にリセット */
  reset: () => void;
}

const initialState = {
  isModalOpen: false,
  isSpotListOpen: false,
  selectedPrefecture: null,
  selectedCity: null,
  spots: [],
  selectedCategory: null,
  isLoading: false,
  error: null,
};

/**
 * 地域検索状態管理Store
 */
export const useRegionSearchStore = create<RegionSearchState>((set) => ({
  ...initialState,

  // Modal actions
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  // Selection actions
  selectPrefecture: (prefecture) =>
    set({ selectedPrefecture: prefecture, selectedCity: null }),
  selectCity: (city) => set({ selectedCity: city }),
  clearSelection: () => set({ selectedPrefecture: null, selectedCity: null }),

  // Spot list actions
  openSpotList: () => set({ isSpotListOpen: true, isModalOpen: false }),
  closeSpotList: () =>
    set({ isSpotListOpen: false, spots: [], selectedCategory: null }),
  setSpots: (spots) => set({ spots }),
  appendSpots: (newSpots) =>
    set((state) => ({ spots: [...state.spots, ...newSpots] })),

  // Filter actions
  setCategory: (category) => set({ selectedCategory: category }),

  // Loading/Error actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Reset
  reset: () => set(initialState),
}));
