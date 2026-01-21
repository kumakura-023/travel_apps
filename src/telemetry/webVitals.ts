/**
 * Phase 3: Web Vitals 計測初期化
 * Core Web Vitals (LCP, FID, CLS) の監視
 */

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

export interface WebVitalsReporter {
  onLCP?: (metric: WebVitalMetric) => void;
  onFID?: (metric: WebVitalMetric) => void;
  onCLS?: (metric: WebVitalMetric) => void;
  onFCP?: (metric: WebVitalMetric) => void;
  onTTFB?: (metric: WebVitalMetric) => void;
}

/**
 * Web Vitals 初期化
 * web-vitals ライブラリがインストールされている場合のみ動作
 */
export async function initWebVitals(
  reporter?: WebVitalsReporter,
): Promise<void> {
  try {
    // web-vitals ライブラリを動的インポート
    const { onCLS, onFID, onLCP, onFCP, onTTFB } = await import("web-vitals");

    // LCP (Largest Contentful Paint)
    onLCP((metric) => {
      const webVitalMetric = convertMetric(metric);
      console.log("[WebVitals] LCP:", webVitalMetric);
      reporter?.onLCP?.(webVitalMetric);
    });

    // FID (First Input Delay)
    onFID((metric) => {
      const webVitalMetric = convertMetric(metric);
      console.log("[WebVitals] FID:", webVitalMetric);
      reporter?.onFID?.(webVitalMetric);
    });

    // CLS (Cumulative Layout Shift)
    onCLS((metric) => {
      const webVitalMetric = convertMetric(metric);
      console.log("[WebVitals] CLS:", webVitalMetric);
      reporter?.onCLS?.(webVitalMetric);
    });

    // FCP (First Contentful Paint)
    onFCP((metric) => {
      const webVitalMetric = convertMetric(metric);
      console.log("[WebVitals] FCP:", webVitalMetric);
      reporter?.onFCP?.(webVitalMetric);
    });

    // TTFB (Time to First Byte)
    onTTFB((metric) => {
      const webVitalMetric = convertMetric(metric);
      console.log("[WebVitals] TTFB:", webVitalMetric);
      reporter?.onTTFB?.(webVitalMetric);
    });

    console.log("[WebVitals] Initialized successfully");
  } catch (error) {
    console.warn(
      "[WebVitals] web-vitals library not found. Skipping initialization.",
    );
  }
}

/**
 * web-vitals のメトリクスを内部形式に変換
 */
function convertMetric(metric: any): WebVitalMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
  };
}

/**
 * メトリクス値から評価を取得
 */
function getRating(
  name: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, { good: number; needsImprovement: number }> =
    {
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FCP: { good: 1800, needsImprovement: 3000 },
      TTFB: { good: 800, needsImprovement: 1800 },
    };

  const threshold = thresholds[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.needsImprovement) return "needs-improvement";
  return "poor";
}

/**
 * デフォルトレポーター（コンソール + LocalStorage）
 */
export function createDefaultReporter(): WebVitalsReporter {
  return {
    onLCP: (metric) => {
      storeMetric("LCP", metric);
    },
    onFID: (metric) => {
      storeMetric("FID", metric);
    },
    onCLS: (metric) => {
      storeMetric("CLS", metric);
    },
    onFCP: (metric) => {
      storeMetric("FCP", metric);
    },
    onTTFB: (metric) => {
      storeMetric("TTFB", metric);
    },
  };
}

/**
 * メトリクスを LocalStorage に保存
 */
function storeMetric(name: string, metric: WebVitalMetric): void {
  try {
    const key = `webvital_${name.toLowerCase()}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...metric,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn(`[WebVitals] Failed to store ${name} metric:`, error);
  }
}

/**
 * 保存されたメトリクスを取得
 */
export function getStoredMetrics(): Record<string, WebVitalMetric | null> {
  const metrics: Record<string, WebVitalMetric | null> = {
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null,
  };

  Object.keys(metrics).forEach((name) => {
    try {
      const key = `webvital_${name.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        metrics[name] = JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`[WebVitals] Failed to retrieve ${name} metric:`, error);
    }
  });

  return metrics;
}
