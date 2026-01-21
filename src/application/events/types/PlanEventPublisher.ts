import { PlanEvent } from "./PlanEventTypes";

export interface PlanEventPublisher {
  publish(events: PlanEvent[]): Promise<void>;
}
