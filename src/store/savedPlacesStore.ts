import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Place } from "../types";
import { syncDebugUtils } from "../utils/syncDebugUtils";
import { usePlanStore } from "./planStore";
import { getPlanCoordinator, getEventBus } from "../services/ServiceContainer";
import { useAuthStore } from "../hooks/useAuth";
import { PlaceEventBus } from "../events/PlaceEvents";

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

export const useSavedPlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  get filteredPlaces() {
    return get().places.filter((p) => !p.deleted);
  },
  onPlaceAdded: undefined,
  onPlaceDeleted: undefined,
  setOnPlaceAdded: (callback) => set({ onPlaceAdded: callback }),
  setOnPlaceDeleted: (callback) => set({ onPlaceDeleted: callback }),
  addPlace: (partial) =>
    set((state) => {
      if (!partial.coordinates) {
        throw new Error("Coordinates are required for adding a place");
      }

      // 現在のユーザー情報を取得
      const { user: currentUser } = useAuthStore.getState();

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
        // 追加者情報を設定
        addedBy: currentUser
          ? {
              uid: currentUser.uid,
              displayName:
                currentUser.displayName || currentUser.email || "ユーザー",
            }
          : undefined,
      } as Place;

      const newState = {
        places: [...state.places, newPlace],
      };

      // 即座同期コールバックを実行（互換性のため維持）
      if (state.onPlaceAdded) {
        state.onPlaceAdded(newPlace);
      }

      // イベントを発火
      const eventBus = getEventBus();
      const placeEventBus = new PlaceEventBus(eventBus);
      placeEventBus.emitPlaceAdded(newPlace, "user");

      // ローカルストレージへの保存は無効化（プラン共有位置のみを使用）
      // saveLastActionPosition(newPlace.coordinates);

      // Firestoreに最後の操作位置を保存（新アーキテクチャ対応）
      const { plan } = usePlanStore.getState();
      const { user } = useAuthStore.getState();

      if (plan && user) {
        console.log(
          "[placesStore] Saving last action position for new place:",
          {
            placeId: newPlace.id,
            placeName: newPlace.name,
            coordinates: newPlace.coordinates,
          },
        );

        try {
          const planCoordinator = getPlanCoordinator();
          const planService = planCoordinator.getPlanService();

          planService
            .updateLastActionPosition(
              plan.id,
              newPlace.coordinates,
              user.uid,
              "place",
            )
            .then(() => {
              console.log(
                "[placesStore] Last action position saved successfully",
              );
            })
            .catch((error) => {
              console.error(
                "[placesStore] Failed to update last action position:",
                error,
              );
            });
        } catch (error) {
          console.error("[placesStore] Failed to get PlanService:", error);
        }
      }

      // 通知の作成はPlanCoordinatorで一元管理するため、ここでは作成しない
      // （重複を防ぐため、Firestore同期時にのみ通知を作成）
      if (plan && user && newPlace.addedBy?.uid) {
        console.log(
          "[通知デバッグ] 場所が追加されました。通知はPlanCoordinatorで作成されます:",
          {
            planId: plan.id,
            userId: user.uid,
            placeId: newPlace.id,
            placeName: newPlace.name,
            addedBy: newPlace.addedBy,
          },
        );
      }

      return newState;
    }),
  updatePlace: (id, update) =>
    set((state) => {
      const previousPlace = state.places.find((p) => p.id === id);
      if (!previousPlace) {
        return { places: state.places };
      }

      const updatedPlace = {
        ...previousPlace,
        ...update,
        updatedAt: new Date(),
      };
      const newPlaces = state.places.map((p) =>
        p.id === id ? updatedPlace : p,
      );

      // イベントを発火
      const eventBus = getEventBus();
      const placeEventBus = new PlaceEventBus(eventBus);
      placeEventBus.emitPlaceUpdated(id, updatedPlace, update, previousPlace);

      return { places: newPlaces };
    }),
  deletePlace: (id) => {
    if (import.meta.env.DEV) {
      console.log(`deletePlace called: ${id}`);
    }
    set((state) => {
      const placeToDelete = state.places.find((p) => p.id === id);
      if (placeToDelete) {
        if (import.meta.env.DEV) {
          console.log(`Deleting place: ${placeToDelete.name} (${id})`);
        }
        // 削除フラグを立ててタイムスタンプを更新
        const updatedPlace = {
          ...placeToDelete,
          deleted: true,
          updatedAt: new Date(),
        };
        if (import.meta.env.DEV) {
          console.log(
            `Updated timestamp before deletion: ${updatedPlace.updatedAt.toISOString()}`,
          );
        }

        // デバッグログを記録
        syncDebugUtils.log("delete", {
          type: "place",
          id: placeToDelete.id,
          name: placeToDelete.name,
          timestamp: updatedPlace.updatedAt.getTime(),
          totalPlacesBefore: state.places.length,
          totalPlacesAfter: state.places.length - 1,
        });

        const updatedPlaces = state.places.map((p) =>
          p.id === id ? updatedPlace : p,
        );

        // 削除コールバックを実行（互換性のため維持）
        if (state.onPlaceDeleted) {
          state.onPlaceDeleted(updatedPlaces);
        }

        // イベントを発火
        const eventBus = getEventBus();
        const placeEventBus = new PlaceEventBus(eventBus);
        placeEventBus.emitPlaceDeleted(id, updatedPlace, updatedPlaces);

        if (import.meta.env.DEV) {
          console.log(
            `Places: ${state.places.length} -> ${updatedPlaces.length}`,
          );
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
  getFilteredPlaces: () => get().places.filter((p) => !p.deleted),
}));
