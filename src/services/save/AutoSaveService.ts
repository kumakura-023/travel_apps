import { TravelPlan } from "../../types";
import { SyncCoordinator, SyncStrategy } from "../sync/SyncCoordinator";

export type SaveStrategy = "immediate" | "debounced" | "manual";

export interface AutoSaveOptions {
  strategy?: SaveStrategy;
  debounceMs?: number;
  localOnly?: boolean;
}

export class AutoSaveService {
  private syncCoordinator: SyncCoordinator;
  private strategy: SaveStrategy;
  private debounceMs: number;

  constructor(options: AutoSaveOptions = {}) {
    this.syncCoordinator = new SyncCoordinator();
    this.strategy = options.strategy || "debounced";
    this.debounceMs = options.debounceMs || 1000;
  }

  async save(
    plan: TravelPlan,
    userId: string | null,
    strategy?: SaveStrategy,
  ): Promise<void> {
    const saveStrategy = strategy || this.strategy;

    let syncStrategy: SyncStrategy;
    switch (saveStrategy) {
      case "immediate":
        syncStrategy = "immediate";
        break;
      case "debounced":
        syncStrategy = "debounced";
        break;
      case "manual":
        syncStrategy = "manual";
        break;
    }

    await this.syncCoordinator.scheduleSync(plan, userId, {
      strategy: syncStrategy,
      debounceMs: this.debounceMs,
    });
  }

  cleanup(): void {
    this.syncCoordinator.cleanup();
  }
}
