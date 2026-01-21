import type { RouteEvent } from "./types/RouteEventTypes";
import type { EventBus } from "../../events/EventBus";

export interface RouteEventPublisher {
  publish(events: RouteEvent[]): Promise<void>;
}

export class RouteEventPublisherAdapter implements RouteEventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async publish(events: RouteEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventBus.emit(`route.${event.type}`, event);
      } catch (error) {
        console.error("[RouteEventPublisherAdapter] Failed to publish event", {
          event,
          error,
        });
      }
    }
  }
}
