/**
 * Phase 3: Telemetry関連エクスポート
 */
export {
  PerformanceMonitorImpl,
  getPerformanceMonitor,
  setPerformanceMonitor,
  measure,
} from "./PerformanceMonitor";
export type {
  PerformanceMetric,
  PerformanceMonitor,
} from "./PerformanceMonitor";
export {
  PERFORMANCE_THRESHOLDS,
  OPERATION_THRESHOLDS,
  getThreshold,
  getThresholdLevel,
  getThresholdsByCategory,
} from "./thresholds";
export type { PerformanceThreshold, OperationName } from "./thresholds";
export {
  initWebVitals,
  createDefaultReporter,
  getStoredMetrics,
} from "./webVitals";
export type { WebVitalMetric, WebVitalsReporter } from "./webVitals";

// Hooks
export {
  usePerformance,
  useRenderPerformance,
  usePerformanceStats,
} from "./hooks/usePerformance";
export type {
  UsePerformanceOptions,
  UsePerformanceResult,
} from "./hooks/usePerformance";

// Decorators
export {
  measured,
  measuredClass,
  measureOperation,
  measureAsync,
} from "./decorators/measured";
export type { MeasuredOptions } from "./decorators/measured";

// Subscribers
export {
  PerformanceEventSubscriber,
  emitPerformanceStart,
  emitPerformanceEnd,
} from "./subscribers/PerformanceEventSubscriber";
export type { PerformanceEventSubscriberConfig } from "./subscribers/PerformanceEventSubscriber";
