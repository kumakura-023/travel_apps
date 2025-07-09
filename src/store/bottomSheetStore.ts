import { create } from 'zustand';

interface BottomSheetStore {
  percent: number;
  isDragging: boolean;
  setState: (percent: number, isDragging: boolean) => void;
}

export const useBottomSheetStore = create<BottomSheetStore>((set) => ({
  percent: 100, // デフォルトで閉じた状態
  isDragging: false,
  setState: (percent, isDragging) => set({ percent, isDragging }),
})); 