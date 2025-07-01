import { create } from 'zustand';
import { Place } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PlacesState {
  places: Place[];
  addPlace: (partial: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlace: (id: string, update: Partial<Place>) => void;
  deletePlace: (id: string) => void;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  addPlace: (partial) =>
    set((state) => ({
      places: [
        ...state.places,
        {
          ...partial,
          labelHidden: true,
          labelPosition: {
            lat: partial.coordinates.lat,
            lng: partial.coordinates.lng,
          },
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Place,
      ],
    })),
  updatePlace: (id, update) =>
    set((state) => ({
      places: state.places.map((p) => (p.id === id ? { ...p, ...update, updatedAt: new Date() } : p)),
    })),
  deletePlace: (id) => {
    console.log(`deletePlace called: ${id}`);
    set((state) => {
      const filteredPlaces = state.places.filter((p) => p.id !== id);
      console.log(`Places: ${state.places.length} -> ${filteredPlaces.length}`);
      return {
        places: filteredPlaces,
      };
    });
  },
})); 