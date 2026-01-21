/**
 * 同期関連のイベント定義
 */
import { EventBus, EventHandler, Unsubscribe } from "./EventBus";

/**
 * 同期関連のイベント名
 */
export const SyncEventNames = {
  SYNC_STARTED: "sync:started",
  SYNC_COMPLETED: "sync:completed",
  SYNC_FAILED: "sync:failed",
  SYNC_CONFLICT_DETECTED: "sync:conflictDetected",
  SYNC_REMOTE_UPDATE_RECEIVED: "sync:remoteUpdateReceived",
} as const;

/**
 * エンティティタイプ
 */
export type SyncEntityType = "plan" | "place" | "label" | "route";

/**
 * 同期操作タイプ
 */
export type SyncOperationType = "create" | "update" | "delete";

/**
 * 同期関連のイベントペイロード
 */
export interface SyncEventPayloads {
  [SyncEventNames.SYNC_STARTED]: {
    syncId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperationType;
    initiatedBy: string;
  };
  [SyncEventNames.SYNC_COMPLETED]: {
    syncId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperationType;
    durationMs: number;
    serverTimestamp?: Date;
  };
  [SyncEventNames.SYNC_FAILED]: {
    syncId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperationType;
    reason: string;
    errorCode?: string;
    retryable: boolean;
    retryCount?: number;
  };
  [SyncEventNames.SYNC_CONFLICT_DETECTED]: {
    syncId: string;
    entityType: SyncEntityType;
    entityId: string;
    localVersion: number;
    remoteVersion: number;
    conflictFields: string[];
    resolvedBy?: "server" | "client" | "manual";
  };
  [SyncEventNames.SYNC_REMOTE_UPDATE_RECEIVED]: {
    entityType: SyncEntityType;
    entityId: string;
    version?: number;
    updatedBy: string;
    updatedFields?: string[];
    receivedAt: Date;
  };
}

/**
 * 同期関連のイベントを管理するクラス
 */
export class SyncEventBus {
  constructor(private eventBus: EventBus) {}

  /**
   * 同期開始イベントを発火
   */
  emitSyncStarted(
    syncId: string,
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperationType,
    initiatedBy: string,
  ): Promise<void> {
    return this.eventBus.emit(SyncEventNames.SYNC_STARTED, {
      syncId,
      entityType,
      entityId,
      operation,
      initiatedBy,
    });
  }

  /**
   * 同期完了イベントを発火
   */
  emitSyncCompleted(
    syncId: string,
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperationType,
    durationMs: number,
    serverTimestamp?: Date,
  ): Promise<void> {
    return this.eventBus.emit(SyncEventNames.SYNC_COMPLETED, {
      syncId,
      entityType,
      entityId,
      operation,
      durationMs,
      serverTimestamp,
    });
  }

  /**
   * 同期失敗イベントを発火
   */
  emitSyncFailed(
    syncId: string,
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperationType,
    reason: string,
    options?: {
      errorCode?: string;
      retryable?: boolean;
      retryCount?: number;
    },
  ): Promise<void> {
    return this.eventBus.emit(SyncEventNames.SYNC_FAILED, {
      syncId,
      entityType,
      entityId,
      operation,
      reason,
      errorCode: options?.errorCode,
      retryable: options?.retryable ?? false,
      retryCount: options?.retryCount,
    });
  }

  /**
   * 同期競合検出イベントを発火
   */
  emitSyncConflictDetected(
    syncId: string,
    entityType: SyncEntityType,
    entityId: string,
    localVersion: number,
    remoteVersion: number,
    conflictFields: string[],
    resolvedBy?: "server" | "client" | "manual",
  ): Promise<void> {
    return this.eventBus.emit(SyncEventNames.SYNC_CONFLICT_DETECTED, {
      syncId,
      entityType,
      entityId,
      localVersion,
      remoteVersion,
      conflictFields,
      resolvedBy,
    });
  }

  /**
   * リモート更新受信イベントを発火
   */
  emitSyncRemoteUpdateReceived(
    entityType: SyncEntityType,
    entityId: string,
    updatedBy: string,
    options?: {
      version?: number;
      updatedFields?: string[];
    },
  ): Promise<void> {
    return this.eventBus.emit(SyncEventNames.SYNC_REMOTE_UPDATE_RECEIVED, {
      entityType,
      entityId,
      version: options?.version,
      updatedBy,
      updatedFields: options?.updatedFields,
      receivedAt: new Date(),
    });
  }

  // ========== Subscription Methods ==========

  /**
   * 同期開始イベントを購読
   */
  onSyncStarted(
    handler: EventHandler<
      SyncEventPayloads[typeof SyncEventNames.SYNC_STARTED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(SyncEventNames.SYNC_STARTED, handler);
  }

  /**
   * 同期完了イベントを購読
   */
  onSyncCompleted(
    handler: EventHandler<
      SyncEventPayloads[typeof SyncEventNames.SYNC_COMPLETED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(SyncEventNames.SYNC_COMPLETED, handler);
  }

  /**
   * 同期失敗イベントを購読
   */
  onSyncFailed(
    handler: EventHandler<SyncEventPayloads[typeof SyncEventNames.SYNC_FAILED]>,
  ): Unsubscribe {
    return this.eventBus.on(SyncEventNames.SYNC_FAILED, handler);
  }

  /**
   * 同期競合検出イベントを購読
   */
  onSyncConflictDetected(
    handler: EventHandler<
      SyncEventPayloads[typeof SyncEventNames.SYNC_CONFLICT_DETECTED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(SyncEventNames.SYNC_CONFLICT_DETECTED, handler);
  }

  /**
   * リモート更新受信イベントを購読
   */
  onSyncRemoteUpdateReceived(
    handler: EventHandler<
      SyncEventPayloads[typeof SyncEventNames.SYNC_REMOTE_UPDATE_RECEIVED]
    >,
  ): Unsubscribe {
    return this.eventBus.on(
      SyncEventNames.SYNC_REMOTE_UPDATE_RECEIVED,
      handler,
    );
  }
}
