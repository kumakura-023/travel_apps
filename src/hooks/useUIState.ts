import { useCallback } from "react";
import { useUIStore } from "../store/uiStore";
import { useLabelModeStore } from "../store/labelModeStore";

export type TabType = "map" | "list" | "travelTime";

export interface UIStateHook {
  isMapInteractionEnabled: boolean;
  isTabNavigationVisible: boolean;
  labelMode: boolean;
  selectedTab: TabType;

  toggleMapInteraction: () => void;
  setMapInteraction: (enabled: boolean) => void;
  toggleTabNavigation: () => void;
  toggleLabelMode: () => void;
  selectTab: (tab: TabType) => void;
}

export function useUIState(): UIStateHook {
  const mapInteraction = useUIStore((s) => s.isMapInteractionEnabled);
  const tabNavVisible = useUIStore((s) => s.isTabNavigationVisible);
  const labelMode = useLabelModeStore((s) => s.labelMode);

  // Note: selectedTab might be managed elsewhere, using map as default
  const selectedTab: TabType = "map";

  const toggleMapInteraction = useCallback(() => {
    const current = useUIStore.getState().isMapInteractionEnabled;
    useUIStore.getState().setMapInteraction(!current);
  }, []);

  const setMapInteraction = useCallback((enabled: boolean) => {
    useUIStore.getState().setMapInteraction(enabled);
  }, []);

  const toggleTabNavigation = useCallback(() => {
    useUIStore.getState().toggleTabNavigation();
  }, []);

  const toggleLabelMode = useCallback(() => {
    useLabelModeStore.getState().toggleLabelMode();
  }, []);

  const selectTab = useCallback((tab: TabType) => {
    // Tab selection logic would be implemented here
    console.log(`Selecting tab: ${tab}`);
  }, []);

  return {
    isMapInteractionEnabled: mapInteraction,
    isTabNavigationVisible: tabNavVisible,
    labelMode,
    selectedTab,
    toggleMapInteraction,
    setMapInteraction,
    toggleTabNavigation,
    toggleLabelMode,
    selectTab,
  };
}
