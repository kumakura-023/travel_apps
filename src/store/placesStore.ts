import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Place } from '../types';
import { syncDebugUtils } from '../utils/syncDebugUtils';
import { usePlanStore } from './planStore';

interface PlacesState {
  places: Place[];
  onPlaceAdded?: (place: Place) => void;
  onPlaceDeleted?: (updatedPlaces: Place[]) => void;
  setOnPlaceAdded: (callback: (place: Place) => void) => void;
  setOnPlaceDeleted: (callback: (updatedPlaces: Place[]) => void) => void;
  addPlace: (partial: Partial<Place>) => void;
  updatePlace: (id: string, update: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  clearPlaces: () => void;
  getFilteredPlaces: () => Place[];
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  get filteredPlaces() {
    return get().places.filter(p => !p.deleted);
  },
  onPlaceAdded: undefined,
  onPlaceDeleted: undefined,
  setOnPlaceAdded: (callback) => set({ onPlaceAdded: callback }),
  setOnPlaceDeleted: (callback) => set({ onPlaceDeleted: callback }),
  addPlace: (partial) =>
    set((state) => {
      if (!partial.coordinates) {
        throw new Error('Coordinates are required for adding a place');
      }
      
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
      
      // ローカルストレージへの保存は無効化（プラン共有位置のみを使用）
      // saveLastActionPosition(newPlace.coordinates);
      
      // Firestoreに最後の操作位置を保存（プラン共有）
      usePlanStore.getState().updateLastActionPosition(newPlace.coordinates, 'place').catch(error => {
        console.error('[placesStore] Failed to update last action position:', error);
      });

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
        // 削除フラグを立ててタイムスタンプを更新
        const updatedPlace = { ...placeToDelete, deleted: true, updatedAt: new Date() };
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

        const updatedPlaces = state.places.map(p => p.id === id ? updatedPlace : p);
        
        // 削除コールバックを実行（状態更新後）
        if (state.onPlaceDeleted) {
          state.onPlaceDeleted(updatedPlaces);
        }
        
        if (import.meta.env.DEV) {
          console.log(`Places: ${state.places.length} -> ${updatedPlaces.length}`);
        }
        
        return {
          places: updatedPlaces,
        };
      }
      
      // 場所が見つからなかった場合
      return {
        places: state.places,
      };
    });
  },
  clearPlaces: () => set({ places: [] }),
  getFilteredPlaces: () => get().places.filter(p => !p.deleted),
})); 