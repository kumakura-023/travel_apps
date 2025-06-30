import { create } from 'zustand';
import { RouteConnection, PlaceSelectionState } from '../types';
import { directionsService } from '../services/directionsService';
import { usePlacesStore } from './placesStore';
import { useTravelTimeMode } from '../hooks/useTravelTimeMode';
import { v4 as uuidv4 } from 'uuid';

interface RouteConnectionsState {
  // ルート接続
  routes: RouteConnection[];
  
  // 地点選択状態
  selectionState: PlaceSelectionState;
  
  // アクション
  addRoute: (route: Omit<RouteConnection, 'id' | 'createdAt'>) => void;
  removeRoute: (routeId: string) => void;
  clearAllRoutes: () => void;
  
  // 2地点間のルートを作成
  createRouteBetweenPlaces: (
    originId: string,
    destinationId: string,
    travelMode?: google.maps.TravelMode
  ) => Promise<RouteConnection | null>;
  
  // 選択状態の管理
  startSelection: (placeId: string, method: 'ctrl-click' | 'long-press') => void;
  completeSelection: (destinationPlaceId: string) => Promise<void>;
  cancelSelection: () => void;
  
  // ユーティリティ
  getPlaceCoordinates: (placeId: string) => { lat: number; lng: number } | null;
  getRoutesByPlaceId: (placeId: string) => RouteConnection[];
  isPlaceSelected: (placeId: string) => boolean;
}

export const useRouteConnectionsStore = create<RouteConnectionsState>((set, get) => {
  console.log('RouteConnectionsStore initialized');
  
  return {
    routes: [],
    selectionState: {
      isSelecting: false,
      selectedPlaceId: null,
      selectionMode: null,
    },

  addRoute: (route) => {
    set((state) => ({
      routes: [
        ...state.routes,
        {
          ...route,
          id: uuidv4(),
          createdAt: new Date(),
        },
      ],
    }));
  },

  removeRoute: (routeId) => {
    console.log(`RouteConnectionsStore: removeRoute called for ${routeId}`);
    const currentState = get();
    const beforeCount = currentState.routes.length;
    const routeToRemove = currentState.routes.find(r => r.id === routeId);
    
    if (routeToRemove) {
      console.log(`Found route to remove:`, routeToRemove);
    } else {
      console.log(`Route ${routeId} not found in store`);
      return;
    }
    
    set((state) => {
      const filteredRoutes = state.routes.filter((route) => route.id !== routeId);
      console.log(`Routes: ${state.routes.length} -> ${filteredRoutes.length}`);
      return { routes: filteredRoutes };
    });
    
    // 削除後の状態を確認
    setTimeout(() => {
      const newState = get();
      console.log(`After removal - total routes: ${newState.routes.length}`);
    }, 100);
  },

  clearAllRoutes: () => {
    console.log('RouteConnectionsStore: clearAllRoutes called');
    const currentState = get();
    const currentRoutes = currentState.routes;
    console.log('現在のルート数:', currentRoutes.length);
    console.log('削除対象のルート:', currentRoutes.map(r => ({ id: r.id, origin: r.originId, dest: r.destinationId })));
    
    set({ routes: [] });
    console.log('RouteConnectionsStore: routes cleared');
    
    // クリア後の確認
    setTimeout(() => {
      const newState = get();
      console.log(`After clearAll - routes: ${newState.routes.length}`);
    }, 100);
  },

  createRouteBetweenPlaces: async (originId, destinationId, travelMode = google.maps.TravelMode.DRIVING) => {
    const state = get();
    
    const originCoords = state.getPlaceCoordinates(originId);
    const destCoords = state.getPlaceCoordinates(destinationId);
    
    if (!originCoords || !destCoords) {
      console.error('Could not find coordinates for places:', { originId, destinationId });
      return null;
    }
    
    try {
      console.log('Creating route between places:', { originId, destinationId, travelMode });
      
      const result = await directionsService.getRoute(
        originCoords,
        destCoords,
        travelMode
      );
      
      const route: Omit<RouteConnection, 'id' | 'createdAt'> = {
        originId,
        destinationId,
        originCoordinates: originCoords,
        destinationCoordinates: destCoords,
        travelMode,
        duration: result.duration,
        distance: result.distance,
        durationText: result.durationText,
        distanceText: result.distanceText,
        route: result.route,
      };
      
      state.addRoute(route);
      
      return {
        ...route,
        id: uuidv4(),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to create route:', error);
      return null;
    }
  },

  startSelection: (placeId, method) => {
    console.log('Starting place selection:', { placeId, method });
    set({
      selectionState: {
        isSelecting: true,
        selectedPlaceId: placeId,
        selectionMode: method,
      },
    });
  },

  completeSelection: async (destinationPlaceId) => {
    const state = get();
    const { selectedPlaceId } = state.selectionState;
    
    if (!selectedPlaceId || selectedPlaceId === destinationPlaceId) {
      state.cancelSelection();
      return;
    }
    
    console.log('Completing selection between:', { 
      origin: selectedPlaceId, 
      destination: destinationPlaceId 
    });
    
    // ルートを作成
    await state.createRouteBetweenPlaces(selectedPlaceId, destinationPlaceId);
    
    // 選択状態をリセット
    state.cancelSelection();
  },

  cancelSelection: () => {
    console.log('Cancelling place selection');
    set({
      selectionState: {
        isSelecting: false,
        selectedPlaceId: null,
        selectionMode: null,
      },
    });
  },

  getPlaceCoordinates: (placeId) => {
    // 候補地から検索
    const places = usePlacesStore.getState().places;
    const place = places.find(p => p.id === placeId);
    if (place) {
      return place.coordinates;
    }
    
    // 移動時間円から検索
    const circles = useTravelTimeMode.getState().circles;
    const circle = circles.find(c => c.id === placeId);
    if (circle) {
      return circle.center;
    }
    
    return null;
  },

  getRoutesByPlaceId: (placeId) => {
    const state = get();
    return state.routes.filter(
      route => route.originId === placeId || route.destinationId === placeId
    );
  },

  isPlaceSelected: (placeId) => {
    const state = get();
    return state.selectionState.selectedPlaceId === placeId;
  },
  };
});