export interface SyncEvent<TPayload = Record<string, unknown>> {
  readonly type: string;
  readonly payload: TPayload;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface SyncEventPayloads {
  readonly [eventType: string]: Record<string, unknown>;
}

// ========== Concrete Event Types ==========

export interface SyncStartedPayload {
  readonly syncId: string;
  readonly entityType: "plan" | "place" | "label" | "route";
  readonly entityId: string;
  readonly operation: "create" | "update" | "delete";
  readonly initiatedBy: string;
}

export interface SyncCompletedPayload {
  readonly syncId: string;
  readonly entityType: "plan" | "place" | "label" | "route";
  readonly entityId: string;
  readonly operation: "create" | "update" | "delete";
  readonly durationMs: number;
  readonly serverTimestamp: Date;
}

export interface SyncFailedPayload {
  readonly syncId: string;
  readonly entityType: "plan" | "place" | "label" | "route";
  readonly entityId: string;
  readonly operation: "create" | "update" | "delete";
  readonly reason: string;
  readonly errorCode?: string;
  readonly retryable: boolean;
  readonly retryCount?: number;
}

export interface SyncConflictDetectedPayload {
  readonly syncId: string;
  readonly entityType: "plan" | "place" | "label" | "route";
  readonly entityId: string;
  readonly localVersion: number;
  readonly remoteVersion: number;
  readonly conflictFields: string[];
  readonly resolvedBy?: "server" | "client" | "manual";
}

export interface SyncRemoteUpdateReceivedPayload {
  readonly entityType: "plan" | "place" | "label" | "route";
  readonly entityId: string;
  readonly version: number;
  readonly updatedBy: string;
  readonly updatedFields: string[];
  readonly receivedAt: Date;
}

// Event type literals
export type SyncEventType =
  | "sync/started"
  | "sync/completed"
  | "sync/failed"
  | "sync/conflictDetected"
  | "sync/remoteUpdateReceived";

// Typed event factories
export type SyncStartedEvent = SyncEvent<SyncStartedPayload> & {
  type: "sync/started";
};
export type SyncCompletedEvent = SyncEvent<SyncCompletedPayload> & {
  type: "sync/completed";
};
export type SyncFailedEvent = SyncEvent<SyncFailedPayload> & {
  type: "sync/failed";
};
export type SyncConflictDetectedEvent =
  SyncEvent<SyncConflictDetectedPayload> & {
    type: "sync/conflictDetected";
  };
export type SyncRemoteUpdateReceivedEvent =
  SyncEvent<SyncRemoteUpdateReceivedPayload> & {
    type: "sync/remoteUpdateReceived";
  };

// Union type for all sync events
export type TypedSyncEvent =
  | SyncStartedEvent
  | SyncCompletedEvent
  | SyncFailedEvent
  | SyncConflictDetectedEvent
  | SyncRemoteUpdateReceivedEvent;

// Payload type map for factory
type PayloadForType<T extends SyncEventType> = T extends "sync/started"
  ? SyncStartedPayload
  : T extends "sync/completed"
    ? SyncCompletedPayload
    : T extends "sync/failed"
      ? SyncFailedPayload
      : T extends "sync/conflictDetected"
        ? SyncConflictDetectedPayload
        : T extends "sync/remoteUpdateReceived"
          ? SyncRemoteUpdateReceivedPayload
          : never;

// Event factory helpers
export const createSyncEvent = <T extends SyncEventType>(
  type: T,
  payload: PayloadForType<T>,
  metadata?: Record<string, unknown>,
): SyncEvent<PayloadForType<T>> => ({
  type,
  payload,
  timestamp: new Date(),
  metadata,
});
