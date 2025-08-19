import { TravelPlan } from "../../types";

export type WatchCallback = (plan: TravelPlan) => void;

export class RealtimeWatcher {
  private watchers: Map<
    string,
    { unsubscribe: () => void; callback: WatchCallback }
  > = new Map();

  async watch(planId: string, callback: WatchCallback): Promise<() => void> {
    const { listenPlan } = await import("../planCloudService");

    const unsubscribe = listenPlan(planId, (updatedPlan) => {
      if (updatedPlan) {
        callback(updatedPlan);
      }
    });

    this.watchers.set(planId, { unsubscribe, callback });

    return () => this.stopWatching(planId);
  }

  stopWatching(planId: string): void {
    const watcher = this.watchers.get(planId);
    if (watcher) {
      watcher.unsubscribe();
      this.watchers.delete(planId);
    }
  }

  stopAll(): void {
    this.watchers.forEach((watcher) => watcher.unsubscribe());
    this.watchers.clear();
  }
}
