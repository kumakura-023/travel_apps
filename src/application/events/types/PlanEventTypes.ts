import type { TravelPlan, Place, Label } from "../../../types";

export interface PlanEvent<TPayload = Record<string, unknown>> {
  readonly type: string;
  readonly payload: TPayload;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface PlanEventPayloads {
  readonly [eventType: string]: Record<string, unknown>;
}

// ========== Concrete Event Types ==========

export interface PlanLoadedPayload {
  readonly planId: string;
  readonly plan: TravelPlan;
  readonly places: Place[];
  readonly labels: Label[];
}

export interface PlanSwitchedPayload {
  readonly previousPlanId: string | null;
  readonly newPlanId: string;
  readonly plan: TravelPlan;
}

export interface PlanCreatedPayload {
  readonly planId: string;
  readonly plan: TravelPlan;
  readonly createdBy: string;
}

export interface PlanDeletedPayload {
  readonly planId: string;
  readonly deletedBy: string;
  readonly nextPlanId: string | null;
}

export interface PlanSyncFailedPayload {
  readonly action: string;
  readonly reason: string;
  readonly planId?: string;
  readonly error?: unknown;
}

export interface PlanSessionEndedPayload {
  readonly userId: string;
  readonly lastPlanId: string | null;
}

// Event type literals
export type PlanEventType =
  | "plan/loaded"
  | "plan/switched"
  | "plan/created"
  | "plan/deleted"
  | "plan/syncFailed"
  | "plan/sessionEnded";

// Typed event factories
export type PlanLoadedEvent = PlanEvent<PlanLoadedPayload> & {
  type: "plan/loaded";
};
export type PlanSwitchedEvent = PlanEvent<PlanSwitchedPayload> & {
  type: "plan/switched";
};
export type PlanCreatedEvent = PlanEvent<PlanCreatedPayload> & {
  type: "plan/created";
};
export type PlanDeletedEvent = PlanEvent<PlanDeletedPayload> & {
  type: "plan/deleted";
};
export type PlanSyncFailedEvent = PlanEvent<PlanSyncFailedPayload> & {
  type: "plan/syncFailed";
};
export type PlanSessionEndedEvent = PlanEvent<PlanSessionEndedPayload> & {
  type: "plan/sessionEnded";
};

// Union type for all plan events
export type TypedPlanEvent =
  | PlanLoadedEvent
  | PlanSwitchedEvent
  | PlanCreatedEvent
  | PlanDeletedEvent
  | PlanSyncFailedEvent
  | PlanSessionEndedEvent;

// Payload type map for factory
type PayloadForType<T extends PlanEventType> = T extends "plan/loaded"
  ? PlanLoadedPayload
  : T extends "plan/switched"
    ? PlanSwitchedPayload
    : T extends "plan/created"
      ? PlanCreatedPayload
      : T extends "plan/deleted"
        ? PlanDeletedPayload
        : T extends "plan/syncFailed"
          ? PlanSyncFailedPayload
          : T extends "plan/sessionEnded"
            ? PlanSessionEndedPayload
            : never;

// Event factory helpers
export const createPlanEvent = <T extends PlanEventType>(
  type: T,
  payload: PayloadForType<T>,
  metadata?: Record<string, unknown>,
): PlanEvent<PayloadForType<T>> => ({
  type,
  payload,
  timestamp: new Date(),
  metadata,
});
