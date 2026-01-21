# Phase 3 タスク分解

## 概要

Phase 3「イベント駆動と監視拡充」の詳細タスク一覧。Phase 0-2 と同様のフォーマットで、各タスクに ID / 内容 / 成果物 / 期限を記載する。

**期間**: 2026-02-03 〜 2026-03-06（5週間）

**ゴール**:

1. EventBus を経由した通知に統一し、savedPlacesStore・routeStore 更新時の副作用をサービスへ移行
2. エラーハンドリング規約（AppError, ErrorCode）を Sync/Map/Plan 各サービスへ適用
3. パフォーマンス計測フックを Map/Plan 主要操作へ追加し、Phase 4 の最適化に備える

---

## Week 1: イベント基盤拡充 / エラー基盤定義（2026-02-03 〜 2026-02-09）

### イベント駆動基盤

| ID    | タスク                   | 内容                                                                        | 成果物                                            | 担当         | 期限       | ステータス |
| ----- | ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- | ------------ | ---------- | ---------- |
| P3-E1 | RouteEventTypes 定義     | Route ドメインのイベント型（calculated, removed, connectionAdded 等）を定義 | `src/application/events/types/RouteEventTypes.ts` | FE Lead      | 2026-02-04 | ⬜ 未着手  |
| P3-E2 | SyncEventTypes 定義      | Sync ドメインのイベント型（started, completed, failed, conflict 等）を定義  | `src/application/events/types/SyncEventTypes.ts`  | Backend Lead | 2026-02-04 | ⬜ 未着手  |
| P3-E3 | RouteEventPublisher 実装 | RouteEventTypes を発火する Publisher クラス                                 | `src/application/events/RouteEventPublisher.ts`   | FE Lead      | 2026-02-05 | ⬜ 未着手  |
| P3-E4 | SyncEventPublisher 実装  | SyncEventTypes を発火する Publisher クラス                                  | `src/application/events/SyncEventPublisher.ts`    | Backend Lead | 2026-02-05 | ⬜ 未着手  |
| P3-E5 | EventBus 型拡張          | EventNames / EventPayloads に Route / Sync イベントを追加                   | `src/events/EventBus.ts` 改修                     | Architect    | 2026-02-06 | ⬜ 未着手  |

### エラーハンドリング基盤

| ID    | タスク              | 内容                                                               | 成果物                        | 担当         | 期限       | ステータス |
| ----- | ------------------- | ------------------------------------------------------------------ | ----------------------------- | ------------ | ---------- | ---------- |
| P3-H1 | AppError クラス実装 | 統一エラー型、severity / context / cause 対応                      | `src/errors/AppError.ts`      | Architect    | 2026-02-04 | ⬜ 未着手  |
| P3-H2 | ErrorCode 定義      | 全ドメイン（Plan/Place/Route/Sync/Map/Auth/Network）のエラーコード | `src/errors/ErrorCode.ts`     | Architect    | 2026-02-05 | ⬜ 未着手  |
| P3-H3 | ErrorMessages 定義  | ユーザー向けメッセージマッピング（日本語）                         | `src/errors/ErrorMessages.ts` | FE Lead      | 2026-02-06 | ⬜ 未着手  |
| P3-H4 | RetryPolicy 定義    | SyncErrorCode 別のリトライ戦略                                     | `src/errors/RetryPolicy.ts`   | Backend Lead | 2026-02-07 | ⬜ 未着手  |

### パフォーマンス計測基盤

| ID    | タスク                             | 内容                                            | 成果物                                 | 担当      | 期限       | ステータス |
| ----- | ---------------------------------- | ----------------------------------------------- | -------------------------------------- | --------- | ---------- | ---------- |
| P3-P1 | PerformanceMonitor I/F 定義        | 計測インターフェースと基本実装                  | `src/telemetry/PerformanceMonitor.ts`  | Architect | 2026-02-05 | ⬜ 未着手  |
| P3-P2 | 閾値定義ファイル作成               | 全操作の warning / critical / target 値         | `src/telemetry/thresholds.ts`          | Architect | 2026-02-06 | ⬜ 未着手  |
| P3-P3 | ServiceContainer へ Telemetry 登録 | PerformanceMonitor のシングルトン登録           | `registerTelemetryServices()` 関数追加 | FE Lead   | 2026-02-07 | ⬜ 未着手  |
| P3-P4 | Web Vitals 初期化                  | Core Web Vitals + カスタム MapVitals の計測開始 | `src/telemetry/webVitals.ts`           | FE Lead   | 2026-02-09 | ⬜ 未着手  |

---

## Week 2: Subscriber 実装 / エラー適用 / 計測 Hook（2026-02-10 〜 2026-02-16）

### イベント Subscriber

| ID     | タスク                          | 内容                                                              | 成果物                                                      | 担当      | 期限       | ステータス |
| ------ | ------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | --------- | ---------- | ---------- |
| P3-E6  | PlacePersistenceSubscriber 実装 | place:added/updated/deleted を購読し Firestore 永続化             | `src/application/subscribers/PlacePersistenceSubscriber.ts` | FE Lead   | 2026-02-11 | ⬜ 未着手  |
| P3-E7  | NotificationSubscriber 実装     | リモート place:added / sync:remoteUpdateReceived を購読し通知作成 | `src/application/subscribers/NotificationSubscriber.ts`     | FE Lead   | 2026-02-12 | ⬜ 未着手  |
| P3-E8  | LabelSyncSubscriber 実装        | plan:loaded/switched を購読し labelsStore 更新                    | `src/application/subscribers/LabelSyncSubscriber.ts`        | FE Lead   | 2026-02-12 | ⬜ 未着手  |
| P3-E9  | TelemetrySubscriber 実装        | 全イベント（ワイルドカード）を購読しメトリクス/ログ出力           | `src/application/subscribers/TelemetrySubscriber.ts`        | SRE       | 2026-02-13 | ⬜ 未着手  |
| P3-E10 | Subscriber 登録関数             | ServiceContainer 起動時に全 Subscriber を登録                     | `registerEventSubscribers()`                                | Architect | 2026-02-14 | ⬜ 未着手  |

### エラーハンドリング適用

| ID    | タスク                                 | 内容                                | 成果物                                         | 担当         | 期限       | ステータス |
| ----- | -------------------------------------- | ----------------------------------- | ---------------------------------------------- | ------------ | ---------- | ---------- |
| P3-H5 | UnifiedPlanService へ AppError 適用    | 既存 try-catch を AppError でラップ | `src/services/plan/UnifiedPlanService.ts` 改修 | FE Lead      | 2026-02-11 | ⬜ 未着手  |
| P3-H6 | SyncManager へ AppError 適用           | リトライ戦略 + SyncErrorCode 使用   | `src/services/SyncManager.ts` 改修             | Backend Lead | 2026-02-12 | ⬜ 未着手  |
| P3-H7 | MapInteractionService へ AppError 適用 | Google Maps API エラー変換          | `src/services/MapInteractionService.ts` 改修   | FE Lead      | 2026-02-13 | ⬜ 未着手  |
| P3-H8 | PlanCoordinator へ AppError 型ガード   | isAppError 判定とリカバリー処理     | `src/coordinators/PlanCoordinator.ts` 改修     | FE Lead      | 2026-02-14 | ⬜ 未着手  |

### パフォーマンス計測 Hook

| ID    | タスク                          | 内容                             | 成果物                                                    | 担当    | 期限       | ステータス |
| ----- | ------------------------------- | -------------------------------- | --------------------------------------------------------- | ------- | ---------- | ---------- |
| P3-P5 | usePerformance Hook 実装        | React コンポーネント用計測 Hook  | `src/telemetry/hooks/usePerformance.ts`                   | FE Lead | 2026-02-11 | ⬜ 未着手  |
| P3-P6 | @measured デコレータ実装        | サービスメソッド用計測デコレータ | `src/telemetry/decorators/measured.ts`                    | FE Lead | 2026-02-12 | ⬜ 未着手  |
| P3-P7 | PerformanceEventSubscriber 実装 | EventBus イベントから自動計測    | `src/telemetry/subscribers/PerformanceEventSubscriber.ts` | FE Lead | 2026-02-14 | ⬜ 未着手  |

---

## Week 3: ストア副作用移行 / UI エラー / 計測適用（2026-02-17 〜 2026-02-23）

### ストア副作用の移行

| ID     | タスク                                  | 内容                                                                        | 成果物                                     | 担当         | 期限       | ステータス |
| ------ | --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ | ------------ | ---------- | ---------- |
| P3-E11 | savedPlacesStore 副作用除去             | updateLastActionPosition / 通知ロジックを Subscriber へ移行                 | `src/store/savedPlacesStore.ts` 改修       | FE Lead      | 2026-02-18 | ⬜ 未着手  |
| P3-E12 | routeStore イベント発火追加             | addRoute / removeRoute / addConnection 等に RouteEventPublisher.emit() 追加 | `src/store/routeStore.ts` 改修             | FE Lead      | 2026-02-19 | ⬜ 未着手  |
| P3-E13 | PlanCoordinator.updateStores リファクタ | 直接ストア更新をイベント発火に置換、Subscriber 経由で更新                   | `src/coordinators/PlanCoordinator.ts` 改修 | Architect    | 2026-02-20 | ⬜ 未着手  |
| P3-E14 | SyncManager イベント経由化              | onRemoteUpdate を SyncEventPublisher 経由に変更                             | `src/services/SyncManager.ts` 改修         | Backend Lead | 2026-02-20 | ⬜ 未着手  |

### UI エラーハンドリング

| ID     | タスク                           | 内容                                    | 成果物                                 | 担当    | 期限       | ステータス |
| ------ | -------------------------------- | --------------------------------------- | -------------------------------------- | ------- | ---------- | ---------- |
| P3-H9  | ErrorBoundary 実装               | AppError 対応の React ErrorBoundary     | `src/components/ErrorBoundary.tsx`     | FE Lead | 2026-02-18 | ⬜ 未着手  |
| P3-H10 | ErrorNotification コンポーネント | トースト/モーダル表示（severity 別）    | `src/components/ErrorNotification.tsx` | FE Lead | 2026-02-19 | ⬜ 未着手  |
| P3-H11 | useErrorHandler Hook             | コンポーネント用エラーハンドリング Hook | `src/hooks/useErrorHandler.ts`         | FE Lead | 2026-02-20 | ⬜ 未着手  |

### パフォーマンス計測適用

| ID     | タスク                  | 内容                                                        | 成果物           | 担当         | 期限       | ステータス |
| ------ | ----------------------- | ----------------------------------------------------------- | ---------------- | ------------ | ---------- | ---------- |
| P3-P8  | Map 系操作への計測追加  | MapOverlayManager / MapInteractionService に @measured 適用 | 既存ファイル改修 | FE Lead      | 2026-02-18 | ⬜ 未着手  |
| P3-P9  | Plan 系操作への計測追加 | UnifiedPlanService / PlanCoordinator に @measured 適用      | 既存ファイル改修 | FE Lead      | 2026-02-19 | ⬜ 未着手  |
| P3-P10 | Sync 系操作への計測追加 | SyncManager に @measured 適用                               | 既存ファイル改修 | Backend Lead | 2026-02-20 | ⬜ 未着手  |

---

## Week 4: テスト / ロールバック / 監視（2026-02-24 〜 2026-03-02）

### イベント駆動検証

| ID     | タスク                    | 内容                                          | 成果物                             | 担当    | 期限       | ステータス |
| ------ | ------------------------- | --------------------------------------------- | ---------------------------------- | ------- | ---------- | ---------- |
| P3-E15 | イベントフロー E2E テスト | Place 追加 → 永続化 → 通知の E2E シナリオ     | `__tests__/e2e/event-flow.spec.ts` | QA      | 2026-02-25 | ⬜ 未着手  |
| P3-E16 | Feature Flag 設計         | useEventDrivenMode フラグによる新旧モード切替 | `src/features/flags.ts`            | FE Lead | 2026-02-25 | ⬜ 未着手  |
| P3-E17 | ロールバック手順書        | イベント駆動無効化の手順と確認項目            | `docs/runbooks/event-rollback.md`  | SRE     | 2026-02-26 | ⬜ 未着手  |
| P3-E18 | カナリアリリース計画      | 10% → 50% → 100% のロールアウトスケジュール   | `docs/release/phase3-canary.md`    | PM      | 2026-02-27 | ⬜ 未着手  |

### エラーハンドリング検証

| ID     | タスク               | 内容                                        | 成果物                                        | 担当         | 期限       | ステータス |
| ------ | -------------------- | ------------------------------------------- | --------------------------------------------- | ------------ | ---------- | ---------- |
| P3-H12 | AppError 単体テスト  | isRecoverable / toJSON / cause チェーン検証 | `__tests__/errors/AppError.test.ts`           | FE Lead      | 2026-02-25 | ⬜ 未着手  |
| P3-H13 | リトライ戦略テスト   | SyncManager の指数バックオフ動作確認        | `__tests__/services/SyncManager.test.ts`      | Backend Lead | 2026-02-26 | ⬜ 未着手  |
| P3-H14 | ErrorBoundary テスト | fatal / error / warning 表示分岐確認        | `__tests__/components/ErrorBoundary.test.tsx` | FE Lead      | 2026-02-26 | ⬜ 未着手  |
| P3-H15 | Telemetry 連携確認   | エラーログ送信とダッシュボード表示確認      | Staging 環境検証                              | SRE          | 2026-02-27 | ⬜ 未着手  |

### パフォーマンス監視

| ID     | タスク                     | 内容                                                 | 成果物                 | 担当 | 期限       | ステータス |
| ------ | -------------------------- | ---------------------------------------------------- | ---------------------- | ---- | ---------- | ---------- |
| P3-P11 | メトリクス送信実装         | PerformanceMonitor → Telemetry backend 連携          | Telemetry adapter 拡張 | SRE  | 2026-02-25 | ⬜ 未着手  |
| P3-P12 | Grafana ダッシュボード作成 | 操作別 P50/P95/P99 グラフ + 閾値線                   | Performance Dashboard  | SRE  | 2026-02-26 | ⬜ 未着手  |
| P3-P13 | アラートルール設定         | Warning / Critical 閾値超過時の Slack/PagerDuty 通知 | Alertmanager 設定      | SRE  | 2026-02-27 | ⬜ 未着手  |
| P3-P14 | ベースライン記録           | Lab 環境で全操作の初期計測実施                       | 初期計測レポート       | QA   | 2026-02-28 | ⬜ 未着手  |

---

## Week 5: ドキュメント / レビュー / クローズ（2026-03-03 〜 2026-03-06）

### ドキュメント整備

| ID    | タスク                   | 内容                                               | 成果物                                                   | 担当        | 期限       | ステータス |
| ----- | ------------------------ | -------------------------------------------------- | -------------------------------------------------------- | ----------- | ---------- | ---------- |
| P3-D1 | イベント駆動ガイド       | EventBus 利用ルール、Publisher/Subscriber 作成手順 | `docs/guides/event-driven.md`                            | Tech Writer | 2026-03-03 | ⬜ 未着手  |
| P3-D2 | エラーハンドリングガイド | ErrorCode 一覧、メッセージ規約、UI 表示ルール      | `docs/guides/error-handling.md`                          | Tech Writer | 2026-03-04 | ⬜ 未着手  |
| P3-D3 | パフォーマンス計測ガイド | @measured 使用方法、閾値追加手順                   | `docs/guides/performance-monitoring.md`                  | Tech Writer | 2026-03-04 | ⬜ 未着手  |
| P3-D4 | マスタープラン更新       | Phase 3 完了を反映、Phase 4 準備事項追記           | `docs/refactoring/20260120/refactoring-plan-20260120.md` | PM          | 2026-03-05 | ⬜ 未着手  |

### レビュー / 承認

| ID    | タスク                     | 内容                                          | 成果物         | 担当      | 期限       | ステータス |
| ----- | -------------------------- | --------------------------------------------- | -------------- | --------- | ---------- | ---------- |
| P3-R1 | イベント駆動レビュー       | Subscriber 設計 / Feature Flag 運用の最終確認 | レビュー議事録 | Architect | 2026-03-04 | ⬜ 未着手  |
| P3-R2 | エラーハンドリングレビュー | ErrorCode 網羅性 / メッセージ適切性確認       | レビュー議事録 | FE Lead   | 2026-03-05 | ⬜ 未着手  |
| P3-R3 | パフォーマンスレビュー     | 閾値妥当性 / アラート設定確認                 | レビュー議事録 | SRE       | 2026-03-05 | ⬜ 未着手  |
| P3-R4 | Phase 3 クローズ承認       | 全タスク完了確認、Phase 4 開始判断            | 承認記録       | PM        | 2026-03-06 | ⬜ 未着手  |

---

## 成果物一覧

### 新規作成ファイル

| カテゴリ    | ファイルパス                                                | 作成週 |
| ----------- | ----------------------------------------------------------- | ------ |
| Events      | `src/application/events/types/RouteEventTypes.ts`           | Week 1 |
| Events      | `src/application/events/types/SyncEventTypes.ts`            | Week 1 |
| Events      | `src/application/events/RouteEventPublisher.ts`             | Week 1 |
| Events      | `src/application/events/SyncEventPublisher.ts`              | Week 1 |
| Subscribers | `src/application/subscribers/PlacePersistenceSubscriber.ts` | Week 2 |
| Subscribers | `src/application/subscribers/NotificationSubscriber.ts`     | Week 2 |
| Subscribers | `src/application/subscribers/LabelSyncSubscriber.ts`        | Week 2 |
| Subscribers | `src/application/subscribers/TelemetrySubscriber.ts`        | Week 2 |
| Errors      | `src/errors/AppError.ts`                                    | Week 1 |
| Errors      | `src/errors/ErrorCode.ts`                                   | Week 1 |
| Errors      | `src/errors/ErrorMessages.ts`                               | Week 1 |
| Errors      | `src/errors/RetryPolicy.ts`                                 | Week 1 |
| Telemetry   | `src/telemetry/PerformanceMonitor.ts`                       | Week 1 |
| Telemetry   | `src/telemetry/thresholds.ts`                               | Week 1 |
| Telemetry   | `src/telemetry/webVitals.ts`                                | Week 1 |
| Telemetry   | `src/telemetry/hooks/usePerformance.ts`                     | Week 2 |
| Telemetry   | `src/telemetry/decorators/measured.ts`                      | Week 2 |
| Telemetry   | `src/telemetry/subscribers/PerformanceEventSubscriber.ts`   | Week 2 |
| Components  | `src/components/ErrorBoundary.tsx`                          | Week 3 |
| Components  | `src/components/ErrorNotification.tsx`                      | Week 3 |
| Hooks       | `src/hooks/useErrorHandler.ts`                              | Week 3 |
| Features    | `src/features/flags.ts`                                     | Week 4 |
| Docs        | `docs/guides/event-driven.md`                               | Week 5 |
| Docs        | `docs/guides/error-handling.md`                             | Week 5 |
| Docs        | `docs/guides/performance-monitoring.md`                     | Week 5 |
| Docs        | `docs/runbooks/event-rollback.md`                           | Week 4 |
| Docs        | `docs/release/phase3-canary.md`                             | Week 4 |

### 改修ファイル

| ファイルパス                              | 改修内容                                                  | 改修週   |
| ----------------------------------------- | --------------------------------------------------------- | -------- |
| `src/events/EventBus.ts`                  | EventNames / EventPayloads 拡張                           | Week 1   |
| `src/store/savedPlacesStore.ts`           | 副作用除去、イベント発火追加                              | Week 3   |
| `src/store/routeStore.ts`                 | イベント発火追加                                          | Week 3   |
| `src/coordinators/PlanCoordinator.ts`     | updateStores イベント化、AppError 型ガード                | Week 3   |
| `src/services/SyncManager.ts`             | イベント経由化、AppError 適用                             | Week 3   |
| `src/services/plan/UnifiedPlanService.ts` | AppError 適用、@measured 追加                             | Week 2-3 |
| `src/services/MapInteractionService.ts`   | AppError 適用、@measured 追加                             | Week 2-3 |
| `src/services/ServiceContainer.ts`        | registerEventSubscribers / registerTelemetryServices 追加 | Week 2   |

---

## 依存関係グラフ

```
Week 1 基盤定義
├── P3-E1, P3-E2 (EventTypes) ← P3-E3, P3-E4 (Publishers)
├── P3-H1, P3-H2 (AppError/ErrorCode) ← P3-H3, P3-H4 (Messages/Retry)
└── P3-P1, P3-P2 (Monitor/Thresholds) ← P3-P3, P3-P4 (Container/WebVitals)

Week 2 実装
├── P3-E3, P3-E4 ← P3-E6〜E10 (Subscribers)
├── P3-H1, P3-H2 ← P3-H5〜H8 (Service 適用)
└── P3-P1 ← P3-P5〜P7 (Hook/Decorator/Subscriber)

Week 3 統合
├── P3-E6〜E10 ← P3-E11〜E14 (ストア移行)
├── P3-H5〜H8 ← P3-H9〜H11 (UI エラー)
└── P3-P5〜P7 ← P3-P8〜P10 (計測適用)

Week 4 検証
├── P3-E11〜E14 ← P3-E15〜E18 (テスト/ロールバック)
├── P3-H9〜H11 ← P3-H12〜H15 (エラーテスト)
└── P3-P8〜P10 ← P3-P11〜P14 (監視設定)

Week 5 クローズ
└── 全タスク ← P3-D1〜D4, P3-R1〜R4 (ドキュメント/レビュー)
```

---

## リスクと対策

| リスク              | 影響                         | 対策                                               | 監視指標                            |
| ------------------- | ---------------------------- | -------------------------------------------------- | ----------------------------------- |
| Subscriber 実装遅延 | ストア移行タスクがブロック   | Week 2 前半に Subscriber を優先、並行作業を調整    | Week 2 金曜時点の Subscriber 完了数 |
| Feature Flag バグ   | 旧モードへのロールバック不可 | Week 4 でロールバック手順を QA 環境で実テスト      | ロールバックテスト成功/失敗         |
| 計測オーバーヘッド  | 本番パフォーマンス劣化       | サンプリング率を開発 100% / 本番 10% に設定        | P95 レイテンシの変化                |
| エラーコード漏れ    | 未定義エラーで表示崩れ       | Unknown エラー用フォールバックメッセージを必ず用意 | Unknown エラー発生数                |

---

## Review Checklist（Phase 3 全体）

- [ ] イベント駆動: 全ストアアクションがイベント発火するか
- [ ] イベント駆動: Subscriber が適切に副作用を処理しているか
- [ ] イベント駆動: Feature Flag でロールバック可能か
- [ ] エラーハンドリング: 全 ErrorCode が定義されているか
- [ ] エラーハンドリング: ユーザー向けメッセージが適切か
- [ ] エラーハンドリング: リトライ戦略が機能しているか
- [ ] パフォーマンス: 主要操作に計測が追加されているか
- [ ] パフォーマンス: ベースラインが記録されているか
- [ ] パフォーマンス: アラートが正常に発報するか
- [ ] ドキュメント: 各ガイドが最新状態か

**Phase 3 完了判定**: 上記チェックリスト全項目が ✅ であること

**Due Date**: 2026-03-06

---

更新履歴

- 2026-01-21: 初版作成
