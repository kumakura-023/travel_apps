/**
 * Phase 3: usePerformance Hook
 * React コンポーネント用のパフォーマンス計測 Hook
 */

import { useCallback, useEffect, useRef } from "react";
import {
  getPerformanceMonitor,
  PerformanceMetric,
} from "../PerformanceMonitor";
import { OPERATION_THRESHOLDS, OperationName } from "../thresholds";

export interface UsePerformanceOptions {
  operation: OperationName | string;
  metadata?: Record<string, unknown>;
  autoStart?: boolean;
  threshold?: number;
}

export interface UsePerformanceResult {
  startMeasure: () => void;
  stopMeasure: () => number;
  measureAsync: <T>(fn: () => Promise<T>) => Promise<T>;
  getMetrics: () => PerformanceMetric[];
}

/**
 * パフォーマンス計測 Hook
 * コンポーネントのレンダリングや操作の計測に使用
 */
export function usePerformance(
  options: UsePerformanceOptions,
): UsePerformanceResult {
  const { operation, metadata, autoStart = false, threshold } = options;
  const monitor = getPerformanceMonitor();
  const startTimeRef = useRef<number | null>(null);
  const measureEndRef = useRef<(() => void) | null>(null);

  // 閾値を取得
  const effectiveThreshold =
    threshold ?? OPERATION_THRESHOLDS[operation as OperationName] ?? 1000;

  // コンポーネントマウント時の自動計測
  useEffect(() => {
    if (autoStart) {
      startMeasure();
      return () => {
        stopMeasure();
      };
    }
  }, [autoStart]);

  /**
   * 計測開始
   */
  const startMeasure = useCallback(() => {
    startTimeRef.current = performance.now();
    measureEndRef.current = monitor.startMeasure(operation, {
      ...metadata,
      threshold: effectiveThreshold,
    });
  }, [operation, metadata, effectiveThreshold, monitor]);

  /**
   * 計測終了
   * @returns 経過時間（ミリ秒）
   */
  const stopMeasure = useCallback((): number => {
    if (measureEndRef.current) {
      measureEndRef.current();
      measureEndRef.current = null;
    }

    if (startTimeRef.current !== null) {
      const duration = performance.now() - startTimeRef.current;
      startTimeRef.current = null;

      // 閾値超過の警告
      if (duration > effectiveThreshold) {
        console.warn(`[usePerformance] ${operation} exceeded threshold`, {
          duration,
          threshold: effectiveThreshold,
        });
      }

      return duration;
    }

    return 0;
  }, [operation, effectiveThreshold]);

  /**
   * 非同期処理の計測
   */
  const measureAsync = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      startMeasure();
      try {
        const result = await fn();
        stopMeasure();
        return result;
      } catch (error) {
        stopMeasure();
        throw error;
      }
    },
    [startMeasure, stopMeasure],
  );

  /**
   * この操作のメトリクスを取得
   */
  const getMetrics = useCallback((): PerformanceMetric[] => {
    return monitor.getMetrics(operation);
  }, [operation, monitor]);

  return {
    startMeasure,
    stopMeasure,
    measureAsync,
    getMetrics,
  };
}

/**
 * コンポーネントのレンダリング時間を計測する Hook
 */
export function useRenderPerformance(componentName: string): void {
  const renderCount = useRef(0);
  const monitor = getPerformanceMonitor();

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now();

    return () => {
      const duration = performance.now() - renderTime;
      monitor.recordMetric({
        operation: `render.${componentName}`,
        durationMs: duration,
        timestamp: new Date(),
        metadata: {
          renderCount: renderCount.current,
        },
      });
    };
  });
}

/**
 * 特定の操作の平均時間を取得する Hook
 */
export function usePerformanceStats(operation: string): {
  avg: number | null;
  count: number;
  lastDuration: number | null;
} {
  const monitor = getPerformanceMonitor();
  const stats = (monitor as any).getStatistics?.(operation);

  if (!stats) {
    return { avg: null, count: 0, lastDuration: null };
  }

  const metrics = monitor.getMetrics(operation);
  const lastMetric = metrics[metrics.length - 1];

  return {
    avg: stats.avg,
    count: stats.count,
    lastDuration: lastMetric?.durationMs ?? null,
  };
}
