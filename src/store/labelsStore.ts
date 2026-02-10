import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { MapLabel, Label } from "../types";
import { syncDebugUtils } from "../utils/syncDebugUtils";
import { usePlanStore } from "./planStore";
import { getPlanCoordinator } from "../services/ServiceContainer";
import { useAuthStore } from "../hooks/useAuth";
import { storeEventBus } from "../events/StoreEvents";

interface LabelsState {
  // 新しいイベント駆動型のAPI
  labelsByPlan: Map<string, Map<string, Label>>;
  selectedLabelId: string | null;

  // 計算プロパティ
  getLabelsForPlan: (planId: string) => Label[];
  getLabelById: (planId: string, labelId: string) => Label | undefined;
  selectLabel: (labelId: string | null) => void;

  // 互換性のための非推奨API
  labels: MapLabel[];
  onLabelAdded?: (label: MapLabel) => void;
  onLabelUpdated?: (updatedLabel: MapLabel, allLabels: MapLabel[]) => void;
  onLabelDeleted?: (updatedLabels: MapLabel[]) => void;
  setOnLabelAdded: (callback: (label: MapLabel) => void) => void;
  setOnLabelUpdated: (
    callback: (updatedLabel: MapLabel, allLabels: MapLabel[]) => void,
  ) => void;
  setOnLabelDeleted: (callback: (updatedLabels: MapLabel[]) => void) => void;
  addLabel: (partial: Partial<MapLabel>) => void;
  updateLabel: (
    id: string,
    update: Partial<MapLabel>,
    localOnly?: boolean,
  ) => void;
  deleteLabel: (id: string) => void;
  clearLabels: () => void;
}

export const useLabelsStore = create<LabelsState>((set, get) => {
  // イベントリスナーの設定
  const unsubscribePlanLoaded = storeEventBus.on("PLAN_LOADED", (event) => {
    if (event.type === "PLAN_LOADED") {
      const labelsMap = new Map<string, Label>();
      event.plan.labels?.forEach((label) => {
        labelsMap.set(label.id, label);
      });

      set((state) => ({
        labelsByPlan: new Map(state.labelsByPlan.set(event.planId, labelsMap)),
        labels: (event.plan.labels as MapLabel[]) || [], // 互換性のため
      }));
    }
  });

  const unsubscribeLabelAdded = storeEventBus.on("LABEL_ADDED", (event) => {
    if (event.type === "LABEL_ADDED") {
      set((state) => {
        const planLabels = state.labelsByPlan.get(event.planId) || new Map();
        const updatedLabels = new Map(
          planLabels.set(event.label.id, event.label),
        );
        const updatedPlans = new Map(
          state.labelsByPlan.set(event.planId, updatedLabels),
        );

        return {
          labelsByPlan: updatedPlans,
          labels: [...state.labels, event.label as MapLabel], // 互換性のため
        };
      });
    }
  });

  const unsubscribeLabelUpdated = storeEventBus.on("LABEL_UPDATED", (event) => {
    if (event.type === "LABEL_UPDATED") {
      set((state) => {
        const planLabels = state.labelsByPlan.get(event.planId);
        if (planLabels && planLabels.has(event.labelId)) {
          const currentLabel = planLabels.get(event.labelId)!;
          const updatedLabel = { ...currentLabel, ...event.changes };
          const updatedLabels = new Map(
            planLabels.set(event.labelId, updatedLabel),
          );
          const updatedPlans = new Map(
            state.labelsByPlan.set(event.planId, updatedLabels),
          );

          return {
            labelsByPlan: updatedPlans,
            labels: state.labels.map((l) =>
              l.id === event.labelId ? { ...l, ...event.changes } : l,
            ), // 互換性のため
          };
        }
        return state;
      });
    }
  });

  const unsubscribeLabelDeleted = storeEventBus.on("LABEL_DELETED", (event) => {
    if (event.type === "LABEL_DELETED") {
      set((state) => {
        const planLabels = state.labelsByPlan.get(event.planId);
        if (planLabels && planLabels.has(event.labelId)) {
          const updatedLabels = new Map(planLabels);
          updatedLabels.delete(event.labelId);
          const updatedPlans = new Map(
            state.labelsByPlan.set(event.planId, updatedLabels),
          );

          // 削除されたラベルが選択されていた場合、選択を解除
          const newSelectedLabelId =
            state.selectedLabelId === event.labelId
              ? null
              : state.selectedLabelId;

          return {
            labelsByPlan: updatedPlans,
            selectedLabelId: newSelectedLabelId,
            labels: state.labels.filter((l) => l.id !== event.labelId), // 互換性のため
          };
        }
        return state;
      });
    }
  });

  return {
    // 新しいAPI
    labelsByPlan: new Map(),
    selectedLabelId: null,

    getLabelsForPlan: (planId: string) => {
      const planLabels = get().labelsByPlan.get(planId) || new Map();
      return Array.from(planLabels.values()).filter((l) => !l.deleted);
    },

    getLabelById: (planId: string, labelId: string) => {
      const planLabels = get().labelsByPlan.get(planId);
      return planLabels?.get(labelId);
    },

    selectLabel: (labelId: string | null) => set({ selectedLabelId: labelId }),

    // 互換性のための非推奨API
    labels: [],
    onLabelAdded: undefined,
    onLabelUpdated: undefined,
    onLabelDeleted: undefined,
    setOnLabelAdded: (callback) => set({ onLabelAdded: callback }),
    setOnLabelUpdated: (callback) => set({ onLabelUpdated: callback }),
    setOnLabelDeleted: (callback) => set({ onLabelDeleted: callback }),
    addLabel: (partial) => {
      console.warn("[labelsStore] addLabel is deprecated. Use events instead.");
      set((s) => {
        const newLabel = {
          width: 120,
          height: 40,
          color: "#000000",
          fontSize: 14,
          fontFamily: "sans-serif",
          status: "new",
          ...partial,
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as MapLabel;

        const newState = {
          labels: [...s.labels, newLabel],
        };

        if (s.onLabelAdded) {
          s.onLabelAdded(newLabel);
        }

        if (newLabel.position) {
          const { plan } = usePlanStore.getState();
          const { user } = useAuthStore.getState();

          if (plan && user) {
            console.log(
              "[labelsStore] Saving last action position for new label:",
              {
                labelId: newLabel.id,
                text: newLabel.text,
                position: newLabel.position,
              },
            );

            try {
              const planCoordinator = getPlanCoordinator();
              const planService = planCoordinator.getPlanService();

              planService
                .updateLastActionPosition(
                  plan.id,
                  newLabel.position,
                  user.uid,
                  "label",
                )
                .then(() => {
                  console.log(
                    "[labelsStore] Last action position saved successfully",
                  );
                })
                .catch((error) => {
                  console.error(
                    "[labelsStore] Failed to update last action position:",
                    error,
                  );
                });
            } catch (error) {
              console.error("[labelsStore] Failed to get PlanService:", error);
            }
          }
        }

        return newState;
      });
    },

    updateLabel: (id, update, localOnly = false) => {
      if (!localOnly) {
        console.warn(
          "[labelsStore] updateLabel is deprecated. Use events instead.",
        );
      }
      set((s) => {
        const updatedLabels = s.labels.map((l) => {
          if (l.id === id) {
            return { ...l, ...update, updatedAt: new Date() };
          }
          return l;
        });
        const updatedLabel = updatedLabels.find((l) => l.id === id);

        if (!localOnly && s.onLabelUpdated && updatedLabel) {
          s.onLabelUpdated(updatedLabel, updatedLabels);
        }

        if (!localOnly && updatedLabel?.position) {
          const { plan } = usePlanStore.getState();
          const { user } = useAuthStore.getState();

          if (plan && user) {
            try {
              const planCoordinator = getPlanCoordinator();
              const planService = planCoordinator.getPlanService();

              planService
                .updateLastActionPosition(
                  plan.id,
                  updatedLabel.position,
                  user.uid,
                  "label",
                )
                .catch((error) => {
                  console.error(
                    "[labelsStore] Failed to update last action position on label edit:",
                    error,
                  );
                });
            } catch (error) {
              console.error("[labelsStore] Failed to get PlanService:", error);
            }
          }
        }

        return { labels: updatedLabels };
      });
    },

    deleteLabel: (id) => {
      console.warn(
        "[labelsStore] deleteLabel is deprecated. Use events instead.",
      );
      if (import.meta.env.DEV) {
        console.log(`deleteLabel called: ${id}`);
      }
      set((s) => {
        const labelToDelete = s.labels.find((l) => l.id === id);
        if (!labelToDelete) return { labels: s.labels };

        const filteredLabels = s.labels.filter((l) => l.id !== id);

        if (import.meta.env.DEV) {
          console.log(`Deleting label: ${labelToDelete.text} (${id})`);
          syncDebugUtils.log("delete", {
            type: "label",
            id: labelToDelete.id,
            text: labelToDelete.text,
            timestamp: new Date().getTime(),
            totalLabelsBefore: s.labels.length,
            totalLabelsAfter: filteredLabels.length,
          });
        }

        if (s.onLabelDeleted) {
          s.onLabelDeleted(filteredLabels);
        }

        if (import.meta.env.DEV) {
          console.log(`Labels: ${s.labels.length} -> ${filteredLabels.length}`);
        }
        return { labels: filteredLabels };
      });
    },

    clearLabels: () => {
      console.warn(
        "[labelsStore] clearLabels is deprecated. Use events instead.",
      );
      set({ labels: [] });
    },
  };
});
