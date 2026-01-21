/**
 * Phase 3: Place 永続化 Subscriber
 * place イベントを購読し、Firestore への永続化を行う
 */

import { EventBus, Unsubscribe, EventNames } from "../../events/EventBus";
import type { Place } from "../../types";
import { AppError } from "../../errors/AppError";
import { PlaceErrorCode } from "../../errors/ErrorCode";
import { getRetryPolicy, withRetry } from "../../errors/RetryPolicy";

export interface PlacePersistenceConfig {
  enabled: boolean;
  debounceMs?: number;
}

interface PendingOperation {
  type: "add" | "update" | "delete";
  placeId: string;
  data?: Place | Partial<Place>;
  timestamp: number;
}

/**
 * Place 永続化 Subscriber
 * PLACE_ADDED, PLACE_UPDATED, PLACE_REMOVED イベントを購読し、
 * Firestore への永続化を非同期で行う
 */
export class PlacePersistenceSubscriber {
  private unsubscribers: Unsubscribe[] = [];
  private pendingOperations: Map<string, PendingOperation> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly persistPlace: (
      placeId: string,
      place: Place,
    ) => Promise<void>,
    private readonly deletePlace: (placeId: string) => Promise<void>,
    private readonly config: PlacePersistenceConfig = { enabled: true },
  ) {}

  /**
   * 購読開始
   */
  subscribe(): void {
    if (!this.config.enabled) {
      console.log("[PlacePersistenceSubscriber] Disabled, skipping subscribe");
      return;
    }

    // place:added イベント
    const unsubAdd = this.eventBus.on(
      EventNames.PLACE_ADDED,
      async (data: { placeId: string; place: Place }) => {
        await this.handlePlaceAdded(data.placeId, data.place);
      },
    );
    this.unsubscribers.push(unsubAdd);

    // place:updated イベント
    const unsubUpdate = this.eventBus.on(
      EventNames.PLACE_UPDATED,
      async (data: { placeId: string; changes: Partial<Place> }) => {
        await this.handlePlaceUpdated(data.placeId, data.changes);
      },
    );
    this.unsubscribers.push(unsubUpdate);

    // place:removed イベント
    const unsubRemove = this.eventBus.on(
      EventNames.PLACE_REMOVED,
      async (data: { placeId: string }) => {
        await this.handlePlaceRemoved(data.placeId);
      },
    );
    this.unsubscribers.push(unsubRemove);

    console.log("[PlacePersistenceSubscriber] Subscribed to place events");
  }

  /**
   * 購読解除
   */
  unsubscribe(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.clearPendingOperations();
    console.log("[PlacePersistenceSubscriber] Unsubscribed from place events");
  }

  /**
   * 保留中の操作をクリア
   */
  clearPendingOperations(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingOperations.clear();
  }

  /**
   * Place 追加ハンドラ
   */
  private async handlePlaceAdded(placeId: string, place: Place): Promise<void> {
    console.log("[PlacePersistenceSubscriber] Place added:", placeId);

    this.queueOperation({
      type: "add",
      placeId,
      data: place,
      timestamp: Date.now(),
    });
  }

  /**
   * Place 更新ハンドラ
   */
  private async handlePlaceUpdated(
    placeId: string,
    changes: Partial<Place>,
  ): Promise<void> {
    console.log("[PlacePersistenceSubscriber] Place updated:", placeId);

    // 既存の操作とマージ
    const existing = this.pendingOperations.get(placeId);
    if (existing && existing.type === "update" && existing.data) {
      this.queueOperation({
        type: "update",
        placeId,
        data: { ...existing.data, ...changes },
        timestamp: Date.now(),
      });
    } else {
      this.queueOperation({
        type: "update",
        placeId,
        data: changes,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Place 削除ハンドラ
   */
  private async handlePlaceRemoved(placeId: string): Promise<void> {
    console.log("[PlacePersistenceSubscriber] Place removed:", placeId);

    // 削除は即座に実行（デバウンスしない）
    this.pendingOperations.delete(placeId);
    await this.executeWithRetry(
      () => this.deletePlace(placeId),
      PlaceErrorCode.PLACE_DELETE_FAILED,
      placeId,
    );
  }

  /**
   * 操作をキューに追加
   */
  private queueOperation(operation: PendingOperation): void {
    this.pendingOperations.set(operation.placeId, operation);
    this.scheduleFlush();
  }

  /**
   * フラッシュをスケジュール
   */
  private scheduleFlush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = this.config.debounceMs ?? 500;
    this.debounceTimer = setTimeout(() => {
      this.flushPendingOperations();
    }, debounceMs);
  }

  /**
   * 保留中の操作をフラッシュ
   */
  private async flushPendingOperations(): Promise<void> {
    const operations = Array.from(this.pendingOperations.values());
    this.pendingOperations.clear();

    for (const op of operations) {
      try {
        if (op.type === "add" && op.data) {
          await this.executeWithRetry(
            () => this.persistPlace(op.placeId, op.data as Place),
            PlaceErrorCode.PLACE_ADD_FAILED,
            op.placeId,
          );
        } else if (op.type === "update" && op.data) {
          // 更新は部分データなので、完全なPlaceデータが必要な場合は別途取得
          await this.executeWithRetry(
            () => this.persistPlace(op.placeId, op.data as Place),
            PlaceErrorCode.PLACE_UPDATE_FAILED,
            op.placeId,
          );
        }
      } catch (error) {
        console.error(
          `[PlacePersistenceSubscriber] Failed to persist place ${op.placeId}:`,
          error,
        );
      }
    }
  }

  /**
   * リトライ付き実行
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorCode: PlaceErrorCode,
    placeId: string,
  ): Promise<T> {
    try {
      const policy = getRetryPolicy(errorCode);
      return await withRetry(operation, policy, (retryCount, delay) => {
        console.log(
          `[PlacePersistenceSubscriber] Retry ${retryCount} for ${placeId}, waiting ${delay}ms`,
        );
      });
    } catch (error) {
      throw AppError.fromError(error, errorCode, "error", {
        service: "PlacePersistenceSubscriber",
        operation: "persist",
        entityId: placeId,
        entityType: "place",
      });
    }
  }
}
