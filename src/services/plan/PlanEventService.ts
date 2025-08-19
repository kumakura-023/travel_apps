import { EventBus, StoreEvent } from "../../events/StoreEvents";
import { TravelPlan, Place, Label } from "../../types";

export class PlanEventService {
  constructor(private eventBus: EventBus<StoreEvent>) {}

  planLoaded(plan: TravelPlan): void {
    this.eventBus.emit({
      type: "PLAN_LOADED",
      planId: plan.id,
      plan,
    });
  }

  planUpdated(planId: string, changes: Partial<TravelPlan>): void {
    this.eventBus.emit({
      type: "PLAN_UPDATED",
      planId,
      changes,
    });
  }

  planDeleted(planId: string): void {
    this.eventBus.emit({
      type: "PLAN_DELETED",
      planId,
    });
  }

  placeAdded(planId: string, place: Place): void {
    this.eventBus.emit({
      type: "PLACE_ADDED",
      planId,
      place,
    });
  }

  placeUpdated(planId: string, placeId: string, changes: Partial<Place>): void {
    this.eventBus.emit({
      type: "PLACE_UPDATED",
      planId,
      placeId,
      changes,
    });
  }

  placeDeleted(planId: string, placeId: string): void {
    this.eventBus.emit({
      type: "PLACE_DELETED",
      planId,
      placeId,
    });
  }

  labelAdded(planId: string, label: Label): void {
    this.eventBus.emit({
      type: "LABEL_ADDED",
      planId,
      label,
    });
  }

  labelUpdated(planId: string, labelId: string, changes: Partial<Label>): void {
    this.eventBus.emit({
      type: "LABEL_UPDATED",
      planId,
      labelId,
      changes,
    });
  }

  labelDeleted(planId: string, labelId: string): void {
    this.eventBus.emit({
      type: "LABEL_DELETED",
      planId,
      labelId,
    });
  }
}
