/**
 * Phase 3: Telemetry Subscriber
 * 全イベントを購読し、メトリクス収集・ログ出力を行う
 */

import { EventBus, Unsubscribe } from "../../events/EventBus";
import {
  getPerformanceMonitor,
  PerformanceMonitor,
} from "../../telemetry/PerformanceMonitor";

export interface TelemetryConfig {
  enabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  metricsEnabled: boolean;
}

interface EventMetric {
  eventType: string;
  timestamp: Date;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Telemetry Subscriber
 * 全イベントを購読し、メトリクス・ログを収集
 */
export class TelemetrySubscriber {
  private unsubscribers: Unsubscribe[] = [];
  private eventCounts: Map<string, number> = new Map();
  private recentEvents: EventMetric[] = [];
  private maxRecentEvents = 100;
  private performanceMonitor: PerformanceMonitor;

  constructor(
    private readonly eventBus: EventBus,
    private readonly config: TelemetryConfig = {
      enabled: true,
      logLevel: "info",
      metricsEnabled: true,
    },
  ) {
    this.performanceMonitor = getPerformanceMonitor();
  }

  /**
   * 購読開始
   */
  subscribe(): void {
    if (!this.config.enabled) {
      console.log("[TelemetrySubscriber] Disabled, skipping subscribe");
      return;
    }

    // ワイルドカードで全イベントを購読
    const unsubAll = this.eventBus.on("*", (data: unknown) => {
      // ワイルドカードではイベント名が取得できないため、
      // 各ドメインのイベントを個別に購読する
    });
    this.unsubscribers.push(unsubAll);

    // Plan イベント
    this.subscribeToPattern("plan:*");

    // Place イベント
    this.subscribeToPattern("place:*");

    // Route イベント
    this.subscribeToPattern("route:*");

    // Sync イベント
    this.subscribeToPattern("sync:*");

    // Error イベント
    this.subscribeToPattern("error:*");

    console.log("[TelemetrySubscriber] Subscribed to all events");
  }

  /**
   * パターンでイベントを購読
   */
  private subscribeToPattern(pattern: string): void {
    const unsub = this.eventBus.on(pattern, (data: unknown) => {
      this.recordEvent(pattern, data);
    });
    this.unsubscribers.push(unsub);
  }

  /**
   * 購読解除
   */
  unsubscribe(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    console.log("[TelemetrySubscriber] Unsubscribed from all events");
  }

  /**
   * イベントを記録
   */
  private recordEvent(eventType: string, data: unknown): void {
    const metric: EventMetric = {
      eventType,
      timestamp: new Date(),
      metadata:
        typeof data === "object"
          ? (data as Record<string, unknown>)
          : undefined,
    };

    // カウント更新
    const currentCount = this.eventCounts.get(eventType) || 0;
    this.eventCounts.set(eventType, currentCount + 1);

    // 最近のイベントに追加
    this.recentEvents.push(metric);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // メトリクス記録
    if (this.config.metricsEnabled) {
      this.performanceMonitor.recordMetric({
        operation: `event.${eventType}`,
        durationMs: 0, // イベント発火自体の所要時間
        timestamp: metric.timestamp,
        metadata: metric.metadata,
      });
    }

    // ログ出力
    this.logEvent(eventType, data);
  }

  /**
   * イベントログ出力
   */
  private logEvent(eventType: string, data: unknown): void {
    const logLevel = this.config.logLevel;
    const message = `[Telemetry] Event: ${eventType}`;

    switch (logLevel) {
      case "debug":
        console.debug(message, data);
        break;
      case "info":
        console.log(message, { type: eventType });
        break;
      case "warn":
        // warnレベルではエラーイベントのみログ
        if (eventType.includes("error") || eventType.includes("failed")) {
          console.warn(message, data);
        }
        break;
      case "error":
        // errorレベルではエラーイベントのみログ
        if (eventType.includes("error") || eventType.includes("failed")) {
          console.error(message, data);
        }
        break;
    }
  }

  /**
   * イベント統計を取得
   */
  getStatistics(): {
    totalEvents: number;
    eventCounts: Record<string, number>;
    recentEvents: EventMetric[];
  } {
    return {
      totalEvents: Array.from(this.eventCounts.values()).reduce(
        (a, b) => a + b,
        0,
      ),
      eventCounts: Object.fromEntries(this.eventCounts),
      recentEvents: [...this.recentEvents],
    };
  }

  /**
   * 統計をリセット
   */
  resetStatistics(): void {
    this.eventCounts.clear();
    this.recentEvents = [];
  }
}
