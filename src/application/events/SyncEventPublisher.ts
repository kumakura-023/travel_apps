import type { SyncEvent } from "./types/SyncEventTypes";
import type { EventBus } from "../../events/EventBus";

export interface SyncEventPublisher {
  publish(events: SyncEvent[]): Promise<void>;
}

export class SyncEventPublisherAdapter implements SyncEventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async publish(events: SyncEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventBus.emit(`sync.${event.type}`, event);
      } catch (error) {
        console.error("[SyncEventPublisherAdapter] Failed to publish event", {
          event,
          error,
        });
      }
    }
  }
}
