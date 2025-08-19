import { create } from "zustand";
import { RouteConnection, Place } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * ルート検索の選択地点
 */
interface SelectedPoint {
  lat: number;
  lng: number;
  name: string;
}

/**
 * ルート結果
 */
interface RouteResult {
  id: string;
  origin: SelectedPoint;
  destination: SelectedPoint;
  duration: number; // seconds
  distance: number; // meters
  durationText: string;
  distanceText: string;
  route: google.maps.DirectionsResult;
  travelMode: google.maps.TravelMode;
  createdAt: Date;
}

/**
 * 統合ルートストアの状態
 */
interface RouteState {
  // 検索UI
  searchPanel: {
    isOpen: boolean;
    origin: SelectedPoint | null;
    destination: SelectedPoint | null;
    selectionMode: "origin" | "destination" | null;
  };

  // ルート結果（Map形式で効率的に管理）
  routes: Map<string, RouteResult>;

  // 接続情報（RouteConnectionの配列）
  connections: RouteConnection[];

  // 地点選択状態
  placeSelection: {
    isSelecting: boolean;
    selectedPlaceId: string | null;
    selectedPlaces: string[];
    selectionMethod: "ctrl-click" | "long-press" | null;
  };

  // 検索パネルアクション
  openSearchPanel: () => void;
  closeSearchPanel: () => void;
  setSearchOrigin: (point: SelectedPoint | null) => void;
  setSearchDestination: (point: SelectedPoint | null) => void;
  setSelectionMode: (mode: "origin" | "destination" | null) => void;
  selectPointFromMap: (point: SelectedPoint) => void;

  // ルート管理アクション
  addRoute: (route: Omit<RouteResult, "id" | "createdAt">) => string;
  removeRoute: (id: string) => void;
  clearAllRoutes: () => void;
  getRoute: (id: string) => RouteResult | undefined;

  // 接続管理アクション
  addConnection: (
    connection: Omit<RouteConnection, "id" | "createdAt">,
  ) => void;
  removeConnection: (connectionId: string) => void;
  clearAllConnections: () => void;

  // 地点選択アクション
  startPlaceSelection: (
    placeId: string,
    method: "ctrl-click" | "long-press",
  ) => void;
  completePlaceSelection: (destinationPlaceId: string) => void;
  cancelPlaceSelection: () => void;
  isPlaceSelected: (placeId: string) => boolean;

  // ユーティリティ
  getRoutesByPlace: (placeId: string) => RouteResult[];
  getConnectionsByPlace: (placeId: string) => RouteConnection[];
}

/**
 * 統合ルートストア
 * routeSearchStoreとrouteConnectionsStoreの機能を統合
 */
export const useRouteStore = create<RouteState>((set, get) => ({
  // 初期状態
  searchPanel: {
    isOpen: false,
    origin: null,
    destination: null,
    selectionMode: null,
  },
  routes: new Map(),
  connections: [],
  placeSelection: {
    isSelecting: false,
    selectedPlaceId: null,
    selectedPlaces: [],
    selectionMethod: null,
  },

  // 検索パネルアクション
  openSearchPanel: () => {
    set((state) => ({
      searchPanel: { ...state.searchPanel, isOpen: true },
    }));
  },

  closeSearchPanel: () => {
    set((state) => ({
      searchPanel: {
        isOpen: false,
        origin: null,
        destination: null,
        selectionMode: null,
      },
    }));
  },

  setSearchOrigin: (point) => {
    set((state) => ({
      searchPanel: { ...state.searchPanel, origin: point },
    }));
  },

  setSearchDestination: (point) => {
    set((state) => ({
      searchPanel: { ...state.searchPanel, destination: point },
    }));
  },

  setSelectionMode: (mode) => {
    set((state) => ({
      searchPanel: { ...state.searchPanel, selectionMode: mode },
    }));
  },

  selectPointFromMap: (point) => {
    const state = get();
    const { selectionMode } = state.searchPanel;

    if (selectionMode === "origin") {
      set((s) => ({
        searchPanel: {
          ...s.searchPanel,
          origin: point,
          selectionMode: null,
        },
      }));
    } else if (selectionMode === "destination") {
      set((s) => ({
        searchPanel: {
          ...s.searchPanel,
          destination: point,
          selectionMode: null,
        },
      }));
    }
  },

  // ルート管理アクション
  addRoute: (route) => {
    const id = uuidv4();
    const newRoute: RouteResult = {
      ...route,
      id,
      createdAt: new Date(),
    };

    set((state) => {
      const newRoutes = new Map(state.routes);
      newRoutes.set(id, newRoute);
      return { routes: newRoutes };
    });

    return id;
  },

  removeRoute: (id) => {
    set((state) => {
      const newRoutes = new Map(state.routes);
      newRoutes.delete(id);
      return { routes: newRoutes };
    });
  },

  clearAllRoutes: () => {
    set({ routes: new Map() });
  },

  getRoute: (id) => {
    return get().routes.get(id);
  },

  // 接続管理アクション
  addConnection: (connection) => {
    const newConnection: RouteConnection = {
      ...connection,
      id: uuidv4(),
      createdAt: new Date(),
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
    }));
  },

  removeConnection: (connectionId) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
    }));
  },

  clearAllConnections: () => {
    set({ connections: [] });
  },

  // 地点選択アクション
  startPlaceSelection: (placeId, method) => {
    set({
      placeSelection: {
        isSelecting: true,
        selectedPlaceId: placeId,
        selectedPlaces: [placeId],
        selectionMethod: method,
      },
    });
  },

  completePlaceSelection: (destinationPlaceId) => {
    const state = get();
    const { selectedPlaceId } = state.placeSelection;

    if (!selectedPlaceId || selectedPlaceId === destinationPlaceId) {
      state.cancelPlaceSelection();
      return;
    }

    // 選択完了処理（実際のルート作成は別のサービスで行う）
    set((s) => ({
      placeSelection: {
        ...s.placeSelection,
        selectedPlaces: [
          ...s.placeSelection.selectedPlaces,
          destinationPlaceId,
        ],
      },
    }));

    // 選択状態をリセット
    state.cancelPlaceSelection();
  },

  cancelPlaceSelection: () => {
    set({
      placeSelection: {
        isSelecting: false,
        selectedPlaceId: null,
        selectedPlaces: [],
        selectionMethod: null,
      },
    });
  },

  isPlaceSelected: (placeId) => {
    return get().placeSelection.selectedPlaces.includes(placeId);
  },

  // ユーティリティ
  getRoutesByPlace: (placeId) => {
    const routes = Array.from(get().routes.values());
    return routes.filter(
      (route) =>
        // TODO: placeIdとルートの関連付けロジックを実装
        false,
    );
  },

  getConnectionsByPlace: (placeId) => {
    return get().connections.filter(
      (conn) => conn.originId === placeId || conn.destinationId === placeId,
    );
  },
}));
