import type { PlanEvent } from "./types/PlanEventTypes";
import type { PlanEventPublisher as PlanEventPublisherPort } from "./types/PlanEventPublisher";
import type { EventBus } from "../../events/EventBus";

export class PlanEventPublisherAdapter
  implements PlanEventPublisherPort
{
  constructor(private readonly eventBus: EventBus) {}

  async publish(events: PlanEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventBus.emit(`plan.${event.type}`, event);
      } catch (error) {
        console.error("[PlanEventPublisherAdapter] Failed to publish event", {
          event,
          error,
        });
      }
    }
  }
}
