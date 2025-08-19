import { TravelPlan } from "../../types";
import { loadPlanFromUrl } from "../../utils/shareUtils";
import {
  loadActivePlanHybrid,
  getActivePlan,
  loadPlan,
} from "../storageService";
import { usePlanListStore } from "../../store/planListStore";

export class PlanLoader {
  async loadFromUrl(): Promise<TravelPlan | null> {
    try {
      return loadPlanFromUrl();
    } catch (error) {
      console.error("[PlanLoader] Failed to load plan from URL:", error);
      return null;
    }
  }

  async loadActivePlan(userId: string): Promise<TravelPlan | null> {
    try {
      let plan: TravelPlan | null = null;

      if (navigator.onLine) {
        plan = await loadActivePlanHybrid({ mode: "cloud", uid: userId });
      }

      if (!plan) {
        plan = getActivePlan();
      }

      return plan;
    } catch (error) {
      console.error("[PlanLoader] Failed to load active plan:", error);
      return null;
    }
  }

  async loadFirstAvailablePlan(userId: string): Promise<TravelPlan | null> {
    try {
      const { plans } = usePlanListStore.getState();

      if (plans.length === 0) {
        return null;
      }

      const firstPlan = plans[0];
      return loadPlan(firstPlan.id);
    } catch (error) {
      console.error("[PlanLoader] Failed to load first available plan:", error);
      return null;
    }
  }

  async loadPlan(planId: string, userId: string): Promise<TravelPlan | null> {
    try {
      return loadPlan(planId);
    } catch (error) {
      console.error("[PlanLoader] Failed to load plan:", planId, error);
      return null;
    }
  }
}
