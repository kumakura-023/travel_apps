import { TravelPlan, Place, Label } from "../types";

export type StoreEvent =
  | { type: "PLAN_LOADED"; planId: string; plan: TravelPlan }
  | { type: "PLAN_UPDATED"; planId: string; changes: Partial<TravelPlan> }
  | { type: "PLAN_DELETED"; planId: string }
  | { type: "PLACE_ADDED"; planId: string; place: Place }
  | {
      type: "PLACE_UPDATED";
      planId: string;
      placeId: string;
      changes: Partial<Place>;
    }
  | { type: "PLACE_DELETED"; planId: string; placeId: string }
  | { type: "LABEL_ADDED"; planId: string; label: Label }
  | {
      type: "LABEL_UPDATED";
      planId: string;
      labelId: string;
      changes: Partial<Label>;
    }
  | { type: "LABEL_DELETED"; planId: string; labelId: string };

export type StoreEventListener<T extends StoreEvent> = (event: T) => void;

export class EventBus<T extends StoreEvent> {
  private listeners = new Map<T["type"], Set<StoreEventListener<T>>>();

  on<E extends T>(
    type: E["type"],
    listener: StoreEventListener<E>,
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listenersSet = this.listeners.get(type)!;
    listenersSet.add(listener as StoreEventListener<T>);

    return () => {
      listenersSet.delete(listener as StoreEventListener<T>);
      if (listenersSet.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  emit(event: T): void {
    const listenersSet = this.listeners.get(event.type);
    if (listenersSet) {
      listenersSet.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  off(type: T["type"], listener: StoreEventListener<T>): void {
    const listenersSet = this.listeners.get(type);
    if (listenersSet) {
      listenersSet.delete(listener);
      if (listenersSet.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(type?: T["type"]): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }

    let total = 0;
    for (const listenersSet of this.listeners.values()) {
      total += listenersSet.size;
    }
    return total;
  }
}

export const storeEventBus = new EventBus<StoreEvent>();
