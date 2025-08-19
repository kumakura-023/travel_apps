/**
 * ルートストアのマイグレーションヘルパー
 * 既存のコードを段階的に移行するためのアダプター関数
 */

import { useRouteStore } from "./routeStore";
import { RouteConnection } from "../types";

/**
 * useRouteSearchStoreの互換性アダプター
 */
export const useRouteSearchStore = () => {
  const {
    searchPanel,
    openSearchPanel,
    closeSearchPanel,
    setSearchOrigin,
    setSearchDestination,
    setSelectionMode,
    selectPointFromMap,
  } = useRouteStore();

  const adapter = {
    isRouteSearchOpen: searchPanel.isOpen,
    selectedOrigin: searchPanel.origin,
    selectedDestination: searchPanel.destination,
    selectionMode: searchPanel.selectionMode,

    openRouteSearch: openSearchPanel,
    closeRouteSearch: closeSearchPanel,
    setSelectedOrigin: setSearchOrigin,
    setSelectedDestination: setSearchDestination,
    clearSelections: () => {
      setSearchOrigin(null);
      setSearchDestination(null);
    },
    setSelectionMode,
    selectPointFromMap,
  };

  return adapter;
};

// getState関数を提供（静的アクセス用）
useRouteSearchStore.getState = () => {
  const state = useRouteStore.getState();
  return {
    isRouteSearchOpen: state.searchPanel.isOpen,
    selectedOrigin: state.searchPanel.origin,
    selectedDestination: state.searchPanel.destination,
    selectionMode: state.searchPanel.selectionMode,

    openRouteSearch: state.openSearchPanel,
    closeRouteSearch: state.closeSearchPanel,
    setSelectedOrigin: state.setSearchOrigin,
    setSelectedDestination: state.setSearchDestination,
    clearSelections: () => {
      state.setSearchOrigin(null);
      state.setSearchDestination(null);
    },
    setSelectionMode: state.setSelectionMode,
    selectPointFromMap: state.selectPointFromMap,
  };
};

/**
 * useRouteConnectionsStoreの互換性アダプター
 */
export const useRouteConnectionsStore = () => {
  const {
    connections,
    placeSelection,
    addConnection,
    removeConnection,
    clearAllConnections,
    startPlaceSelection,
    completePlaceSelection,
    cancelPlaceSelection,
    isPlaceSelected,
    getConnectionsByPlace,
  } = useRouteStore();

  // directionsServiceを使用したルート作成（旧実装の互換性のため）
  const createRouteBetweenPlaces = async (
    originId: string,
    destinationId: string,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<RouteConnection | null> => {
    // TODO: 実際の実装は別のサービスに移動
    console.log("createRouteBetweenPlaces called:", {
      originId,
      destinationId,
      travelMode,
    });
    return null;
  };

  const adapter = {
    routes: connections,
    selectionState: {
      isSelecting: placeSelection.isSelecting,
      selectedPlaceId: placeSelection.selectedPlaceId,
      selectedPlaces: placeSelection.selectedPlaces,
      selectionMode: placeSelection.selectionMethod,
    },

    addRoute: addConnection,
    removeRoute: removeConnection,
    clearAllRoutes: clearAllConnections,
    createRouteBetweenPlaces,

    startSelection: startPlaceSelection,
    completeSelection: completePlaceSelection,
    cancelSelection: cancelPlaceSelection,

    getPlaceCoordinates: (placeId: string) => {
      // TODO: サービス層に移動
      return null;
    },
    getRoutesByPlaceId: getConnectionsByPlace,
    isPlaceSelected,
  };

  return adapter;
};

// getState関数を提供（静的アクセス用）
useRouteConnectionsStore.getState = () => {
  const state = useRouteStore.getState();

  // directionsServiceを使用したルート作成（旧実装の互換性のため）
  const createRouteBetweenPlaces = async (
    originId: string,
    destinationId: string,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
  ): Promise<RouteConnection | null> => {
    // TODO: 実際の実装は別のサービスに移動
    console.log("createRouteBetweenPlaces called:", {
      originId,
      destinationId,
      travelMode,
    });
    return null;
  };

  return {
    routes: state.connections,
    selectionState: {
      isSelecting: state.placeSelection.isSelecting,
      selectedPlaceId: state.placeSelection.selectedPlaceId,
      selectedPlaces: state.placeSelection.selectedPlaces,
      selectionMode: state.placeSelection.selectionMethod,
    },

    addRoute: state.addConnection,
    removeRoute: state.removeConnection,
    clearAllRoutes: state.clearAllConnections,
    createRouteBetweenPlaces,

    startSelection: state.startPlaceSelection,
    completeSelection: state.completePlaceSelection,
    cancelSelection: state.cancelPlaceSelection,

    getPlaceCoordinates: (placeId: string) => {
      // TODO: サービス層に移動
      return null;
    },
    getRoutesByPlaceId: state.getConnectionsByPlace,
    isPlaceSelected: state.isPlaceSelected,
  };
};
