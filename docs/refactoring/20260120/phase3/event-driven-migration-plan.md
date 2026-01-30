# Phase 3 設計メモ: EventBus 統一化計画

## 1. 背景と目的

### 背景

Phase 0-2 を通じて、`ServiceContainer` による DI 統合と `PlanCoordinator` / `MapOverlayManager` のサービス境界整理が完了した。しかし、以下の課題が残存している：

1. **ストア直接更新の散在**: `savedPlacesStore` / `routeStore` / `labelsStore` が UI コンポーネントやサービスから直接更新されており、副作用の発生ポイントが分散している。
2. **イベント駆動の不徹底**: `EventBus` は存在するが、`PlanEventPublisher` 経由の Plan イベントのみが整備されており、Place/Route/Sync の各ドメインでは旧来のコールバック方式が混在している。
3. **副作用の追跡困難**: 通知作成・ラベル同期・ルート再計算などの副作用がストアアクション内に埋め込まれており、デバッグや監視が困難。

### 目的

- `EventBus` を経由した通知に統一し、ストア更新時の副作用をサービス層へ移行する。
- 全ドメイン（Plan / Place / Route / Sync / Map）でイベント駆動アーキテクチャを確立する。
- Phase 4 の最適化・監視拡充の前提となる観測可能性を確保する。

## 2. 対象スコープ

| コンポーネント      | 現状                                                            | Phase 3 での変更                                               |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| `savedPlacesStore`  | `addPlace` 内で `PlaceEventBus.emit` + Firestore 更新を直接実行 | イベント発火のみ行い、副作用は `PlaceEventSubscriber` で処理   |
| `routeStore`        | イベント未使用、直接ストア更新                                  | `RouteEventPublisher` を導入し、ルート変更をイベント経由で通知 |
| `labelsStore`       | `PlanCoordinator.updateStores` から直接更新                     | `LabelSyncSubscriber` がイベントを購読して更新                 |
| `notificationStore` | `PlanCoordinator` 内で直接 `addNotification` 呼び出し           | `NotificationEventSubscriber` がイベントを購読                 |
| `SyncManager`       | Plan channel 固定、UI ストア直接更新                            | イベント経由で各サービスへ通知を伝播                           |

## 3. 現在のストア直接更新箇所の洗い出し

### 3.1 savedPlacesStore

```
src/store/savedPlacesStore.ts
├── addPlace() 内
│   ├── PlaceEventBus.emitPlaceAdded() ✅ イベント発火済み
│   ├── planService.updateLastActionPosition() ← 副作用
│   └── console.log による通知ロジック ← 副作用（移行対象）
├── updatePlace() 内
│   └── PlaceEventBus.emitPlaceUpdated() ✅ イベント発火済み
└── deletePlace() 内
    └── PlaceEventBus.emitPlaceDeleted() ✅ イベント発火済み
```

**移行対象**:

- `updateLastActionPosition` 呼び出し → `PlaceEventSubscriber` へ
- 通知ロジック → `NotificationEventSubscriber` へ

### 3.2 routeStore

```
src/store/routeStore.ts
├── addRoute() ← イベント未発火
├── removeRoute() ← イベント未発火
├── addConnection() ← イベント未発火
└── removeConnection() ← イベント未発火
```

**移行対象**:

- 全アクションに `RouteEventPublisher` 経由のイベント発火を追加

### 3.3 PlanCoordinator.updateStores

```
src/coordinators/PlanCoordinator.ts
├── updateStores(plan) 内
│   ├── usePlanStore.setState() ← 直接更新
│   ├── useSavedPlacesStore.setState() ← 直接更新
│   ├── useLabelsStore.setState() ← 直接更新
│   └── notificationStore.addNotification() ← 副作用埋め込み
```

**移行対象**:

- ストア更新はイベント発火に置換
- 各 Subscriber がイベントを購読してストアを更新

### 3.4 SyncManager

```
src/services/SyncManager.ts
├── onRemoteUpdate() ← UI ストア直接更新（Phase 2 時点で指摘済み）
```

**移行対象**:

- `SyncEventPublisher` を導入し、リモート更新をイベント経由で通知

## 4. イベント駆動への移行設計

### 4.1 ドメインイベント定義

#### Place Events（既存を拡張）

```typescript
// src/events/PlaceEvents.ts - 既存
export type PlaceEventType =
  | "place:added"
  | "place:updated"
  | "place:deleted"
  // 新規追加
  | "place:syncRequested"
  | "place:syncCompleted"
  | "place:syncFailed";

export interface PlaceAddedPayload {
  place: Place;
  source: "user" | "import" | "sync";
  planId: string;
}
```

#### Route Events（新規）

```typescript
// src/application/events/RouteEvents.ts - 新規
export type RouteEventType =
  | "route:calculated"
  | "route:removed"
  | "route:connectionAdded"
  | "route:connectionRemoved"
  | "route:cleared";

export interface RouteCalculatedPayload {
  routeId: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  durationMs: number;
  distanceMeters: number;
  travelMode: string;
}
```

#### Sync Events（新規）

```typescript
// src/application/events/SyncEvents.ts - 新規
export type SyncEventType =
  | "sync:started"
  | "sync:completed"
  | "sync:failed"
  | "sync:conflictDetected"
  | "sync:remoteUpdateReceived";

export interface SyncRemoteUpdatePayload {
  channel: "plan" | "place" | "route";
  entityId: string;
  changeType: "create" | "update" | "delete";
  payload: unknown;
  timestamp: Date;
}
```

### 4.2 イベント発行者（Publishers）

| Publisher             | 責務                              | 発火イベント                                      |
| --------------------- | --------------------------------- | ------------------------------------------------- |
| `PlanEventPublisher`  | Plan ドメインイベント発火（既存） | `plan:loaded`, `plan:switched`, etc.              |
| `PlaceEventPublisher` | Place 変更イベント発火            | `place:added`, `place:updated`, `place:deleted`   |
| `RouteEventPublisher` | Route 計算・接続イベント発火      | `route:calculated`, `route:connectionAdded`, etc. |
| `SyncEventPublisher`  | 同期状態イベント発火              | `sync:started`, `sync:remoteUpdateReceived`, etc. |

### 4.3 イベント購読者（Subscribers）

| Subscriber                   | 購読イベント                                        | 副作用                            |
| ---------------------------- | --------------------------------------------------- | --------------------------------- |
| `PlacePersistenceSubscriber` | `place:added`, `place:updated`, `place:deleted`     | Firestore/LocalStorage への永続化 |
| `PlacePositionSubscriber`    | `place:added`                                       | `lastActionPosition` の更新       |
| `NotificationSubscriber`     | `place:added` (remote), `sync:remoteUpdateReceived` | ユーザー通知の作成                |
| `LabelSyncSubscriber`        | `plan:loaded`, `plan:switched`                      | `labelsStore` の同期              |
| `RouteCacheSubscriber`       | `route:calculated`, `route:removed`                 | ルートキャッシュ管理              |
| `TelemetrySubscriber`        | 全イベント（ワイルドカード）                        | メトリクス収集・ログ出力          |

### 4.4 移行後のデータフロー

```
[UI Action]
    ↓
[Service / Coordinator]
    ↓
[Store Action] → 状態更新のみ（副作用なし）
    ↓
[EventPublisher.emit()] → EventBus へイベント発火
    ↓
[EventBus]
    ↓
[Subscriber A] → 永続化
[Subscriber B] → 通知作成
[Subscriber C] → メトリクス収集
```

## 5. 移行ステップ

### Step 1: イベント基盤拡充（Week 1）

| ID    | タスク                     | 成果物                                                | 担当         |
| ----- | -------------------------- | ----------------------------------------------------- | ------------ |
| P3-E1 | `RouteEventTypes.ts` 作成  | `src/application/events/types/RouteEventTypes.ts`     | FE Lead      |
| P3-E2 | `SyncEventTypes.ts` 作成   | `src/application/events/types/SyncEventTypes.ts`      | Backend Lead |
| P3-E3 | `RouteEventPublisher` 実装 | `src/application/events/RouteEventPublisher.ts`       | FE Lead      |
| P3-E4 | `SyncEventPublisher` 実装  | `src/application/events/SyncEventPublisher.ts`        | Backend Lead |
| P3-E5 | EventBus 型拡張            | `EventNames` / `EventPayloads` にドメインイベント追加 | Architect    |

### Step 2: Subscriber 実装（Week 2）

| ID     | タスク                              | 成果物                                                      | 担当      |
| ------ | ----------------------------------- | ----------------------------------------------------------- | --------- |
| P3-E6  | `PlacePersistenceSubscriber` 実装   | `src/application/subscribers/PlacePersistenceSubscriber.ts` | FE Lead   |
| P3-E7  | `NotificationSubscriber` 実装       | `src/application/subscribers/NotificationSubscriber.ts`     | FE Lead   |
| P3-E8  | `LabelSyncSubscriber` 実装          | `src/application/subscribers/LabelSyncSubscriber.ts`        | FE Lead   |
| P3-E9  | `TelemetrySubscriber` 実装          | `src/application/subscribers/TelemetrySubscriber.ts`        | SRE       |
| P3-E10 | ServiceContainer へ Subscriber 登録 | `registerEventSubscribers()` 関数追加                       | Architect |

### Step 3: ストア副作用の移行（Week 3）

| ID     | タスク                                    | 成果物                                           | 担当         |
| ------ | ----------------------------------------- | ------------------------------------------------ | ------------ |
| P3-E11 | `savedPlacesStore` 副作用除去             | 副作用を Subscriber へ移行、ストアは状態更新のみ | FE Lead      |
| P3-E12 | `routeStore` イベント発火追加             | 各アクションに `RouteEventPublisher.emit()` 追加 | FE Lead      |
| P3-E13 | `PlanCoordinator.updateStores` リファクタ | 直接更新をイベント発火に置換                     | Architect    |
| P3-E14 | `SyncManager` イベント経由化              | リモート更新を `SyncEventPublisher` 経由に変更   | Backend Lead |

### Step 4: 検証・ロールバック準備（Week 4）

| ID     | タスク                    | 成果物                                    | 担当    |
| ------ | ------------------------- | ----------------------------------------- | ------- |
| P3-E15 | イベントフロー E2E テスト | `__tests__/e2e/event-flow.spec.ts`        | QA      |
| P3-E16 | Feature Flag 設計         | `useEventDrivenMode` フラグによる新旧切替 | FE Lead |
| P3-E17 | ロールバック手順書        | `docs/runbooks/event-rollback.md`         | SRE     |
| P3-E18 | カナリアリリース計画      | 10% → 50% → 100% のロールアウト手順       | PM      |

## 6. 影響範囲

### 6.1 影響を受けるコンポーネント

| レイヤー    | 影響ファイル          | 変更内容                       |
| ----------- | --------------------- | ------------------------------ |
| Store       | `savedPlacesStore.ts` | 副作用除去、イベント発火追加   |
| Store       | `routeStore.ts`       | イベント発火追加               |
| Store       | `labelsStore.ts`      | Subscriber 経由での更新に変更  |
| Coordinator | `PlanCoordinator.ts`  | `updateStores` のイベント化    |
| Service     | `SyncManager.ts`      | イベント発火追加               |
| Events      | 新規ファイル多数      | Publisher / Subscriber / Types |

### 6.2 後方互換性

- **移行期間中**: Feature Flag (`useEventDrivenMode`) で新旧モードを切替可能
- **旧モード**: 既存のコールバック方式を維持
- **新モード**: イベント駆動方式を使用

## 7. リスクと緩和策

| リスク               | 影響                 | 緩和策                                                                    |
| -------------------- | -------------------- | ------------------------------------------------------------------------- |
| イベント順序の不整合 | 状態不整合、競合条件 | イベントに `timestamp` / `sequenceNumber` を付与し、Subscriber で順序検証 |
| Subscriber 処理遅延  | UI 応答性低下        | クリティカルパスの Subscriber は同期実行、非クリティカルは非同期キュー    |
| イベント欠落         | データ同期失敗       | `TelemetrySubscriber` で全イベントをログ、欠落検知アラート設定            |
| 旧実装との競合       | 二重処理、データ破損 | Feature Flag で完全切替、中間状態を許容しない                             |
| テスト複雑化         | 品質低下             | イベント発火をモック可能な設計、契約テストの導入                          |

## 8. 成功指標

| 指標                   | 目標値     | 測定方法                                 |
| ---------------------- | ---------- | ---------------------------------------- |
| ストア内副作用行数     | 0 行       | 静的解析（ESLint カスタムルール）        |
| イベント発火カバレッジ | 100%       | 全ストアアクションがイベント発火すること |
| Subscriber 処理遅延    | P95 < 50ms | Telemetry で測定                         |
| イベント欠落率         | < 0.01%    | ログ分析                                 |
| E2E テスト成功率       | 100%       | CI パイプライン                          |

## 9. Review Checklist

- [ ] 全ドメイン（Plan / Place / Route / Sync）のイベント型が定義されているか
- [ ] Publisher / Subscriber の責務分離が明確か
- [ ] ストアから副作用が完全に除去される設計になっているか
- [ ] Feature Flag によるロールバック可能性が確保されているか
- [ ] Telemetry / 監視との連携が Phase 4 要件を満たすか
- [ ] 後方互換性とマイグレーションパスが現実的か

**Approvers**: Architect, FE Lead, SRE, PM

**Due Date**: 2026-02-20

---

更新履歴

- 2026-01-21: 初版作成
