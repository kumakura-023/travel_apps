/**
 * Phase 3: パフォーマンス監視
 */

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  threshold?: number;
  exceeded?: boolean;
}

export interface PerformanceMonitor {
  startMeasure(
    operation: string,
    metadata?: Record<string, unknown>,
  ): () => void;
  recordMetric(metric: PerformanceMetric): void;
  getMetrics(operation?: string): PerformanceMetric[];
  clearMetrics(): void;
}

/**
 * パフォーマンス監視実装
 */
export class PerformanceMonitorImpl implements PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000; // メモリ節約のため上限設定

  /**
   * 計測開始
   */
  startMeasure(
    operation: string,
    metadata?: Record<string, unknown>,
  ): () => void {
    const startTime = performance.now();
    const startTimestamp = new Date();

    return () => {
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      this.recordMetric({
        operation,
        durationMs,
        timestamp: startTimestamp,
        metadata,
      });
    };
  }

  /**
   * メトリクス記録
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // 上限を超えたら古いものから削除
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 閾値超過チェック
    if (metric.threshold && metric.durationMs > metric.threshold) {
      console.warn(
        `[PerformanceMonitor] Threshold exceeded for ${metric.operation}`,
        {
          duration: metric.durationMs,
          threshold: metric.threshold,
          metadata: metric.metadata,
        },
      );
    }
  }

  /**
   * メトリクス取得
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter((m) => m.operation === operation);
    }
    return [...this.metrics];
  }

  /**
   * メトリクスクリア
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 統計情報取得
   */
  getStatistics(operation: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return null;

    const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      count: durations.length,
      avg: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }
}

/**
 * デコレーター: メソッドの実行時間を計測
 */
export function measure(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const operationName =
      operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const endMeasure = monitor.startMeasure(operationName);

      try {
        const result = await originalMethod.apply(this, args);
        endMeasure();
        return result;
      } catch (error) {
        endMeasure();
        throw error;
      }
    };

    return descriptor;
  };
}

// シングルトンインスタンス
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitorImpl();
  }
  return performanceMonitorInstance;
}

export function setPerformanceMonitor(monitor: PerformanceMonitor): void {
  performanceMonitorInstance = monitor;
}
