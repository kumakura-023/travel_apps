# リファクタリング計画 - 2026-01-20

## 背景

VoyageSketchでは`ServiceContainer`を唯一のDI基盤として整理済みである一方、`UnifiedPlanService`や`savedPlacesStore`、`MapOverlayManager`などの境界がまだ揃っておらず、旧ドキュメントと実装の齟齬が残存している。特にストアとサービスの責務混在、イベント駆動の徹底不足、Map系ロジックの肥大化がパフォーマンスと保守性のボトルネックとなっている。最新ドキュメントで指摘された差異を吸収しつつ、既存のPhase 0-4計画をアップデートする。

## ゴール

- `ServiceContainer`配下での依存解決を徹底し、ユニットテスト容易性を高める。
- `UnifiedPlanService`を中心にプラン系ユースケースを整理し、ストア層からビジネスロジックを排除する。
- `savedPlacesStore`/`placesStore`/`selectedPlaceStore`の責務を再定義し、Map/UIとの同期不整合を解消する。
- `MapOverlayManager`と周辺オーバーレイの描画パイプラインを整理し、TravelTime/Route/Labelをプラグイン化できる状態にする。
- Phase 4完了時点で、全主要サービスがインターフェース経由で注入され、イベントドリブンな副作用連携に統一されている状態を実現する。

## スコープ

- DI/サービス層: `ServiceContainer`, `UnifiedPlanService`, `PlanCoordinator`, `MapOverlayManager`への参照統合。
- 状態管理: `savedPlacesStore`, `routeStore`, `travelTimeStore`, `uiStore`の整理と命名更新。
- UIコンポーネント: PlaceDetail系、Mapイベント/オーバーレイ系の分割とフック化。
- ドキュメント: `docs/project-structure/*.md`の差分追従、フェーズ進捗ログの更新。
- 非スコープ: 新機能開発、バックエンドAPI刷新、大規模UIデザイン変更。

## 成功指標

| 指標                   | 目標値           | 測定方法                             |
| ---------------------- | ---------------- | ------------------------------------ |
| DI経由解決率           | 95%以上          | `ServiceContainer`登録一覧と静的解析 |
| ストア行数             | 300行未満/ストア | LintレポートとPRチェック             |
| Map描画待ち時間        | < 120ms (P95)    | Web Vitals計測                       |
| E2E主要シナリオ        | 0ブロッカー      | Regression suite                     |
| TypeScriptビルドエラー | 0                | `tsc --noEmit`                       |

## フェーズ計画

### Phase 0: アラインメントと資産整理（~2026-01-22）

- 既存`ServiceContainer`登録状況を棚卸しし、`UnifiedPlanService`/`MapOverlayManager`/イベント系の依存グラフを更新。
- `docs/project-structure/01-architecture-overview.md`と実際のサービス一覧を突合し、差分リストを作成。
- `savedPlacesStore`/`placesStore`の重複ドメインを洗い出し、単一ソース決定のための要件を確定。

#### Phase 0 タスク詳細

| ID   | タスク                                 | 内容                                                                                                                                | 成果物                                    | 担当               | 期限       |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------ | ---------- |
| P0-1 | ServiceContainer依存関係棚卸し ✅ 完了 | `ServiceContainer.registerDefaultServices`の登録一覧を抽出し、各サービスの依存グラフを図示する                                      | DI依存グラフ (Miro/画像) + サマリーノート | アーキテクト       | 2026-01-21 |
| P0-2 | ドキュメント差分リスト化 ✅ 完了       | `docs/project-structure/01-05`と`src`実装の差分をCSVでまとめ、要修正箇所を優先度付け                                                | doc-vs-code-diff.csv                      | テックリード       | 2026-01-22 |
| P0-3 | savedPlaces/places統合要件整理 ✅ 完了 | `savedPlacesStore`/`placesStore`/`selectedPlaceStore`の状態・アクションを比較し、統合に必要な要件とデータ移行手順をConfluenceに記述 | PlaceStore-Consolidation要件メモ          | フロントエンド担当 | 2026-01-22 |

### Phase 0 成果物

- `docs/refactoring/phase0/di-inventory.md`
- `docs/refactoring/phase0/doc-vs-code-diff.csv`
- `docs/refactoring/phase0/place-store-consolidation.md`

### Phase 1: ストア命名と参照統一（~2026-02-02）

- `savedPlacesStore`をソースオブトゥルースとし、`placesStore`を段階的に削除（UIは薄いセレクターに置換）。
- `ServiceContainer`から`PlaceManagementService`を解決するようHookを更新し、ストアからビジネスロジックを排除。
- `selectedPlaceStore`などUI限定ステートの命名/責務をドキュメント反映。

#### Phase 1 タスク詳細

| ID   | タスク                                     | 内容                                                                                                                 | 成果物                                                | 担当               | 期限       |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------ | ---------- |
| P1-1 | SavedPlacesソース設計リデザイン ✅ 完了    | `savedPlacesStore`を唯一のデータソースとするため、読み書きフローとバックアップ手順を再設計し、移行ステップを定義する | docs/refactoring/phase1/redesign-saved-places.md      | フロントエンド担当 | 2026-01-28 |
| P1-2 | PlaceManagementServiceのDI組み込み ✅ 完了 | `ServiceContainer`経由で`PlaceManagementService`を解決するHook/APIを追加し、既存ストアからの直接依存を除去する       | docs/refactoring/phase1/place-management-di-plan.md   | テックリード       | 2026-01-30 |
| P1-3 | UI限定ステート命名整理 ✅ 完了             | `selectedPlaceStore`などUI専用ストアの命名・責務を再定義し、ドキュメントと型定義を同期させる                         | docs/refactoring/phase1/naming-guideline-ui-states.md | フロントエンド担当 | 2026-02-01 |

### Phase 1 成果物

- `docs/refactoring/phase1/redesign-saved-places.md`
- `docs/refactoring/phase1/place-management-di-plan.md`
- `docs/refactoring/phase1/naming-guideline-ui-states.md`

### Phase 2: サービス境界とインターフェース実装（~2026-02-16）

- `UnifiedPlanService`/`PlanCoordinator`/`SyncManager`の呼び出し経路を見直し、Plan系ユースケースをインターフェース化。
- Map周辺の`MapEventHandler`からビジネスロジックを`MapInteractionService`へ移し、`ServiceContainer`で管理。
- `MapOverlayManager`配下オーバーレイ（Route/TravelTime/Label/Notification）を共通インターフェースで登録し、描画条件を統一。

#### Phase 2 タスク詳細

| ID   | タスク                      | 内容                                                                   | 成果物                                                    | 担当               | 期限       | ステータス      |
| ---- | --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- | ------------------ | ---------- | --------------- |
| P2-1 | サービス境界ドラフト作成    | UnifiedPlanService/PlanCoordinator/SyncManager の責務と I/F 定義を整理 | `docs/refactoring/phase2/service-boundary-plan.md`        | アーキテクト       | 2026-01-24 | ✅ Draft 完了   |
| P2-2 | I/F 契約レビュー準備        | 命名・例外ポリシーと議事録テンプレの整備                               | 同上 + レビュー付録                                       | テックリード       | 2026-01-27 | ⏳ レビュー待ち |
| P2-3 | ServiceContainer 登録ガイド | Plan 系サービス登録順序と getter 方針を明文化                          | `service-boundary-plan.md` Section 5                      | フロントエンド担当 | 2026-01-30 | ✅ 追記済み     |
| P2-4 | MapInteractionService 設計  | MapEventHandler からの移譲手順と影響範囲を整理                         | `docs/refactoring/phase2/map-interaction-service-plan.md` | フロントエンド担当 | 2026-01-30 | ✅ Draft 完了   |
| P2-5 | MapOverlay 共通 I/F 設計    | Overlay プラグイン I/F と Rollout 計画を定義                           | `docs/refactoring/phase2/map-overlay-interface-plan.md`   | Map/Frontend連携   | 2026-01-31 | ✅ Draft 完了   |
| P2-6 | リスク・依存更新            | Phase2 で判明したリスク/依存を各ドキュメントへ反映                     | 各 Phase2 ドキュメント                                    | アーキテクト       | 2026-02-02 | ✅ 反映済み     |
| P2-7 | マスタープラン更新          | 本ファイルに Phase2 タスク/成果物/リンクを追加                         | `docs/refactoring/refactoring-plan-20260120.md`           | PM                 | 2026-02-03 | ✅ 更新済み     |
| P2-8 | レビューフロー定義          | 各ドキュメント末尾に Review Checklist と承認者を記載                   | 各 Phase2 ドキュメント                                    | PM                 | 2026-02-03 | ✅ 記載済み     |

#### Phase 2 成果物

- `docs/refactoring/phase2/service-boundary-plan.md`
- `docs/refactoring/phase2/map-interaction-service-plan.md`
- `docs/refactoring/phase2/map-overlay-interface-plan.md`

### Phase 3: イベント駆動と監視拡充（~2026-03-06）

- `EventBus`を経由した通知に統一し、`savedPlacesStore`・`routeStore`更新時の副作用をサービスへ移行。
- エラーハンドリング規約（`AppError`, `ErrorCode`）をSync/Map/Plan各サービスへ適用。
- パフォーマンス計測フックをMap/Plan主要操作へ追加し、Phase 4の最適化に備える。

#### Phase 3 タスク詳細

**期間**: 2026-02-03 〜 2026-03-06（5週間）

##### Week 1: イベント基盤拡充 / エラー基盤定義（2026-02-03 〜 2026-02-09）

| ID    | タスク                             | 内容                                                      | 成果物                                            | 担当         | 期限       | ステータス |
| ----- | ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------- | ------------ | ---------- | ---------- |
| P3-E1 | RouteEventTypes 定義               | Route ドメインのイベント型を定義                          | `src/application/events/types/RouteEventTypes.ts` | FE Lead      | 2026-02-04 | ⬜ 未着手  |
| P3-E2 | SyncEventTypes 定義                | Sync ドメインのイベント型を定義                           | `src/application/events/types/SyncEventTypes.ts`  | Backend Lead | 2026-02-04 | ⬜ 未着手  |
| P3-E3 | RouteEventPublisher 実装           | RouteEventTypes を発火する Publisher                      | `src/application/events/RouteEventPublisher.ts`   | FE Lead      | 2026-02-05 | ⬜ 未着手  |
| P3-E4 | SyncEventPublisher 実装            | SyncEventTypes を発火する Publisher                       | `src/application/events/SyncEventPublisher.ts`    | Backend Lead | 2026-02-05 | ⬜ 未着手  |
| P3-E5 | EventBus 型拡張                    | EventNames / EventPayloads に Route / Sync イベントを追加 | `src/events/EventBus.ts` 改修                     | Architect    | 2026-02-06 | ⬜ 未着手  |
| P3-H1 | AppError クラス実装                | 統一エラー型、severity / context / cause 対応             | `src/errors/AppError.ts`                          | Architect    | 2026-02-04 | ⬜ 未着手  |
| P3-H2 | ErrorCode 定義                     | 全ドメインのエラーコード                                  | `src/errors/ErrorCode.ts`                         | Architect    | 2026-02-05 | ⬜ 未着手  |
| P3-H3 | ErrorMessages 定義                 | ユーザー向けメッセージマッピング                          | `src/errors/ErrorMessages.ts`                     | FE Lead      | 2026-02-06 | ⬜ 未着手  |
| P3-H4 | RetryPolicy 定義                   | SyncErrorCode 別のリトライ戦略                            | `src/errors/RetryPolicy.ts`                       | Backend Lead | 2026-02-07 | ⬜ 未着手  |
| P3-P1 | PerformanceMonitor I/F 定義        | 計測インターフェースと基本実装                            | `src/telemetry/PerformanceMonitor.ts`             | Architect    | 2026-02-05 | ⬜ 未着手  |
| P3-P2 | 閾値定義ファイル作成               | 全操作の warning / critical / target 値                   | `src/telemetry/thresholds.ts`                     | Architect    | 2026-02-06 | ⬜ 未着手  |
| P3-P3 | ServiceContainer へ Telemetry 登録 | PerformanceMonitor のシングルトン登録                     | `registerTelemetryServices()` 関数追加            | FE Lead      | 2026-02-07 | ⬜ 未着手  |
| P3-P4 | Web Vitals 初期化                  | Core Web Vitals + カスタム MapVitals の計測開始           | `src/telemetry/webVitals.ts`                      | FE Lead      | 2026-02-09 | ⬜ 未着手  |

##### Week 2: Subscriber 実装 / エラー適用 / 計測 Hook（2026-02-10 〜 2026-02-16）

| ID     | タスク                                 | 内容                                           | 成果物                                                      | 担当         | 期限       | ステータス |
| ------ | -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- | ------------ | ---------- | ---------- |
| P3-E6  | PlacePersistenceSubscriber 実装        | place イベントを購読し Firestore 永続化        | `src/application/subscribers/PlacePersistenceSubscriber.ts` | FE Lead      | 2026-02-11 | ⬜ 未着手  |
| P3-E7  | NotificationSubscriber 実装            | リモート place:added を購読し通知作成          | `src/application/subscribers/NotificationSubscriber.ts`     | FE Lead      | 2026-02-12 | ⬜ 未着手  |
| P3-E8  | LabelSyncSubscriber 実装               | plan:loaded/switched を購読し labelsStore 更新 | `src/application/subscribers/LabelSyncSubscriber.ts`        | FE Lead      | 2026-02-12 | ⬜ 未着手  |
| P3-E9  | TelemetrySubscriber 実装               | 全イベントを購読しメトリクス/ログ出力          | `src/application/subscribers/TelemetrySubscriber.ts`        | SRE          | 2026-02-13 | ⬜ 未着手  |
| P3-E10 | Subscriber 登録関数                    | ServiceContainer 起動時に全 Subscriber を登録  | `registerEventSubscribers()`                                | Architect    | 2026-02-14 | ⬜ 未着手  |
| P3-H5  | UnifiedPlanService へ AppError 適用    | 既存 try-catch を AppError でラップ            | `UnifiedPlanService.ts` 改修                                | FE Lead      | 2026-02-11 | ⬜ 未着手  |
| P3-H6  | SyncManager へ AppError 適用           | リトライ戦略 + SyncErrorCode 使用              | `SyncManager.ts` 改修                                       | Backend Lead | 2026-02-12 | ⬜ 未着手  |
| P3-H7  | MapInteractionService へ AppError 適用 | Google Maps API エラー変換                     | `MapInteractionService.ts` 改修                             | FE Lead      | 2026-02-13 | ⬜ 未着手  |
| P3-H8  | PlanCoordinator へ AppError 型ガード   | isAppError 判定とリカバリー処理                | `PlanCoordinator.ts` 改修                                   | FE Lead      | 2026-02-14 | ⬜ 未着手  |
| P3-P5  | usePerformance Hook 実装               | React コンポーネント用計測 Hook                | `src/telemetry/hooks/usePerformance.ts`                     | FE Lead      | 2026-02-11 | ⬜ 未着手  |
| P3-P6  | @measured デコレータ実装               | サービスメソッド用計測デコレータ               | `src/telemetry/decorators/measured.ts`                      | FE Lead      | 2026-02-12 | ⬜ 未着手  |
| P3-P7  | PerformanceEventSubscriber 実装        | EventBus イベントから自動計測                  | `src/telemetry/subscribers/PerformanceEventSubscriber.ts`   | FE Lead      | 2026-02-14 | ⬜ 未着手  |

##### Week 3: ストア副作用移行 / UI エラー / 計測適用（2026-02-17 〜 2026-02-23）

| ID     | タスク                                  | 内容                                                        | 成果物                                 | 担当         | 期限       | ステータス |
| ------ | --------------------------------------- | ----------------------------------------------------------- | -------------------------------------- | ------------ | ---------- | ---------- |
| P3-E11 | savedPlacesStore 副作用除去             | updateLastActionPosition / 通知ロジックを Subscriber へ移行 | `savedPlacesStore.ts` 改修             | FE Lead      | 2026-02-18 | ⬜ 未着手  |
| P3-E12 | routeStore イベント発火追加             | addRoute / removeRoute 等に RouteEventPublisher.emit() 追加 | `routeStore.ts` 改修                   | FE Lead      | 2026-02-19 | ⬜ 未着手  |
| P3-E13 | PlanCoordinator.updateStores リファクタ | 直接ストア更新をイベント発火に置換                          | `PlanCoordinator.ts` 改修              | Architect    | 2026-02-20 | ⬜ 未着手  |
| P3-E14 | SyncManager イベント経由化              | onRemoteUpdate を SyncEventPublisher 経由に変更             | `SyncManager.ts` 改修                  | Backend Lead | 2026-02-20 | ⬜ 未着手  |
| P3-H9  | ErrorBoundary 実装                      | AppError 対応の React ErrorBoundary                         | `src/components/ErrorBoundary.tsx`     | FE Lead      | 2026-02-18 | ⬜ 未着手  |
| P3-H10 | ErrorNotification コンポーネント        | トースト/モーダル表示（severity 別）                        | `src/components/ErrorNotification.tsx` | FE Lead      | 2026-02-19 | ⬜ 未着手  |
| P3-H11 | useErrorHandler Hook                    | コンポーネント用エラーハンドリング Hook                     | `src/hooks/useErrorHandler.ts`         | FE Lead      | 2026-02-20 | ⬜ 未着手  |
| P3-P8  | Map 系操作への計測追加                  | MapOverlayManager / MapInteractionService に @measured 適用 | 既存ファイル改修                       | FE Lead      | 2026-02-18 | ⬜ 未着手  |
| P3-P9  | Plan 系操作への計測追加                 | UnifiedPlanService / PlanCoordinator に @measured 適用      | 既存ファイル改修                       | FE Lead      | 2026-02-19 | ⬜ 未着手  |
| P3-P10 | Sync 系操作への計測追加                 | SyncManager に @measured 適用                               | 既存ファイル改修                       | Backend Lead | 2026-02-20 | ⬜ 未着手  |

##### Week 4: テスト / ロールバック / 監視（2026-02-24 〜 2026-03-02）

| ID     | タスク                     | 内容                                          | 成果物                                        | 担当         | 期限       | ステータス |
| ------ | -------------------------- | --------------------------------------------- | --------------------------------------------- | ------------ | ---------- | ---------- |
| P3-E15 | イベントフロー E2E テスト  | Place 追加 → 永続化 → 通知の E2E シナリオ     | `__tests__/e2e/event-flow.spec.ts`            | QA           | 2026-02-25 | ⬜ 未着手  |
| P3-E16 | Feature Flag 設計          | useEventDrivenMode フラグによる新旧モード切替 | `src/features/flags.ts`                       | FE Lead      | 2026-02-25 | ⬜ 未着手  |
| P3-E17 | ロールバック手順書         | イベント駆動無効化の手順と確認項目            | `docs/runbooks/event-rollback.md`             | SRE          | 2026-02-26 | ⬜ 未着手  |
| P3-E18 | カナリアリリース計画       | 10% → 50% → 100% のロールアウトスケジュール   | `docs/release/phase3-canary.md`               | PM           | 2026-02-27 | ⬜ 未着手  |
| P3-H12 | AppError 単体テスト        | isRecoverable / toJSON / cause チェーン検証   | `__tests__/errors/AppError.test.ts`           | FE Lead      | 2026-02-25 | ⬜ 未着手  |
| P3-H13 | リトライ戦略テスト         | SyncManager の指数バックオフ動作確認          | `__tests__/services/SyncManager.test.ts`      | Backend Lead | 2026-02-26 | ⬜ 未着手  |
| P3-H14 | ErrorBoundary テスト       | fatal / error / warning 表示分岐確認          | `__tests__/components/ErrorBoundary.test.tsx` | FE Lead      | 2026-02-26 | ⬜ 未着手  |
| P3-H15 | Telemetry 連携確認         | エラーログ送信とダッシュボード表示確認        | Staging 環境検証                              | SRE          | 2026-02-27 | ⬜ 未着手  |
| P3-P11 | メトリクス送信実装         | PerformanceMonitor → Telemetry backend 連携   | Telemetry adapter 拡張                        | SRE          | 2026-02-25 | ⬜ 未着手  |
| P3-P12 | Grafana ダッシュボード作成 | 操作別 P50/P95/P99 グラフ + 閾値線            | Performance Dashboard                         | SRE          | 2026-02-26 | ⬜ 未着手  |
| P3-P13 | アラートルール設定         | Warning / Critical 閾値超過時の通知           | Alertmanager 設定                             | SRE          | 2026-02-27 | ⬜ 未着手  |
| P3-P14 | ベースライン記録           | Lab 環境で全操作の初期計測実施                | 初期計測レポート                              | QA           | 2026-02-28 | ⬜ 未着手  |

##### Week 5: ドキュメント / レビュー / クローズ（2026-03-03 〜 2026-03-06）

| ID    | タスク                     | 内容                                               | 成果物                                  | 担当        | 期限       | ステータス |
| ----- | -------------------------- | -------------------------------------------------- | --------------------------------------- | ----------- | ---------- | ---------- |
| P3-D1 | イベント駆動ガイド         | EventBus 利用ルール、Publisher/Subscriber 作成手順 | `docs/guides/event-driven.md`           | Tech Writer | 2026-03-03 | ⬜ 未着手  |
| P3-D2 | エラーハンドリングガイド   | ErrorCode 一覧、メッセージ規約、UI 表示ルール      | `docs/guides/error-handling.md`         | Tech Writer | 2026-03-04 | ⬜ 未着手  |
| P3-D3 | パフォーマンス計測ガイド   | @measured 使用方法、閾値追加手順                   | `docs/guides/performance-monitoring.md` | Tech Writer | 2026-03-04 | ⬜ 未着手  |
| P3-D4 | マスタープラン更新         | Phase 3 完了を反映、Phase 4 準備事項追記           | 本ファイル更新                          | PM          | 2026-03-05 | ⬜ 未着手  |
| P3-R1 | イベント駆動レビュー       | Subscriber 設計 / Feature Flag 運用の最終確認      | レビュー議事録                          | Architect   | 2026-03-04 | ⬜ 未着手  |
| P3-R2 | エラーハンドリングレビュー | ErrorCode 網羅性 / メッセージ適切性確認            | レビュー議事録                          | FE Lead     | 2026-03-05 | ⬜ 未着手  |
| P3-R3 | パフォーマンスレビュー     | 閾値妥当性 / アラート設定確認                      | レビュー議事録                          | SRE         | 2026-03-05 | ⬜ 未着手  |
| P3-R4 | Phase 3 クローズ承認       | 全タスク完了確認、Phase 4 開始判断                 | 承認記録                                | PM          | 2026-03-06 | ⬜ 未着手  |

#### Phase 3 成果物

- `docs/refactoring/phase3/event-driven-migration-plan.md`
- `docs/refactoring/phase3/error-handling-standard.md`
- `docs/refactoring/phase3/performance-monitoring-plan.md`
- `docs/refactoring/phase3/phase3-task-breakdown.md`
- `src/errors/AppError.ts`, `src/errors/ErrorCode.ts`, `src/errors/ErrorMessages.ts`, `src/errors/RetryPolicy.ts`
- `src/telemetry/PerformanceMonitor.ts`, `src/telemetry/thresholds.ts`, `src/telemetry/webVitals.ts`
- `src/application/events/types/RouteEventTypes.ts`, `src/application/events/types/SyncEventTypes.ts`
- `src/application/subscribers/*.ts`
- `src/components/ErrorBoundary.tsx`, `src/components/ErrorNotification.tsx`
- `docs/guides/event-driven.md`, `docs/guides/error-handling.md`, `docs/guides/performance-monitoring.md`

### Phase 4: 最適化とドキュメント凍結（~2026-03-20）

- Map描画（`MapOverlayManager`）とTravelTime/Routeバッチ計算を統合し、レイテンシ最適化を行う。
- すべてのフェーズ成果を`docs/project-structure/10-phase3-completion-summary.md`後継ドキュメントへ反映。
- 長期保守指針（イベント利用ルール、DI登録ポリシー、UI分割基準）を確定し、アーキテクチャレビューをクローズ。

## 依存関係

- `ServiceContainer.registerDefaultServices()`の初期化タイミングとMapサービス登録（Google Mapsロード完了）
- Firestore/LocalStorageリポジトリとの同期タイムライン
- E2Eテスト環境（TravelTime APIキー、Google Maps課金枠）
- ドキュメント更新フロー（アーキテクト承認、プロダクトマネージャーチェック）

## リスクと緩和策

| リスク                                      | 影響               | 緩和策                                                   |
| ------------------------------------------- | ------------------ | -------------------------------------------------------- |
| DI統合で循環依存が発生                      | サービス解決不可   | 依存グラフの静的解析とPhase 0レビューで検知              |
| `savedPlacesStore`統合中のデータ欠落        | ユーザーデータ損失 | マイグレーションスクリプトとEventBusベースの監査ログ     |
| `MapOverlayManager`再構築による描画遅延     | UX低下             | Phase 3で計測フックを先行導入し、P95監視を自動化         |
| `UnifiedPlanService`のAPI変更が既存UIに影響 | リリース遅延       | API互換ラッパーをPhase 2で一時提供                       |
| Google Maps API制限                         | 開発停滞           | 開発キーと本番キーの割り当てを分離しRate-limit監視を追加 |

## アクションアイテム

- Phase 0完了前に`ServiceContainer`/`UnifiedPlanService`構成図を更新し、Confluenceへ共有。
- `savedPlacesStore`統合作業の前に、既存`savedPlacesStore.backup.ts`参照箇所を全検索し削除計画を確定。
- Map系リファクタリングに向けて`MapOverlayManager`の描画順序とプラグイン契約案を作成。
- `EventBus`利用ガイドラインのドラフトをPhase 2開始までにレビューリクエスト。
- 各Phase終了時に`docs/project-structure/README.md`へ進捗サマリを追加。
