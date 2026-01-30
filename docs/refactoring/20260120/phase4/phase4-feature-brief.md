# Phase 4 Feature Brief - 最適化とドキュメント整備

## 概要

**フェーズ名**: Phase 4 - 最適化とドキュメント整備

**期間**: ~2026-03-20

**作成日**: 2026-01-21

## ゴール

1. Map描画パイプライン全体のパフォーマンス最適化（TravelTime/Route計算のバッチ化、レンダリング効率化）
2. Phase 0-3 の成果を反映したドキュメント更新とガイド作成

## スコープ

### In Scope

- MapOverlayManager と関連コンポーネントの最適化
- TravelTime / Route 計算のバッチ処理統合
- 不要な再描画の防止（メモ化、条件付きレンダリング）
- `docs/project-structure/*.md` の Phase 3 対応更新
- イベント駆動・エラーハンドリング・パフォーマンス計測ガイドの作成

### Out of Scope

- 新機能開発
- バックエンド API 変更
- 長期保守指針の新規作成（Phase 5 以降）

## 技術設計

### 1. パフォーマンス最適化

#### 1.1 TravelTime 計算の最適化

- 複数の移動時間圏リクエストをバッチ化
- キャッシュ層の導入（同一地点・同一条件の再計算防止）
- `@measured` デコレータによる計測の継続

#### 1.2 Route 計算の最適化

- `directionsService.getBatchRoutes()` の活用強化
- ルートキャッシュの有効期限管理
- 並列リクエストの制御（API レート制限対応）

#### 1.3 MapOverlayManager 描画最適化

- `React.memo` / `useMemo` によるコンポーネントメモ化
- ズームレベル・表示範囲に基づく条件付きレンダリング
- オーバーレイのプラグイン化準備（共通インターフェース定義）

### 2. ドキュメント整備

#### 2.1 既存ドキュメント更新

- `docs/project-structure/01-05` を Phase 3 実装に合わせて更新
- EventBus / AppError / PerformanceMonitor の記載追加

#### 2.2 新規ガイド作成

- `docs/guides/event-driven.md` - イベント駆動の利用ルール
- `docs/guides/error-handling.md` - エラーハンドリング規約
- `docs/guides/performance-monitoring.md` - パフォーマンス計測ガイド

## タスク分解

### Week 1: パフォーマンス最適化 - 計算層（2026-03-10 〜 2026-03-13）

| ID    | タスク                      | 内容                                             | 成果物                                   | 優先度 |
| ----- | --------------------------- | ------------------------------------------------ | ---------------------------------------- | ------ |
| P4-O1 | TravelTime バッチ計算実装   | 複数地点の移動時間圏を一括計算するユーティリティ | `src/services/TravelTimeBatchService.ts` | High   |
| P4-O2 | TravelTime キャッシュ層追加 | 同一条件の再計算を防止するキャッシュ機構         | `src/services/TravelTimeCache.ts`        | High   |
| P4-O3 | Route キャッシュ管理強化    | 有効期限付きキャッシュ、LRU方式の導入            | `directionsService.ts` 改修              | Medium |
| P4-O4 | API レート制限対応          | 並列リクエスト数制御、リトライ戦略統合           | `src/utils/rateLimiter.ts`               | Medium |

### Week 2: パフォーマンス最適化 - 描画層（2026-03-14 〜 2026-03-17）

| ID    | タスク                        | 内容                                     | 成果物                          | 優先度 |
| ----- | ----------------------------- | ---------------------------------------- | ------------------------------- | ------ |
| P4-O5 | MapOverlayManager メモ化      | 子コンポーネントの不要再描画防止         | `MapOverlayManager.tsx` 改修    | High   |
| P4-O6 | PlaceCircle/PlaceLabel 最適化 | React.memo適用、props比較関数追加        | 各コンポーネント改修            | High   |
| P4-O7 | TravelTimeCircle 最適化       | ズームレベル別の描画制御                 | `TravelTimeCircle.tsx` 改修     | Medium |
| P4-O8 | RouteDisplay 最適化           | 表示範囲外ルートのスキップ               | `RouteDisplay.tsx` 改修         | Medium |
| P4-O9 | オーバーレイ共通I/F定義       | プラグイン化のための基盤インターフェース | `src/interfaces/IMapOverlay.ts` | Low    |

### Week 3: ドキュメント整備（2026-03-18 〜 2026-03-20）

| ID    | タスク                       | 内容                                       | 成果物                                               | 優先度 |
| ----- | ---------------------------- | ------------------------------------------ | ---------------------------------------------------- | ------ |
| P4-D1 | アーキテクチャ概要更新       | Phase 3 のイベント駆動・計測基盤を反映     | `docs/project-structure/01-architecture-overview.md` | High   |
| P4-D2 | サービス層ドキュメント更新   | UnifiedPlanService/SyncManager等の変更反映 | `docs/project-structure/02-service-layer.md`         | High   |
| P4-D3 | 状態管理ドキュメント更新     | EventBus連携、ストア責務の明確化           | `docs/project-structure/03-state-management.md`      | High   |
| P4-D4 | イベント駆動ガイド作成       | EventBus利用ルール、Subscriber作成手順     | `docs/guides/event-driven.md`                        | High   |
| P4-D5 | エラーハンドリングガイド作成 | ErrorCode一覧、メッセージ規約、UI表示      | `docs/guides/error-handling.md`                      | High   |
| P4-D6 | パフォーマンス計測ガイド作成 | @measured使用方法、閾値追加手順            | `docs/guides/performance-monitoring.md`              | Medium |

## 成功指標

| 指標               | 目標値         | 測定方法                |
| ------------------ | -------------- | ----------------------- |
| Map描画待ち時間    | < 120ms (P95)  | PerformanceMonitor計測  |
| TravelTime計算時間 | < 500ms (P95)  | @measured計測           |
| Route計算時間      | < 2000ms (P95) | @measured計測           |
| ドキュメント整備率 | 100%           | ガイド3件 + 既存更新3件 |

## 依存関係

- Phase 3 完了（イベント駆動基盤、パフォーマンス計測基盤）
- Google Maps API の利用可能性
- 既存の directionsService / TravelTime 関連コンポーネント

## リスクと緩和策

| リスク                     | 影響           | 緩和策                                   |
| -------------------------- | -------------- | ---------------------------------------- |
| メモ化による予期せぬバグ   | 表示不整合     | 段階的適用、各コンポーネント単位でテスト |
| キャッシュ不整合           | 古いデータ表示 | 適切な無効化戦略、TTL設定                |
| API レート制限への過剰対応 | レスポンス遅延 | 適応的なレート調整                       |
