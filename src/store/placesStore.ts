import { create } from 'zustand';
import { Place } from '../types';
import { storeEventBus } from '../events/StoreEvents';

interface PlacesState {
  placesByPlan: Map<string, Map<string, Place>>;
  selectedPlaceId: string | null;
  
  // 計算プロパティ
  getPlacesForPlan: (planId: string) => Place[];
  getPlaceById: (planId: string, placeId: string) => Place | undefined;
  selectPlace: (placeId: string | null) => void;
  
  // 内部メソッド
  _setPlacesForPlan: (planId: string, places: Place[]) => void;
  _addPlace: (planId: string, place: Place) => void;
  _updatePlace: (planId: string, placeId: string, changes: Partial<Place>) => void;
  _deletePlace: (planId: string, placeId: string) => void;
}

export const usePlacesStore = create<PlacesState>((set, get) => {
  // イベントリスナーの設定
  const unsubscribePlanLoaded = storeEventBus.on('PLAN_LOADED', (event) => {
    if (event.type === 'PLAN_LOADED') {
      const placesMap = new Map<string, Place>();
      event.plan.places?.forEach(place => {
        placesMap.set(place.id, place);
      });
      
      set((state) => ({
        placesByPlan: new Map(state.placesByPlan.set(event.planId, placesMap))
      }));
    }
  });

  const unsubscribePlaceAdded = storeEventBus.on('PLACE_ADDED', (event) => {
    if (event.type === 'PLACE_ADDED') {
      set((state) => {
        const planPlaces = state.placesByPlan.get(event.planId) || new Map();
        const updatedPlaces = new Map(planPlaces.set(event.place.id, event.place));
        const updatedPlans = new Map(state.placesByPlan.set(event.planId, updatedPlaces));
        
        return { placesByPlan: updatedPlans };
      });
    }
  });

  const unsubscribePlaceUpdated = storeEventBus.on('PLACE_UPDATED', (event) => {
    if (event.type === 'PLACE_UPDATED') {
      set((state) => {
        const planPlaces = state.placesByPlan.get(event.planId);
        if (planPlaces && planPlaces.has(event.placeId)) {
          const currentPlace = planPlaces.get(event.placeId)!;
          const updatedPlace = { ...currentPlace, ...event.changes };
          const updatedPlaces = new Map(planPlaces.set(event.placeId, updatedPlace));
          const updatedPlans = new Map(state.placesByPlan.set(event.planId, updatedPlaces));
          
          return { placesByPlan: updatedPlans };
        }
        return state;
      });
    }
  });

  const unsubscribePlaceDeleted = storeEventBus.on('PLACE_DELETED', (event) => {
    if (event.type === 'PLACE_DELETED') {
      set((state) => {
        const planPlaces = state.placesByPlan.get(event.planId);
        if (planPlaces && planPlaces.has(event.placeId)) {
          const updatedPlaces = new Map(planPlaces);
          updatedPlaces.delete(event.placeId);
          const updatedPlans = new Map(state.placesByPlan.set(event.planId, updatedPlaces));
          
          // 削除された場所が選択されていた場合、選択を解除
          const newSelectedPlaceId = state.selectedPlaceId === event.placeId ? null : state.selectedPlaceId;
          
          return {
            placesByPlan: updatedPlans,
            selectedPlaceId: newSelectedPlaceId
          };
        }
        return state;
      });
    }
  });

  return {
    placesByPlan: new Map(),
    selectedPlaceId: null,
    
    // 計算プロパティ
    getPlacesForPlan: (planId: string) => {
      const planPlaces = get().placesByPlan.get(planId) || new Map();
      return Array.from(planPlaces.values()).filter(p => !p.deleted);
    },
    
    getPlaceById: (planId: string, placeId: string) => {
      const planPlaces = get().placesByPlan.get(planId);
      return planPlaces?.get(placeId);
    },
    
    selectPlace: (placeId: string | null) => set({ selectedPlaceId: placeId }),
    
    // 内部メソッド（直接操作用、通常はイベント経由で呼ばれる）
    _setPlacesForPlan: (planId: string, places: Place[]) => {
      const placesMap = new Map<string, Place>();
      places.forEach(place => placesMap.set(place.id, place));
      
      set((state) => ({
        placesByPlan: new Map(state.placesByPlan.set(planId, placesMap))
      }));
    },
    
    _addPlace: (planId: string, place: Place) => {
      set((state) => {
        const planPlaces = state.placesByPlan.get(planId) || new Map();
        const updatedPlaces = new Map(planPlaces.set(place.id, place));
        const updatedPlans = new Map(state.placesByPlan.set(planId, updatedPlaces));
        
        return { placesByPlan: updatedPlans };
      });
    },
    
    _updatePlace: (planId: string, placeId: string, changes: Partial<Place>) => {
      set((state) => {
        const planPlaces = state.placesByPlan.get(planId);
        if (planPlaces && planPlaces.has(placeId)) {
          const currentPlace = planPlaces.get(placeId)!;
          const updatedPlace = { ...currentPlace, ...changes };
          const updatedPlaces = new Map(planPlaces.set(placeId, updatedPlace));
          const updatedPlans = new Map(state.placesByPlan.set(planId, updatedPlaces));
          
          return { placesByPlan: updatedPlans };
        }
        return state;
      });
    },
    
    _deletePlace: (planId: string, placeId: string) => {
      set((state) => {
        const planPlaces = state.placesByPlan.get(planId);
        if (planPlaces && planPlaces.has(placeId)) {
          const updatedPlaces = new Map(planPlaces);
          updatedPlaces.delete(placeId);
          const updatedPlans = new Map(state.placesByPlan.set(planId, updatedPlaces));
          
          // 削除された場所が選択されていた場合、選択を解除
          const newSelectedPlaceId = state.selectedPlaceId === placeId ? null : state.selectedPlaceId;
          
          return {
            placesByPlan: updatedPlans,
            selectedPlaceId: newSelectedPlaceId
          };
        }
        return state;
      });
    }
  };
});