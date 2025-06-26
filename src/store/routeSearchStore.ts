import { create } from 'zustand';

interface SelectedPoint {
  lat: number;
  lng: number;
  name: string;
}

interface RouteSearchState {
  isRouteSearchOpen: boolean;
  selectedOrigin: SelectedPoint | null;
  selectedDestination: SelectedPoint | null;
  
  // Actions
  openRouteSearch: () => void;
  closeRouteSearch: () => void;
  setSelectedOrigin: (point: SelectedPoint | null) => void;
  setSelectedDestination: (point: SelectedPoint | null) => void;
  clearSelections: () => void;
}

export const useRouteSearchStore = create<RouteSearchState>((set) => ({
  isRouteSearchOpen: false,
  selectedOrigin: null,
  selectedDestination: null,

  openRouteSearch: () => set({ isRouteSearchOpen: true }),
  closeRouteSearch: () => set({ 
    isRouteSearchOpen: false,
    selectedOrigin: null,
    selectedDestination: null
  }),
  setSelectedOrigin: (point) => set({ selectedOrigin: point }),
  setSelectedDestination: (point) => set({ selectedDestination: point }),
  clearSelections: () => set({ 
    selectedOrigin: null, 
    selectedDestination: null 
  })
})); 