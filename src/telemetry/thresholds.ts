/**
 * Phase 3: 操作別パフォーマンス閾値
 */

export interface PerformanceThreshold {
  operation: string;
  warningMs: number;
  criticalMs: number;
  description: string;
}

/**
 * 操作別閾値定義
 */
export const PERFORMANCE_THRESHOLDS: Record<string, PerformanceThreshold> = {
  // ========== Plan 操作 ==========
  "plan.load": {
    operation: "plan.load",
    warningMs: 1000,
    criticalMs: 3000,
    description: "プラン読み込み",
  },
  "plan.save": {
    operation: "plan.save",
    warningMs: 1500,
    criticalMs: 5000,
    description: "プラン保存",
  },
  "plan.delete": {
    operation: "plan.delete",
    warningMs: 1000,
    criticalMs: 3000,
    description: "プラン削除",
  },
  "plan.switch": {
    operation: "plan.switch",
    warningMs: 2000,
    criticalMs: 5000,
    description: "プラン切り替え",
  },
  "plan.create": {
    operation: "plan.create",
    warningMs: 1000,
    criticalMs: 3000,
    description: "プラン作成",
  },

  // ========== Place 操作 ==========
  "place.add": {
    operation: "place.add",
    warningMs: 500,
    criticalMs: 2000,
    description: "場所追加",
  },
  "place.update": {
    operation: "place.update",
    warningMs: 500,
    criticalMs: 2000,
    description: "場所更新",
  },
  "place.delete": {
    operation: "place.delete",
    warningMs: 500,
    criticalMs: 2000,
    description: "場所削除",
  },
  "place.search": {
    operation: "place.search",
    warningMs: 1000,
    criticalMs: 3000,
    description: "場所検索",
  },

  // ========== Route 操作 ==========
  "route.calculate": {
    operation: "route.calculate",
    warningMs: 2000,
    criticalMs: 5000,
    description: "ルート計算",
  },
  "route.clear": {
    operation: "route.clear",
    warningMs: 500,
    criticalMs: 1500,
    description: "ルートクリア",
  },

  // ========== Sync 操作 ==========
  "sync.push": {
    operation: "sync.push",
    warningMs: 2000,
    criticalMs: 10000,
    description: "同期プッシュ",
  },
  "sync.pull": {
    operation: "sync.pull",
    warningMs: 2000,
    criticalMs: 10000,
    description: "同期プル",
  },
  "sync.conflict": {
    operation: "sync.conflict",
    warningMs: 1000,
    criticalMs: 3000,
    description: "競合解決",
  },

  // ========== Map 操作 ==========
  "map.load": {
    operation: "map.load",
    warningMs: 3000,
    criticalMs: 10000,
    description: "地図読み込み",
  },
  "map.render": {
    operation: "map.render",
    warningMs: 500,
    criticalMs: 2000,
    description: "地図描画",
  },
  "map.geocode": {
    operation: "map.geocode",
    warningMs: 1000,
    criticalMs: 3000,
    description: "ジオコーディング",
  },

  // ========== UI 操作 ==========
  "ui.render": {
    operation: "ui.render",
    warningMs: 100,
    criticalMs: 500,
    description: "UI レンダリング",
  },
  "ui.interaction": {
    operation: "ui.interaction",
    warningMs: 50,
    criticalMs: 200,
    description: "UI インタラクション",
  },
};

/**
 * 操作名から閾値を取得
 */
export function getThreshold(operation: string): PerformanceThreshold | null {
  return PERFORMANCE_THRESHOLDS[operation] || null;
}

/**
 * 閾値レベルを判定
 */
export function getThresholdLevel(
  operation: string,
  durationMs: number,
): "ok" | "warning" | "critical" {
  const threshold = getThreshold(operation);
  if (!threshold) return "ok";

  if (durationMs >= threshold.criticalMs) return "critical";
  if (durationMs >= threshold.warningMs) return "warning";
  return "ok";
}

/**
 * 全閾値のカテゴリ別取得
 */
export function getThresholdsByCategory(): Record<
  string,
  PerformanceThreshold[]
> {
  const categories: Record<string, PerformanceThreshold[]> = {
    plan: [],
    place: [],
    route: [],
    sync: [],
    map: [],
    ui: [],
  };

  Object.values(PERFORMANCE_THRESHOLDS).forEach((threshold) => {
    const category = threshold.operation.split(".")[0];
    if (categories[category]) {
      categories[category].push(threshold);
    }
  });

  return categories;
}

/**
 * 操作名リテラル型
 */
export type OperationName = keyof typeof PERFORMANCE_THRESHOLDS;

/**
 * 操作別の警告閾値（ミリ秒）
 * Hook/デコレータで使用するシンプルなマッピング
 */
export const OPERATION_THRESHOLDS: Record<string, number> = Object.fromEntries(
  Object.entries(PERFORMANCE_THRESHOLDS).map(([key, value]) => [
    key,
    value.warningMs,
  ]),
);
