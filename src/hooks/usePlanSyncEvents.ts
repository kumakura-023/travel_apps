import { useEffect } from "react";
import { useSavedPlacesStore } from "../store/savedPlacesStore";
import { useLabelsStore } from "../store/labelsStore";
import { usePlanStore } from "../store/planStore";
import { TravelPlan } from "../types";
import { syncDebugUtils } from "../utils/syncDebugUtils";

export function usePlanSyncEvents(
  plan: TravelPlan | null,
  saveImmediately: (plan: TravelPlan) => void,
  saveImmediatelyCloud: (plan: TravelPlan) => void,
  saveWithSyncManager?: (
    plan: TravelPlan,
    operationType?:
      | "place_added"
      | "place_deleted"
      | "place_updated"
      | "memo_updated"
      | "plan_updated"
      | "label_added"
      | "label_updated"
      | "label_deleted",
  ) => void,
) {
  useEffect(() => {
    const { setOnPlaceAdded } = useSavedPlacesStore.getState();
    setOnPlaceAdded((newPlace) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: [...currentPlan.places, newPlace],
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        // 新しい同期システムがある場合はそれを使用、なければ従来の方法
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, "place_added");
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "place_added",
        placeName: newPlace.name,
        placeId: newPlace.id,
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);

  useEffect(() => {
    const { setOnPlaceDeleted } = useSavedPlacesStore.getState();
    setOnPlaceDeleted((updatedPlaces) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          places: updatedPlaces,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        // 新しい同期システムがある場合はそれを使用、なければ従来の方法
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, "place_deleted");
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "place_deleted",
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);

  useEffect(() => {
    const { setOnLabelAdded } = useLabelsStore.getState();
    setOnLabelAdded((newLabel) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: [...currentPlan.labels, newLabel],
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        // 新しい同期システムがある場合はそれを使用、なければ従来の方法
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, "label_added");
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "label_added",
        labelText: newLabel.text,
        labelId: newLabel.id,
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);

  useEffect(() => {
    const { setOnLabelUpdated } = useLabelsStore.getState();
    setOnLabelUpdated((updatedLabel, updatedLabels) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: updatedLabels,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        // statusの条件を削除して、常に同期する
        // 新しい同期システムがある場合はそれを使用、なければ従来の方法
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, "label_updated");
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "label_updated",
        labelText: updatedLabel.text,
        labelId: updatedLabel.id,
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);

  useEffect(() => {
    const { setOnLabelDeleted } = useLabelsStore.getState();
    setOnLabelDeleted((updatedLabels) => {
      const currentPlan = usePlanStore.getState().plan;
      if (currentPlan) {
        const planToSave: TravelPlan = {
          ...currentPlan,
          labels: updatedLabels,
          updatedAt: new Date(),
        };
        usePlanStore.getState().setPlan(planToSave);
        // 新しい同期システムがある場合はそれを使用、なければ従来の方法
        if (saveWithSyncManager) {
          saveWithSyncManager(planToSave, "label_deleted");
        } else {
          saveImmediately(planToSave);
          saveImmediatelyCloud(planToSave);
        }
      }
      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "label_deleted",
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);

  // プラン更新イベントのリスナーを追加
  useEffect(() => {
    const { setOnPlanUpdated } = usePlanStore.getState();
    setOnPlanUpdated((updatedPlan) => {
      // 新しい同期システムがある場合はそれを使用、なければ従来の方法
      if (saveWithSyncManager) {
        saveWithSyncManager(updatedPlan, "plan_updated");
      } else {
        saveImmediately(updatedPlan);
        saveImmediatelyCloud(updatedPlan);
      }

      syncDebugUtils.log("save", {
        type: "immediate_sync",
        reason: "plan_updated",
        planName: updatedPlan.name,
        timestamp: Date.now(),
      });
    });
  }, [plan, saveImmediately, saveImmediatelyCloud, saveWithSyncManager]);
}
