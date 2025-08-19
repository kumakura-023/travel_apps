import { create } from "zustand";
import { TravelCircle, TravelMode, LatLng } from "../types/travelTime";
import { v4 as uuidv4 } from "uuid";

interface TravelTimeModeState {
  // 起点選択モードか
  selectingOrigin: boolean;
  // 現在選択中の移動手段
  mode: TravelMode;
  // 時間 (分)
  minutes: number;
  // 描画済みの円
  circles: TravelCircle[];
  // 削除ボタンを表示する対象の id
  activeCircleId: string | null;
  // --- actions ---
  startSelecting: () => void;
  cancelSelecting: () => void;
  addCircle: (center: LatLng) => void;
  removeCircle: (id: string) => void;
  setMode: (mode: TravelMode) => void;
  setMinutes: (m: number) => void;
  setActiveCircle: (id: string | null) => void;
  clearAll: () => void;
}

const MAX_CIRCLES = 5;

export const useTravelTimeMode = create<TravelTimeModeState>((set, get) => ({
  selectingOrigin: false,
  mode: "walking",
  minutes: 15,
  circles: [],
  activeCircleId: null,
  startSelecting: () => set({ selectingOrigin: true, activeCircleId: null }),
  cancelSelecting: () => set({ selectingOrigin: false }),
  addCircle: (center) => {
    const { circles, mode, minutes } = get();
    const next: TravelCircle = {
      id: uuidv4(),
      center,
      mode,
      minutes,
    };
    const updated = [...circles, next].slice(-MAX_CIRCLES);
    set({ circles: updated, selectingOrigin: false, activeCircleId: next.id });
  },
  removeCircle: (id) => {
    console.log(`removeCircle called: ${id}`);
    set((s) => {
      const filteredCircles = s.circles.filter((c) => c.id !== id);
      console.log(`Circles: ${s.circles.length} -> ${filteredCircles.length}`);

      // 削除対象がactiveCircleIdだった場合はクリア
      const newActiveCircleId =
        s.activeCircleId === id ? null : s.activeCircleId;

      return {
        circles: filteredCircles,
        activeCircleId: newActiveCircleId,
      };
    });

    // 削除後の状態を確認
    setTimeout(() => {
      const state = get();
      console.log(`After removal - total circles: ${state.circles.length}`);
    }, 100);
  },
  setMode: (mode) => set({ mode }),
  setMinutes: (minutes) => set({ minutes }),
  setActiveCircle: (id) => set({ activeCircleId: id }),
  clearAll: () => {
    console.log("clearAll called");
    const currentState = get();
    console.log(`Clearing ${currentState.circles.length} circles`);

    set({
      circles: [],
      activeCircleId: null,
      selectingOrigin: false,
    });

    // クリア後の確認
    setTimeout(() => {
      const state = get();
      console.log(`After clearAll - circles: ${state.circles.length}`);
    }, 100);
  },
}));
