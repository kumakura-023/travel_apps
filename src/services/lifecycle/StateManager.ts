import { TravelPlan } from "../../types";
import { PlanLifecycleContext } from "../../types/PlanLifecycle";
import { usePlanStore } from "../../store/planStore";
import { useSavedPlacesStore } from "../../store/savedPlacesStore";
import { useLabelsStore } from "../../store/labelsStore";

export class StateManager {
  constructor(
    private onStateChange?: (context: PlanLifecycleContext) => void,
  ) {}

  setPlan(plan: TravelPlan): void {
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().setLoading(false);
    usePlanStore.getState().setError(null);

    useSavedPlacesStore.setState({ places: plan.places || [] });
    useLabelsStore.setState({ labels: plan.labels || [] });
  }

  updatePlan(plan: TravelPlan): void {
    const currentPlan = usePlanStore.getState().plan;
    const currentPlaces = useSavedPlacesStore.getState().places;
    const currentLabels = useLabelsStore.getState().labels;
    const newPlaces = plan.places || [];
    const newLabels = plan.labels || [];

    // プランが実際に変更された場合のみ更新（PlanCoordinatorの最適化ロジックを継承）
    if (
      !currentPlan ||
      currentPlan.id !== plan.id ||
      JSON.stringify(currentPlan) !== JSON.stringify(plan)
    ) {
      usePlanStore.getState().setPlan(plan);
      usePlanStore.getState().setLoading(false);
      usePlanStore.getState().setError(null);
    }

    // 場所が実際に変更された場合のみ更新
    if (JSON.stringify(currentPlaces) !== JSON.stringify(newPlaces)) {
      useSavedPlacesStore.setState({ places: newPlaces });
    }

    // ラベルが実際に変更された場合のみ更新
    if (JSON.stringify(currentLabels) !== JSON.stringify(newLabels)) {
      useLabelsStore.setState({ labels: newLabels });
    }
  }

  setEmptyState(): void {
    usePlanStore.getState().clearPlan();
    useSavedPlacesStore.setState({ places: [] });
    useLabelsStore.setState({ labels: [] });
  }

  setErrorState(error: Error): void {
    usePlanStore.getState().setPlan(null);
    usePlanStore.getState().setLoading(false);
    usePlanStore.getState().setError(error.message);
  }

  setLoadingState(): void {
    usePlanStore.getState().setLoading(true);
  }

  notifyStateChange(context: PlanLifecycleContext): void {
    if (this.onStateChange) {
      this.onStateChange(context);
    }
  }
}
