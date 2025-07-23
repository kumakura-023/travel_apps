import { create } from 'zustand';

interface BrowserPromptState {
  showExternalBrowserPrompt: boolean;
  setShowExternalBrowserPrompt: (show: boolean) => void;
}

export const useBrowserPromptStore = create<BrowserPromptState>((set) => ({
  showExternalBrowserPrompt: false,
  setShowExternalBrowserPrompt: (show) => set({ showExternalBrowserPrompt: show }),
}));
