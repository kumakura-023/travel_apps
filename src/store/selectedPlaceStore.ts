import { create } from "zustand";

interface SelectedPlaceState {
  place: google.maps.places.PlaceResult | null;
  setPlace: (place: google.maps.places.PlaceResult | null) => void;
}

export const useSelectedPlaceStore = create<SelectedPlaceState>((set) => ({
  place: null,
  setPlace: (place) => set({ place }),
}));
