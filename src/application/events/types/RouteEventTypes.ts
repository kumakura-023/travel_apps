import type { Place } from "../../../types";

export interface RouteEvent<TPayload = Record<string, unknown>> {
  readonly type: string;
  readonly payload: TPayload;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface RouteEventPayloads {
  readonly [eventType: string]: Record<string, unknown>;
}

// ========== Concrete Event Types ==========

export interface RouteCalculatedPayload {
  readonly routeId: string;
  readonly origin: {
    readonly placeId: string;
    readonly name: string;
    readonly lat: number;
    readonly lng: number;
  };
  readonly destination: {
    readonly placeId: string;
    readonly name: string;
    readonly lat: number;
    readonly lng: number;
  };
  readonly travelMode: google.maps.TravelMode | string;
  readonly durationSeconds: number;
  readonly distanceMeters: number;
  readonly polyline?: string;
}

export interface RouteRemovedPayload {
  readonly routeId: string;
  readonly removedBy: "user" | "system";
}

export interface RouteConnectionAddedPayload {
  readonly connectionId: string;
  readonly fromPlaceId: string;
  readonly toPlaceId: string;
  readonly travelMode: google.maps.TravelMode | string;
}

export interface RouteConnectionRemovedPayload {
  readonly connectionId: string;
  readonly fromPlaceId: string;
  readonly toPlaceId: string;
}

export interface RouteClearedPayload {
  readonly clearedBy: "user" | "plan-switch" | "system";
  readonly routeCount: number;
}

// Event type literals
export type RouteEventType =
  | "route/calculated"
  | "route/removed"
  | "route/connectionAdded"
  | "route/connectionRemoved"
  | "route/cleared";

// Typed event factories
export type RouteCalculatedEvent = RouteEvent<RouteCalculatedPayload> & {
  type: "route/calculated";
};
export type RouteRemovedEvent = RouteEvent<RouteRemovedPayload> & {
  type: "route/removed";
};
export type RouteConnectionAddedEvent =
  RouteEvent<RouteConnectionAddedPayload> & {
    type: "route/connectionAdded";
  };
export type RouteConnectionRemovedEvent =
  RouteEvent<RouteConnectionRemovedPayload> & {
    type: "route/connectionRemoved";
  };
export type RouteClearedEvent = RouteEvent<RouteClearedPayload> & {
  type: "route/cleared";
};

// Union type for all route events
export type TypedRouteEvent =
  | RouteCalculatedEvent
  | RouteRemovedEvent
  | RouteConnectionAddedEvent
  | RouteConnectionRemovedEvent
  | RouteClearedEvent;

// Payload type map for factory
type PayloadForType<T extends RouteEventType> = T extends "route/calculated"
  ? RouteCalculatedPayload
  : T extends "route/removed"
    ? RouteRemovedPayload
    : T extends "route/connectionAdded"
      ? RouteConnectionAddedPayload
      : T extends "route/connectionRemoved"
        ? RouteConnectionRemovedPayload
        : T extends "route/cleared"
          ? RouteClearedPayload
          : never;

// Event factory helpers
export const createRouteEvent = <T extends RouteEventType>(
  type: T,
  payload: PayloadForType<T>,
  metadata?: Record<string, unknown>,
): RouteEvent<PayloadForType<T>> => ({
  type,
  payload,
  timestamp: new Date(),
  metadata,
});
