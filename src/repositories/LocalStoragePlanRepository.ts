import { IPlanRepository } from "./interfaces/IPlanRepository";
import { TravelPlan } from "../types";

export class LocalStoragePlanRepository implements IPlanRepository {
  private readonly PLAN_PREFIX = "travel-app-plan-";

  async savePlan(plan: TravelPlan): Promise<void> {
    const key = this.getPlanKey(plan.id);
    const data = JSON.stringify(plan, null, 2);
    localStorage.setItem(key, data);
  }

  async loadPlan(planId: string): Promise<TravelPlan | null> {
    const key = this.getPlanKey(planId);
    const data = localStorage.getItem(key);

    if (!data) return null;

    try {
      return this.parseJSON(data) as TravelPlan;
    } catch (error) {
      console.error("Failed to parse plan from localStorage:", error);
      return null;
    }
  }

  async deletePlan(planId: string): Promise<void> {
    const key = this.getPlanKey(planId);
    localStorage.removeItem(key);
  }

  async getAllPlans(): Promise<TravelPlan[]> {
    const plans: TravelPlan[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PLAN_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const plan = this.parseJSON(data) as TravelPlan;
            plans.push(plan);
          } catch (error) {
            console.error("Failed to parse plan:", error);
          }
        }
      }
    }

    return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    this.loadPlan(planId).then(callback);

    return () => {};
  }

  async updatePlan(planId: string, update: Partial<TravelPlan>): Promise<void> {
    const currentPlan = await this.loadPlan(planId);

    if (!currentPlan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const updatedPlan = {
      ...currentPlan,
      ...update,
      updatedAt: new Date(),
    };

    await this.savePlan(updatedPlan);
    console.log("[LocalStoragePlanRepository] Plan updated:", planId);
  }

  private getPlanKey(planId: string): string {
    return `${this.PLAN_PREFIX}${planId}`;
  }

  private parseJSON(json: string): TravelPlan {
    return JSON.parse(json, (key, value) => {
      if (
        typeof value === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(value)
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return value;
    });
  }
}
