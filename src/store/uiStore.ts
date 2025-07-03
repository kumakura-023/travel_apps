import { create } from 'zustand';

interface UIState {
  isTabNavigationVisible: boolean;
  toggleTabNavigation: () => void;
  hideTabNavigation: () => void;
  showTabNavigation: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTabNavigationVisible: true, // デフォルトは表示
  toggleTabNavigation: () => set((state) => ({ 
    isTabNavigationVisible: !state.isTabNavigationVisible 
  })),
  hideTabNavigation: () => set({ isTabNavigationVisible: false }),
  showTabNavigation: () => set({ isTabNavigationVisible: true }),
})); 