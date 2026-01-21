/**
 * Phase 3: Performance Event Subscriber
 * EventBus と連携してパフォーマンスメトリクスを収集
 */

import { EventBus, Unsubscribe } from "../../events/EventBus";
import {
  getPerformanceMonitor,
  PerformanceMetric,
  PerformanceMonitor,
} from "../PerformanceMonitor";
import { OPERATION_THRESHOLDS, OperationName } from "../thresholds";

export interface PerformanceEventSubscriberConfig {
  enabled: boolean;
  logSlowOperations: boolean;
  slowThresholdMultiplier: number; // 閾値の何倍で "遅い" とみなすか
  sendToAnalytics: boolean;
}

interface OperationTiming {
  operation: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * パフォーマンスイベントを収集する Subscriber
 * 操作の開始/終了イベントを購読し、メトリクスを記録
 */
export class PerformanceEventSubscriber {
  private unsubscribers: Unsubscribe[] = [];
  private operationTimings: Map<string, OperationTiming> = new Map();
  private performanceMonitor: PerformanceMonitor;

  constructor(
    private readonly eventBus: EventBus,
    private readonly config: PerformanceEventSubscriberConfig = {
      enabled: true,
      logSlowOperations: true,
      slowThresholdMultiplier: 2.0,
      sendToAnalytics: false,
    },
  ) {
    this.performanceMonitor = getPerformanceMonitor();
  }

  /**
   * 購読開始
   */
  subscribe(): void {
    if (!this.config.enabled) {
      console.log("[PerformanceEventSubscriber] Disabled, skipping subscribe");
      return;
    }

    // 操作開始イベント
    const unsubStart = this.eventBus.on(
      "performance:start",
      (data: {
        operationId: string;
        operation: string;
        metadata?: Record<string, unknown>;
      }) => {
        this.handleOperationStart(
          data.operationId,
          data.operation,
          data.metadata,
        );
      },
    );
    this.unsubscribers.push(unsubStart);

    // 操作終了イベント
    const unsubEnd = this.eventBus.on(
      "performance:end",
      (data: {
        operationId: string;
        success: boolean;
        metadata?: Record<string, unknown>;
      }) => {
        this.handleOperationEnd(data.operationId, data.success, data.metadata);
      },
    );
    this.unsubscribers.push(unsubEnd);

    // 直接メトリクス記録イベント
    const unsubMetric = this.eventBus.on(
      "performance:metric",
      (data: PerformanceMetric) => {
        this.handleMetric(data);
      },
    );
    this.unsubscribers.push(unsubMetric);

    // Plan 操作イベント
    this.subscribeToPlanEvents();

    // Sync 操作イベント
    this.subscribeToSyncEvents();

    // Route 操作イベント
    this.subscribeToRouteEvents();

    console.log(
      "[PerformanceEventSubscriber] Subscribed to performance events",
    );
  }

  /**
   * Plan 関連イベントの購読
   */
  private subscribeToPlanEvents(): void {
    const planEvents = [
      "plan:created",
      "plan:updated",
      "plan:deleted",
      "plan:selected",
    ];

    for (const event of planEvents) {
      const unsub = this.eventBus.on(event, (data: any) => {
        this.recordEventMetric(event, data);
      });
      this.unsubscribers.push(unsub);
    }
  }

  /**
   * Sync 関連イベントの購読
   */
  private subscribeToSyncEvents(): void {
    const syncEvents = ["sync:started", "sync:completed", "sync:failed"];

    for (const event of syncEvents) {
      const unsub = this.eventBus.on(event, (data: any) => {
        this.recordEventMetric(event, data);
      });
      this.unsubscribers.push(unsub);
    }
  }

  /**
   * Route 関連イベントの購読
   */
  private subscribeToRouteEvents(): void {
    const routeEvents = ["route:calculated", "route:error"];

    for (const event of routeEvents) {
      const unsub = this.eventBus.on(event, (data: any) => {
        this.recordEventMetric(event, data);
      });
      this.unsubscribers.push(unsub);
    }
  }

  /**
   * 購読解除
   */
  unsubscribe(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.operationTimings.clear();
    console.log(
      "[PerformanceEventSubscriber] Unsubscribed from performance events",
    );
  }

  /**
   * 操作開始ハンドラ
   */
  private handleOperationStart(
    operationId: string,
    operation: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.operationTimings.set(operationId, {
      operation,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * 操作終了ハンドラ
   */
  private handleOperationEnd(
    operationId: string,
    success: boolean,
    endMetadata?: Record<string, unknown>,
  ): void {
    const timing = this.operationTimings.get(operationId);
    if (!timing) {
      console.warn(
        `[PerformanceEventSubscriber] Unknown operationId: ${operationId}`,
      );
      return;
    }

    const duration = performance.now() - timing.startTime;
    this.operationTimings.delete(operationId);

    const threshold =
      OPERATION_THRESHOLDS[timing.operation as OperationName] ?? 1000;
    const isExceeded = duration > threshold;
    const isSlow = duration > threshold * this.config.slowThresholdMultiplier;

    const metric: PerformanceMetric = {
      operation: timing.operation,
      durationMs: duration,
      timestamp: new Date(),
      threshold,
      exceeded: isExceeded,
      metadata: {
        ...timing.metadata,
        ...endMetadata,
        success,
        isSlow,
      },
    };

    this.performanceMonitor.recordMetric(metric);

    // 遅い操作をログ出力
    if (this.config.logSlowOperations && isSlow) {
      console.warn(`[PerformanceEventSubscriber] Slow operation detected`, {
        operation: timing.operation,
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        multiplier: this.config.slowThresholdMultiplier,
      });
    }

    // Analytics送信
    if (this.config.sendToAnalytics) {
      this.sendToAnalytics(metric);
    }
  }

  /**
   * 直接メトリクス記録
   */
  private handleMetric(metric: PerformanceMetric): void {
    this.performanceMonitor.recordMetric(metric);
  }

  /**
   * イベントからメトリクスを記録
   */
  private recordEventMetric(eventType: string, data: any): void {
    const metric: PerformanceMetric = {
      operation: `event.${eventType}`,
      durationMs: data?.duration ?? 0,
      timestamp: new Date(),
      metadata: {
        eventType,
        ...data,
      },
    };

    this.performanceMonitor.recordMetric(metric);
  }

  /**
   * Analytics送信（プレースホルダー）
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // TODO: 実際のAnalyticsサービスに送信
    console.log(
      "[PerformanceEventSubscriber] Would send to analytics:",
      metric,
    );
  }

  /**
   * 現在進行中の操作数を取得
   */
  getPendingOperationsCount(): number {
    return this.operationTimings.size;
  }

  /**
   * 進行中の操作一覧を取得
   */
  getPendingOperations(): string[] {
    return Array.from(this.operationTimings.values()).map((t) => t.operation);
  }
}

/**
 * パフォーマンスイベントを発行するヘルパー
 */
export function emitPerformanceStart(
  eventBus: EventBus,
  operation: string,
  metadata?: Record<string, unknown>,
): string {
  const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  eventBus.emit("performance:start", { operationId, operation, metadata });
  return operationId;
}

export function emitPerformanceEnd(
  eventBus: EventBus,
  operationId: string,
  success: boolean,
  metadata?: Record<string, unknown>,
): void {
  eventBus.emit("performance:end", { operationId, success, metadata });
}
