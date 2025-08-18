import { create } from 'zustand';
import { PlaceCategory } from '../types';

interface UIState {
  isTabNavigationVisible: boolean;
  isMapInteractionEnabled: boolean; // 地図操作の有効/無効
  selectedCategories: PlaceCategory[]; // 選択中のカテゴリ
  isCategoryFilterModalOpen: boolean; // カテゴリフィルターモーダルの表示状態
  toggleTabNavigation: () => void;
  hideTabNavigation: () => void;
  showTabNavigation: () => void;
  setMapInteraction: (enabled: boolean) => void; // 地図操作の状態を設定
  setSelectedCategories: (categories: PlaceCategory[]) => void; // カテゴリ設定
  toggleCategory: (category: PlaceCategory) => void; // カテゴリ切り替え
  openCategoryFilterModal: () => void; // カテゴリフィルターモーダルを開く
  closeCategoryFilterModal: () => void; // カテゴリフィルターモーダルを閉じる
}

export const useUIStore = create<UIState>((set) => ({
  isTabNavigationVisible: true,
  isMapInteractionEnabled: true, // デフォルトは有効
  selectedCategories: [], // 初期状態では全カテゴリを表示
  isCategoryFilterModalOpen: false, // モーダルは初期状態では閉じている
  toggleTabNavigation: () => set((state) => ({ 
    isTabNavigationVisible: !state.isTabNavigationVisible 
  })),
  hideTabNavigation: () => set({ isTabNavigationVisible: false }),
  showTabNavigation: () => set({ isTabNavigationVisible: true }),
  setMapInteraction: (enabled) => set({ isMapInteractionEnabled: enabled }),
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  toggleCategory: (category) => set((state) => {
    const isSelected = state.selectedCategories.includes(category);
    if (isSelected) {
      return { selectedCategories: state.selectedCategories.filter(c => c !== category) };
    } else {
      return { selectedCategories: [...state.selectedCategories, category] };
    }
  }),
  openCategoryFilterModal: () => set({ isCategoryFilterModalOpen: true }),
  closeCategoryFilterModal: () => set({ isCategoryFilterModalOpen: false }),
})); 