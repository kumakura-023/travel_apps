import { create } from 'zustand';

interface UIState {
  isTabNavigationVisible: boolean;
  isMapInteractionEnabled: boolean; // 地図操作の有効/無効
  toggleTabNavigation: () => void;
  hideTabNavigation: () => void;
  showTabNavigation: () => void;
  setMapInteraction: (enabled: boolean) => void; // 地図操作の状態を設定
}

export const useUIStore = create<UIState>((set) => ({
  isTabNavigationVisible: true,
  isMapInteractionEnabled: true, // デフォルトは有効
  toggleTabNavigation: () => set((state) => ({ 
    isTabNavigationVisible: !state.isTabNavigationVisible 
  })),
  hideTabNavigation: () => set({ isTabNavigationVisible: false }),
  showTabNavigation: () => set({ isTabNavigationVisible: true }),
  setMapInteraction: (enabled) => set({ isMapInteractionEnabled: enabled }),
})); 