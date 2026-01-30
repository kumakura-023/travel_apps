# Phase 2 設計メモ: UnifiedPlanService / PlanCoordinator / SyncManager サービス境界

## 1. 目的

- UnifiedPlanService / PlanCoordinator / SyncManager 間の責務とインターフェースを文書化し、DI 経由の呼び出しに統一する。
- Phase 3 で予定している EventBus / 観測拡張の前提として、Plan 系イベント発火ポイントを定義する。
- UI / Hook / Store 層が `ServiceContainer` 以外の手段でサービスに依存しない状態を確立する。

## 2. 対象スコープ

| コンポーネント | 役割 | Scope 内の作業 |
| --- | --- | --- |
| UnifiedPlanService | Plan CRUD / 差分生成 / ルール適用 | I/F 再定義、呼び出しシナリオ整理 |
| PlanCoordinator | UI アクションを PlanCommand に正規化しサービス連携 | 新規 I/F 定義、DI 配線案 |
| SyncManager | Firestore/Realtime 同期、衝突解決 | Plan channel の契約整理、イベント伝播経路の明文化 |
| PlanEventPublisher | EventBus への橋渡し | 新規作成。Phase3 計測ポイントの前提 |

## 3. 現状課題（Phase1 時点）

1. UnifiedPlanService が UI hook から直接呼ばれており、PlanCoordinator の責務が曖昧。
2. SyncManager が Plan 用イベントを UI ストア直接更新しており、サービス境界が崩れている。
3. DI 登録キーが統一されておらず、テストでモック差し替えが複雑。
4. イベント発火箇所の観測ができず、トレーシングが困難。

## 4. インターフェース案

| I/F | 主要メソッド (擬似シグネチャ) | 備考 |
| --- | --- | --- |
| `IUnifiedPlanService` | `load(planId): Promise<PlanSnapshot>`<br>`applyCommand(command: PlanCommand): Promise<PlanResult>`<br>`generateSyncIntent(planId, target): SyncIntent` | PlanResult は `snapshot`, `events`, `syncIntent` を含む |
| `IPlanCoordinator` | `handleUserAction(action: PlanUiAction): Promise<void>`<br>`subscribe(listener: (event: PlanUiUpdate) => void)` | UI から唯一の入口。内部で services を解決 |
| `ISyncManager` | `registerChannel(channelId, handler)`<br>`publish(channelId, payload)`<br>`onRemoteUpdate(channelId, callback)` | Plan 用チャネルを `plan-sync` に固定 |
| `PlanEventPublisher` | `emit(event: PlanDomainEvent)` | EventBus 経由で計測・監視を行う薄層 |

### 呼び出しフロー（ターゲット）
1. UI hook (`usePlanEditor`) が PlanCoordinator を DI で取得し、ユーザー操作を `PlanUiAction` として送信。
2. PlanCoordinator が Action を `PlanCommand` に変換し、UnifiedPlanService に委譲。
3. UnifiedPlanService が結果 (`PlanSnapshot`, `PlanEvents`, `SyncIntent`) を返却。
4. PlanCoordinator が Snapshot を UI Store に通知し、必要なイベントを `PlanEventPublisher` へ渡す。
5. SyncIntent が存在する場合は SyncManager へ渡して送信し、リモート更新は逆方向に同じ経路で UI まで伝播。

## 5. ServiceContainer / DI ポリシー

- `registerPlanServices(container)` を Phase2 で刷新し、以下を登録:
  - `container.registerSingleton('IUnifiedPlanService', UnifiedPlanService)`
  - `container.registerSingleton('IPlanCoordinator', (c) => new PlanCoordinator(c.resolve('IUnifiedPlanService'), c.resolve('ISyncManager'), c.resolve('PlanEventPublisher')))`
  - `container.registerSingleton('PlanEventPublisher', (c) => new PlanEventPublisher(c.resolve('EventBus')))`
- Hook/Store からの取得は `getPlanCoordinator()` 等の getter 経由のみ許可。
- Storybook / unit test 用に `createPlanTestContainer(overrides)` を提供し、任意の I/F をモック差し替え可能にする。

## 6. タスク一覧

| ID | タスク | 内容 | 成果物 | 担当 | 期限目安 | ステータス |
| --- | --- | --- | --- | --- | --- | --- |
| P2-S1 | サービス境界ドラフト | 本ドキュメント初版 | `docs/refactoring/phase2/service-boundary-plan.md` | Architect | 2026-01-24 | ✅ 完了 |
| P2-S2 | I/F レビュー | 命名・例外ポリシー承認 | レビュー議事録 + 反映版 | Tech Lead | 2026-01-27 | ✅ 承認済み |
| P2-S3 | DI 登録ガイド | `registerPlanServices` 刷新手順 | 本ドキュメント追記 or 別紙 | FE Lead | 2026-01-30 | ✅ 反映済み |
| P2-S6 | リスク棚卸し | Phase2 リスク更新 | 本ドキュメント Risk 節 | Architect | 2026-02-02 | ✅ 更新済み |
| P2-S7 | Master Plan 更新 | Phase2 セクション更新 | `docs/refactoring/refactoring-plan-20260120.md` | PM | 2026-02-03 | ✅ 連動済み |

## 7. リスク & 緩和策

| リスク | 影響 | 緩和策 |
| --- | --- | --- |
| I/F 更新で既存呼び出しが破綻 | UI ビルド失敗 | 互換ラッパーをフェーズ中維持し ESLint で監視 |
| SyncManager が複数ドメイン共通のため計画が複雑 | スケジュール遅延 | Plan channel を専用化し、他ドメインは Phase3 以降に分離 |
| EventBus emit タイミングが未定 | Phase3 依存タスクへ影響 | 本フェーズで最低限のイベント列挙と payload 契約を確定 |

## 8. レビュー/承認フロー

1. 2026-01-24: Draft を関係者へ共有
2. 2026-01-27: I/F レビュー会で命名/例外ポリシーを凍結
3. 2026-01-30: DI ガイド承認後、マスタープランリンク更新
4. Phase2 実装前に PM 承認を取得

---
更新履歴
- 2026-01-20: 初版作成
