import { create } from "zustand";

interface LabelModeState {
  labelMode: boolean;
  toggleLabelMode: () => void;
}

export const useLabelModeStore = create<LabelModeState>((set) => ({
  labelMode: false,
  toggleLabelMode: () => set((s) => ({ labelMode: !s.labelMode })),
}));
