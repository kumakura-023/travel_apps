# Phase 3 設計メモ: パフォーマンス計測計画

## 1. 背景と目的

### 背景

マスタープランの成功指標として「Map 描画待ち時間 < 120ms (P95)」が定義されている。Phase 4 の最適化フェーズに先立ち、現状のパフォーマンスベースラインを把握し、計測基盤を整備する必要がある。

現状の課題：

1. **計測ポイントの未定義**: どの操作のどの区間を計測すべきか明確でない
2. **計測手段の散在**: console.time / Performance API / 外部ツールが混在
3. **閾値の未設定**: 「遅い」の基準が曖昧で、劣化検知が困難
4. **Phase 4 への引き継ぎ不備**: 最適化対象の優先度付けができない

### 目的

- Map / Plan 主要操作にパフォーマンス計測フックを追加する
- ベースラインを記録し、Phase 4 最適化の効果測定基盤を構築する
- 閾値超過時のアラート機構を整備する
- Web Vitals との連携により UX 指標を可視化する

## 2. 計測対象の操作一覧

### 2.1 Map 系操作

| 操作 ID | 操作名                  | 計測区間                                          | 目標値 (P95)    | 優先度 |
| ------- | ----------------------- | ------------------------------------------------- | --------------- | ------ |
| MAP-001 | 初期マップ読み込み      | `GoogleMapsLoad` → `FirstOverlayRender`           | < 2000ms        | High   |
| MAP-002 | マーカー描画 (単体)     | `MarkerRenderStart` → `MarkerRenderEnd`           | < 50ms          | Medium |
| MAP-003 | マーカー描画 (一括)     | `BatchMarkerStart` → `AllMarkersRendered`         | < 200ms (100件) | High   |
| MAP-004 | ルート描画              | `RouteCalculationStart` → `RoutePolylineRendered` | < 500ms         | High   |
| MAP-005 | TravelTime オーバーレイ | `TravelTimeCalcStart` → `OverlayRendered`         | < 300ms         | Medium |
| MAP-006 | ラベルオーバーレイ      | `LabelRenderStart` → `LabelRenderEnd`             | < 100ms         | Low    |
| MAP-007 | パン/ズーム応答         | `UserInteractionStart` → `RenderComplete`         | < 100ms         | High   |
| MAP-008 | Geocoding               | `GeocodeRequest` → `GeocodeResponse`              | < 800ms         | Medium |

### 2.2 Plan 系操作

| 操作 ID  | 操作名         | 計測区間                                   | 目標値 (P95) | 優先度 |
| -------- | -------------- | ------------------------------------------ | ------------ | ------ |
| PLAN-001 | プラン読み込み | `PlanLoadStart` → `PlanLoadComplete`       | < 500ms      | High   |
| PLAN-002 | プラン切り替え | `PlanSwitchStart` → `UIUpdated`            | < 800ms      | High   |
| PLAN-003 | プラン保存     | `PlanSaveStart` → `PlanSaveComplete`       | < 1000ms     | Medium |
| PLAN-004 | プラン作成     | `PlanCreateStart` → `PlanCreateComplete`   | < 1500ms     | Medium |
| PLAN-005 | 場所追加       | `PlaceAddStart` → `PlaceAddComplete`       | < 200ms      | High   |
| PLAN-006 | 場所削除       | `PlaceDeleteStart` → `PlaceDeleteComplete` | < 200ms      | Medium |
| PLAN-007 | ラベル更新     | `LabelUpdateStart` → `LabelUpdateComplete` | < 150ms      | Low    |

### 2.3 Sync 系操作

| 操作 ID  | 操作名                | 計測区間                                  | 目標値 (P95) | 優先度 |
| -------- | --------------------- | ----------------------------------------- | ------------ | ------ |
| SYNC-001 | Firestore 同期 (受信) | `RemoteUpdateReceived` → `StoreUpdated`   | < 300ms      | High   |
| SYNC-002 | Firestore 同期 (送信) | `LocalChangeDetected` → `RemoteConfirmed` | < 500ms      | High   |
| SYNC-003 | 衝突解決              | `ConflictDetected` → `ConflictResolved`   | < 1000ms     | Medium |
| SYNC-004 | 初期同期              | `SyncInitStart` → `SyncInitComplete`      | < 2000ms     | High   |

### 2.4 UI 系操作

| 操作 ID | 操作名           | 計測区間                            | 目標値 (P95) | 優先度 |
| ------- | ---------------- | ----------------------------------- | ------------ | ------ |
| UI-001  | BottomSheet 開閉 | `SheetToggle` → `AnimationComplete` | < 300ms      | Medium |
| UI-002  | PlaceDetail 表示 | `DetailOpen` → `ContentRendered`    | < 200ms      | Medium |
| UI-003  | 検索結果表示     | `SearchSubmit` → `ResultsRendered`  | < 500ms      | High   |

## 3. 計測フックの実装方針

### 3.1 計測インターフェース

```typescript
// src/telemetry/PerformanceMonitor.ts

export interface PerformanceMeasurement {
  operationId: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  markers?: PerformanceMarker[];
}

export interface PerformanceMarker {
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMonitor {
  // 計測開始
  startMeasurement(
    operationId: string,
    metadata?: Record<string, unknown>,
  ): void;

  // 中間マーカー
  addMarker(
    operationId: string,
    markerName: string,
    metadata?: Record<string, unknown>,
  ): void;

  // 計測終了
  endMeasurement(
    operationId: string,
    metadata?: Record<string, unknown>,
  ): PerformanceMeasurement;

  // 閾値チェック
  checkThreshold(measurement: PerformanceMeasurement): ThresholdResult;

  // メトリクス送信
  reportMetrics(measurement: PerformanceMeasurement): Promise<void>;
}
```

### 3.2 Hook 実装

```typescript
// src/telemetry/hooks/usePerformance.ts

export function usePerformance(operationId: string) {
  const monitor = useService<PerformanceMonitor>("PerformanceMonitor");
  const measurementRef = useRef<string | null>(null);

  const start = useCallback(
    (metadata?: Record<string, unknown>) => {
      const id = `${operationId}-${Date.now()}`;
      measurementRef.current = id;
      monitor.startMeasurement(id, { operationId, ...metadata });
      return id;
    },
    [operationId, monitor],
  );

  const mark = useCallback(
    (markerName: string, metadata?: Record<string, unknown>) => {
      if (measurementRef.current) {
        monitor.addMarker(measurementRef.current, markerName, metadata);
      }
    },
    [monitor],
  );

  const end = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (measurementRef.current) {
        const measurement = monitor.endMeasurement(
          measurementRef.current,
          metadata,
        );
        const result = monitor.checkThreshold(measurement);

        if (result.exceeded) {
          console.warn(
            `[Performance] ${operationId} exceeded threshold:`,
            result,
          );
        }

        monitor.reportMetrics(measurement);
        measurementRef.current = null;
        return measurement;
      }
      return null;
    },
    [operationId, monitor],
  );

  return { start, mark, end };
}
```

### 3.3 デコレータ実装（サービス向け）

```typescript
// src/telemetry/decorators/measured.ts

export function measured(operationId: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const measurementId = `${operationId}-${Date.now()}`;

      monitor.startMeasurement(measurementId, {
        operationId,
        method: propertyKey,
        argsCount: args.length,
      });

      try {
        const result = await originalMethod.apply(this, args);
        monitor.endMeasurement(measurementId, { status: "success" });
        return result;
      } catch (error) {
        monitor.endMeasurement(measurementId, {
          status: "error",
          errorCode: (error as AppError)?.code,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

// 使用例
class UnifiedPlanService {
  @measured("PLAN-001")
  async load(planId: string): Promise<PlanSnapshot> {
    // ...
  }
}
```

### 3.4 自動計測（EventBus 連携）

```typescript
// src/telemetry/subscribers/PerformanceEventSubscriber.ts

export class PerformanceEventSubscriber {
  private readonly activeMeasurements = new Map<string, string>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly monitor: PerformanceMonitor,
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    // Plan イベント
    this.eventBus.on("plan.plan/loadStart", (e) => this.startPlanLoad(e));
    this.eventBus.on("plan.plan/loaded", (e) => this.endPlanLoad(e));

    // Map イベント
    this.eventBus.on("map.overlay/renderStart", (e) =>
      this.startOverlayRender(e),
    );
    this.eventBus.on("map.overlay/rendered", (e) => this.endOverlayRender(e));

    // Route イベント
    this.eventBus.on("route.route/calculationStart", (e) =>
      this.startRouteCalc(e),
    );
    this.eventBus.on("route.route/calculated", (e) => this.endRouteCalc(e));
  }

  // ... 各メソッド実装
}
```

## 4. 目標値とアラート閾値

### 4.1 閾値定義

```typescript
// src/telemetry/thresholds.ts

export interface ThresholdConfig {
  warning: number; // 警告閾値 (ms)
  critical: number; // 重大閾値 (ms)
  target: number; // 目標値 (P95, ms)
}

export const PERFORMANCE_THRESHOLDS: Record<string, ThresholdConfig> = {
  // Map 系
  "MAP-001": { warning: 1500, critical: 2000, target: 2000 },
  "MAP-002": { warning: 40, critical: 50, target: 50 },
  "MAP-003": { warning: 150, critical: 200, target: 200 },
  "MAP-004": { warning: 400, critical: 500, target: 500 },
  "MAP-005": { warning: 250, critical: 300, target: 300 },
  "MAP-006": { warning: 80, critical: 100, target: 100 },
  "MAP-007": { warning: 80, critical: 100, target: 100 },
  "MAP-008": { warning: 600, critical: 800, target: 800 },

  // Plan 系
  "PLAN-001": { warning: 400, critical: 500, target: 500 },
  "PLAN-002": { warning: 600, critical: 800, target: 800 },
  "PLAN-003": { warning: 800, critical: 1000, target: 1000 },
  "PLAN-004": { warning: 1200, critical: 1500, target: 1500 },
  "PLAN-005": { warning: 150, critical: 200, target: 200 },
  "PLAN-006": { warning: 150, critical: 200, target: 200 },
  "PLAN-007": { warning: 120, critical: 150, target: 150 },

  // Sync 系
  "SYNC-001": { warning: 250, critical: 300, target: 300 },
  "SYNC-002": { warning: 400, critical: 500, target: 500 },
  "SYNC-003": { warning: 800, critical: 1000, target: 1000 },
  "SYNC-004": { warning: 1500, critical: 2000, target: 2000 },

  // UI 系
  "UI-001": { warning: 250, critical: 300, target: 300 },
  "UI-002": { warning: 150, critical: 200, target: 200 },
  "UI-003": { warning: 400, critical: 500, target: 500 },
};
```

### 4.2 アラート設定

| アラートレベル | 条件                                   | 通知先                         | 対応 SLA |
| -------------- | -------------------------------------- | ------------------------------ | -------- |
| Warning        | `duration > warning` が 5分間で 10% 超 | Slack #perf-alerts             | 1 営業日 |
| Critical       | `duration > critical` が 5分間で 5% 超 | Slack #perf-alerts + PagerDuty | 4 時間   |
| Emergency      | `duration > critical * 2` が発生       | PagerDuty + 電話               | 即時     |

### 4.3 ダッシュボード指標

| 指標名                          | 説明             | 表示形式              |
| ------------------------------- | ---------------- | --------------------- |
| `perf.{operationId}.p50`        | 50パーセンタイル | 時系列グラフ          |
| `perf.{operationId}.p95`        | 95パーセンタイル | 時系列グラフ + 目標線 |
| `perf.{operationId}.p99`        | 99パーセンタイル | 時系列グラフ          |
| `perf.{operationId}.count`      | 操作実行回数     | カウンター            |
| `perf.{operationId}.error_rate` | エラー率         | パーセンテージ        |
| `perf.threshold.exceeded_count` | 閾値超過数       | ヒートマップ          |

## 5. Web Vitals 連携

### 5.1 Core Web Vitals 計測

```typescript
// src/telemetry/webVitals.ts

import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from "web-vitals";

export function initWebVitalsReporting(reportFn: (metric: Metric) => void) {
  onCLS(reportFn);
  onFID(reportFn);
  onLCP(reportFn);
  onFCP(reportFn);
  onTTFB(reportFn);
  onINP(reportFn);
}

export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};
```

### 5.2 カスタム Web Vitals（Map 特化）

```typescript
// src/telemetry/mapVitals.ts

export interface MapVitals {
  // Map 読み込み完了までの時間
  MLC: number; // Map Load Complete

  // 最初のマーカー描画までの時間
  FMP: number; // First Marker Paint

  // インタラクション可能になるまでの時間
  MTI: number; // Map Time to Interactive

  // オーバーレイ完全描画までの時間
  ORC: number; // Overlay Render Complete
}

export const MAP_VITALS_THRESHOLDS: Record<
  keyof MapVitals,
  { good: number; needsImprovement: number }
> = {
  MLC: { good: 1500, needsImprovement: 2500 },
  FMP: { good: 500, needsImprovement: 1000 },
  MTI: { good: 2000, needsImprovement: 3500 },
  ORC: { good: 1000, needsImprovement: 2000 },
};
```

## 6. 実装ロードマップ

### Week 1: 基盤整備

| ID    | タスク                                  | 成果物                                | 担当      |
| ----- | --------------------------------------- | ------------------------------------- | --------- |
| P3-P1 | PerformanceMonitor インターフェース定義 | `src/telemetry/PerformanceMonitor.ts` | Architect |
| P3-P2 | 閾値定義ファイル作成                    | `src/telemetry/thresholds.ts`         | Architect |
| P3-P3 | ServiceContainer へ登録                 | `registerTelemetryServices()`         | FE Lead   |
| P3-P4 | Web Vitals 初期化                       | `src/telemetry/webVitals.ts`          | FE Lead   |

### Week 2: Hook / Decorator 実装

| ID    | タスク                          | 成果物                                                    | 担当    |
| ----- | ------------------------------- | --------------------------------------------------------- | ------- |
| P3-P5 | usePerformance Hook 実装        | `src/telemetry/hooks/usePerformance.ts`                   | FE Lead |
| P3-P6 | @measured デコレータ実装        | `src/telemetry/decorators/measured.ts`                    | FE Lead |
| P3-P7 | PerformanceEventSubscriber 実装 | `src/telemetry/subscribers/PerformanceEventSubscriber.ts` | FE Lead |

### Week 3: サービス適用

| ID     | タスク                  | 成果物                                             | 担当         |
| ------ | ----------------------- | -------------------------------------------------- | ------------ |
| P3-P8  | Map 系操作への計測追加  | `MapOverlayManager` / `MapInteractionService` 改修 | FE Lead      |
| P3-P9  | Plan 系操作への計測追加 | `UnifiedPlanService` / `PlanCoordinator` 改修      | FE Lead      |
| P3-P10 | Sync 系操作への計測追加 | `SyncManager` 改修                                 | Backend Lead |

### Week 4: ダッシュボード / アラート

| ID     | タスク                     | 成果物                 | 担当 |
| ------ | -------------------------- | ---------------------- | ---- |
| P3-P11 | メトリクス送信実装         | Telemetry backend 連携 | SRE  |
| P3-P12 | Grafana ダッシュボード作成 | Performance Dashboard  | SRE  |
| P3-P13 | アラートルール設定         | Alertmanager 設定      | SRE  |
| P3-P14 | ベースライン記録           | 初期計測レポート       | QA   |

## 7. ベースライン計測計画

### 7.1 計測環境

| 環境            | 用途             | デバイス                | ネットワーク        |
| --------------- | ---------------- | ----------------------- | ------------------- |
| Lab             | 一貫性のある計測 | MacBook Pro M2 / Chrome | Fast 4G (100ms RTT) |
| Field (Staging) | 実環境に近い計測 | 各種デバイス            | 実ネットワーク      |
| Synthetic       | CI パイプライン  | GitHub Actions Runner   | Simulated           |

### 7.2 計測シナリオ

| シナリオ                | 操作手順                         | 計測ポイント                |
| ----------------------- | -------------------------------- | --------------------------- |
| 新規ユーザー初回起動    | 認証 → プラン作成 → 場所追加     | MAP-001, PLAN-004, PLAN-005 |
| 既存ユーザープラン閲覧  | ログイン → プラン選択 → 地図表示 | PLAN-001, PLAN-002, MAP-003 |
| ルート計画作成          | 場所追加 × 5 → ルート計算        | PLAN-005, MAP-004, MAP-005  |
| 共同編集                | 2ユーザー同時編集                | SYNC-001, SYNC-002          |
| オフライン → オンライン | オフライン操作 → 再接続同期      | SYNC-004                    |

### 7.3 ベースライン目標

Phase 3 終了時点で以下を達成：

| 指標               | 目標                          |
| ------------------ | ----------------------------- |
| 計測カバレッジ     | 主要操作の 100%               |
| ベースラインデータ | 各操作 1000 サンプル以上      |
| P95 把握           | 全操作で P95 が測定可能       |
| アラート稼働       | Critical 閾値超過時に通知発生 |

## 8. リスクと緩和策

| リスク             | 影響               | 緩和策                                    |
| ------------------ | ------------------ | ----------------------------------------- |
| 計測オーバーヘッド | パフォーマンス劣化 | サンプリング率調整（本番 10%、開発 100%） |
| メトリクス量過多   | ストレージコスト増 | 集計済みメトリクスのみ長期保存            |
| 閾値設定ミス       | 誤アラート多発     | 2週間の Learning Period でチューニング    |
| 環境差異           | 計測結果の比較困難 | Lab 環境を標準とし、Field は参考値        |

## 9. Phase 4 への引き継ぎ

Phase 3 終了時に以下を Phase 4 へ引き継ぐ：

1. **ベースラインレポート**: 全操作の P50 / P95 / P99 値
2. **ボトルネック分析**: 閾値超過頻度の高い操作トップ5
3. **最適化優先度リスト**: 影響度 × 改善余地でランク付け
4. **計測ダッシュボード**: Grafana への読み取りアクセス

## 10. Review Checklist

- [ ] 計測対象が主要ユーザーシナリオをカバーしているか
- [ ] 閾値が現実的かつ達成可能か
- [ ] 計測オーバーヘッドが許容範囲内か
- [ ] アラート設定が運用可能か（誤報少、見逃しなし）
- [ ] Phase 4 最適化のインプットとして十分か
- [ ] Web Vitals との整合性が取れているか

**Approvers**: Architect, FE Lead, SRE, PM

**Due Date**: 2026-03-06

---

更新履歴

- 2026-01-21: 初版作成
