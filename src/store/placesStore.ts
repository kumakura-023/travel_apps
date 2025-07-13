import { create } from 'zustand';
import { Place } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { syncDebugUtils } from '../utils/syncDebugUtils';

interface PlacesState {
  places: Place[];
  addPlace: (partial: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlace: (id: string, update: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  // 即座同期用のコールバック
  onPlaceAdded?: (place: Place) => void;
  setOnPlaceAdded: (callback: (place: Place) => void) => void;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  onPlaceAdded: undefined,
  setOnPlaceAdded: (callback) => set({ onPlaceAdded: callback }),
  addPlace: (partial) =>
    set((state) => {
      const newPlace = {
        ...partial,
        labelHidden: true,
        labelPosition: {
          lat: partial.coordinates.lat,
          lng: partial.coordinates.lng,
        },
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Place;

      const newState = {
        places: [...state.places, newPlace],
      };

      // 即座同期コールバックを実行
      if (state.onPlaceAdded) {
        state.onPlaceAdded(newPlace);
      }

      return newState;
    }),
  updatePlace: (id, update) =>
    set((state) => ({
      places: state.places.map((p) => (p.id === id ? { ...p, ...update, updatedAt: new Date() } : p)),
    })),
  deletePlace: (id) => {
    if (import.meta.env.DEV) {
      console.log(`deletePlace called: ${id}`);
    }
    set((state) => {
      const placeToDelete = state.places.find(p => p.id === id);
      if (placeToDelete) {
        if (import.meta.env.DEV) {
          console.log(`Deleting place: ${placeToDelete.name} (${id})`);
        }
        // 削除前にタイムスタンプを更新して同期を確実にする
        const updatedPlace = { ...placeToDelete, updatedAt: new Date() };
        if (import.meta.env.DEV) {
          console.log(`Updated timestamp before deletion: ${updatedPlace.updatedAt.toISOString()}`);
        }
        
        // デバッグログを記録
        syncDebugUtils.log('delete', {
          type: 'place',
          id: placeToDelete.id,
          name: placeToDelete.name,
          timestamp: updatedPlace.updatedAt.getTime(),
          totalPlacesBefore: state.places.length,
          totalPlacesAfter: state.places.length - 1
        });
      }
      
      const filteredPlaces = state.places.filter((p) => p.id !== id);
      if (import.meta.env.DEV) {
        console.log(`Places: ${state.places.length} -> ${filteredPlaces.length}`);
      }
      return {
        places: filteredPlaces,
      };
    });
  },
})); 