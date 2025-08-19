import { TravelPlan } from "../../types";
import { PlanService } from "../plan/PlanService";
import { getPlanCoordinator } from "../ServiceContainer";

export class PlanWatcher {
  private planService: PlanService;

  constructor() {
    const coordinator = getPlanCoordinator();
    this.planService = coordinator.getPlanService();
  }

  watch(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    try {
      return this.planService.listenToPlan(planId, callback);
    } catch (error) {
      console.error(
        "[PlanWatcher] Failed to start watching plan:",
        planId,
        error,
      );
      return () => {};
    }
  }
}
