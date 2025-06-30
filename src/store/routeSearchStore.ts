import { create } from 'zustand';

interface SelectedPoint {
  lat: number;
  lng: number;
  name: string;
}

type SelectionMode = 'origin' | 'destination' | null;

interface RouteSearchState {
  isRouteSearchOpen: boolean;
  selectedOrigin: SelectedPoint | null;
  selectedDestination: SelectedPoint | null;
  selectionMode: SelectionMode; // POI選択モード
  
  // Actions
  openRouteSearch: () => void;
  closeRouteSearch: () => void;
  setSelectedOrigin: (point: SelectedPoint | null) => void;
  setSelectedDestination: (point: SelectedPoint | null) => void;
  clearSelections: () => void;
  setSelectionMode: (mode: SelectionMode) => void;
  selectPointFromMap: (point: SelectedPoint) => void; // 地図からの地点選択
}

export const useRouteSearchStore = create<RouteSearchState>((set, get) => ({
  isRouteSearchOpen: false,
  selectedOrigin: null,
  selectedDestination: null,
  selectionMode: null,

  openRouteSearch: () => set({ isRouteSearchOpen: true }),
  closeRouteSearch: () => {
    console.log('RouteSearchStore: closeRouteSearch - clearing all data');
    set({ 
      isRouteSearchOpen: false,
      selectedOrigin: null,
      selectedDestination: null,
      selectionMode: null
    });
  },
  setSelectedOrigin: (point) => set({ selectedOrigin: point }),
  setSelectedDestination: (point) => set({ selectedDestination: point }),
  clearSelections: () => set({ 
    selectedOrigin: null, 
    selectedDestination: null 
  }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  selectPointFromMap: (point) => {
    const state = get();
    console.log('🎯 selectPointFromMap called', { 
      selectionMode: state.selectionMode, 
      point 
    });
    if (state.selectionMode === 'origin') {
      console.log('✅ Setting origin point and clearing selection mode');
      set({ selectedOrigin: point, selectionMode: null });
      console.log('✅ Origin point set:', point);
    } else if (state.selectionMode === 'destination') {
      console.log('✅ Setting destination point and clearing selection mode');
      set({ selectedDestination: point, selectionMode: null });
      console.log('✅ Destination point set:', point);
    } else {
      console.log('❌ No valid selection mode, ignoring');
    }
  }
})); 