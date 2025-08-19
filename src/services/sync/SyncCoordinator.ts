import { TravelPlan } from "../../types";
import { SaveService, SaveConfig } from "../save/SaveService";

export type SyncStrategy = "immediate" | "debounced" | "manual";

export interface SyncOptions {
  strategy?: SyncStrategy;
  debounceMs?: number;
  localOnly?: boolean;
}

export class SyncCoordinator {
  private saveService: SaveService;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(saveService?: SaveService) {
    this.saveService = saveService || new SaveService();
  }

  async scheduleSync(
    plan: TravelPlan,
    userId: string | null,
    options: SyncOptions = {},
  ): Promise<void> {
    const strategy = options.strategy || "debounced";
    const planId = plan.id;

    switch (strategy) {
      case "immediate":
        await this.executeSync(plan, userId, options);
        break;

      case "debounced": {
        this.cancelSync(planId);
        const timer = setTimeout(async () => {
          await this.executeSync(plan, userId, options);
          this.debounceTimers.delete(planId);
        }, options.debounceMs || 1000);
        this.debounceTimers.set(planId, timer);
        break;
      }

      case "manual":
        break;
    }
  }

  cancelSync(planId: string): void {
    const timer = this.debounceTimers.get(planId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(planId);
    }
  }

  private async executeSync(
    plan: TravelPlan,
    userId: string | null,
    options: SyncOptions,
  ): Promise<void> {
    const config: SaveConfig = {
      localOnly: options.localOnly || !userId,
      userId: userId || undefined,
    };

    await this.saveService.saveHybrid(plan, config);
  }

  cleanup(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
