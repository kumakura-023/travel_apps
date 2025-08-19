import { create } from "zustand";

export type TravelMode = "WALKING" | "DRIVING" | "TRANSIT";

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface TravelTimeState {
  /** Travel-time feature is enabled when Travel Time tab is active */
  enabled: boolean;
  /** Currently selected origin (center point) */
  origin: LatLngLiteral | null;
  /** Whether the UI is waiting for a map click to set origin */
  selectingOrigin: boolean;
  /** Selected travel mode */
  mode: TravelMode;
  /** Time range in minutes (5-60) */
  timeRange: number;
  /** Helper to toggle two-point route selection (Ctrl+Click / Long-press). */
  routePoints: LatLngLiteral[];
  setEnabled: (enabled: boolean) => void;
  setOrigin: (origin: LatLngLiteral | null) => void;
  setSelectingOrigin: (selecting: boolean) => void;
  setMode: (mode: TravelMode) => void;
  setTimeRange: (minutes: number) => void;
  addRoutePoint: (p: LatLngLiteral) => void;
  clearRoutePoints: () => void;
  /** Clear all travel time data (origin, routes, etc) */
  clearAll: () => void;
}

export const useTravelTimeStore = create<TravelTimeState>((set) => ({
  enabled: false,
  origin: null,
  selectingOrigin: false,
  mode: "WALKING",
  timeRange: 15,
  routePoints: [],
  setEnabled: (enabled) =>
    set((state) => {
      // タブから移動時間以外に切り替わった時、すべてクリアする
      if (!enabled && state.enabled) {
        return {
          enabled,
          origin: null,
          selectingOrigin: false,
          routePoints: [],
        };
      }
      return { enabled };
    }),
  setOrigin: (origin) => set({ origin }),
  setSelectingOrigin: (selectingOrigin) => set({ selectingOrigin }),
  setMode: (mode) => set({ mode }),
  setTimeRange: (timeRange) => set({ timeRange }),
  addRoutePoint: (p) =>
    set((s) => {
      const next = [...s.routePoints, p].slice(-2); // keep last 2
      return { routePoints: next };
    }),
  clearRoutePoints: () => set({ routePoints: [] }),
  clearAll: () =>
    set({
      origin: null,
      selectingOrigin: false,
      routePoints: [],
    }),
}));
