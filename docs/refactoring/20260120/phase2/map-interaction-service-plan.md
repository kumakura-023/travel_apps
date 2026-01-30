# Phase 2 設計メモ: MapInteractionService への責務移譲

## 1. 目的

- `MapEventHandler.tsx` に集中しているビジネスロジックを `MapInteractionService` へ移し、UI 層を軽量化する。
- Map 系の副作用・サービス呼び出しを `ServiceContainer` 管理下に統一し、Hook/Store から直接 Map SDK へアクセスしないようにする。
- Phase 3 で予定している EventBus/観測拡張に備え、Map 操作イベントの集約ポイントを定義する。

## 2. 現状課題

1. `MapEventHandler.tsx` が Google Maps SDK 操作、Place 選択、ルート描画トリガーなど多責務を抱えておりテスト不能。
2. UI コンポーネントが Map API に直接アクセスしており、DI ルールが崩れている。
3. Map イベントハンドリングの共通ユーティリティが存在せず、同一ロジックが複数 Hook に散在。

## 3. MapInteractionService の責務

| カテゴリ | 詳細 |
| --- | --- |
| イベント受信 | Map Gesture (click, drag, zoom), Marker interaction, Overlay hover などを標準化された `MapInteraction` イベントとして受け取る |
| サービス連携 | PlaceManagementService / RouteService / OverlayService など必要なサービスを DI で取得し、Map イベントに応じたアクションを実行 |
| UI 通知 | EventBus と `mapInteractionUiStore` (仮称) へイベントを配信し、UI 層が副作用を購読できるようにする |
| SDK 抽象化 | Google Maps API へのアクセスをラップし、Mock しやすい `MapApiAdapter` を介して操作する |

### 主要メソッド案

- `registerHandlers(mapInstance: MapInstance): Unsubscribe`
- `focusPlace(placeId: string, opts?: FocusOptions)`
- `handleGesture(event: MapGestureEvent)`
- `applyOverlayUpdate(update: OverlayRequest)`
- `dispose()`

## 4. DI / ServiceContainer 設計

- `container.registerSingleton('MapInteractionService', () => new MapInteractionService({ mapApiAdapter, placeService, planCoordinator, mapOverlayManager, eventBus }))`
- `getMapInteractionService(container?)` を `src/services/di/getters/map.ts` に追加し、Hook/Component は getter のみ利用。
- Storybook / tests 向けに `createMapTestContainer` を用意し、Map API モックやプレースホルダーサービスを注入可能にする。

## 5. 影響範囲

| レイヤー | 影響箇所 | 必要な変更 |
| --- | --- | --- |
| Components | `MapView.tsx`, `MapEventHandler.tsx`, `PlaceMarker.tsx` 等 | MapInteractionService から提供されるコールバックを props 経由で受ける構造へ |
| Hooks | `useMapEvents`, `useRoutePreview`, `useMapOverlays` | 直接 Map API を触らず、サービスからのイベントを購読 |
| Stores | `mapInteractionUiStore` (新規), 既存 UI store | MapInteractionService が発火する UI イベントを受けて状態更新 |
| Services | `MapOverlayManager`, `PlaceManagementService` | 必要な API を MapInteractionService へ公開する (インターフェース化) |

## 6. リファクタリング手順

1. **サービス骨格作成**: MapInteractionService クラスと DI 登録、getter を追加。
2. **イベント正規化**: MapEventHandler で受け取る生イベントを `MapInteraction` 型に正規化し、サービスへ委譲。
3. **Hooks 切り替え**: `useMapEvents` などの Hook をサービス購読に変更。
4. **コンポーネント整理**: `MapEventHandler.tsx` を薄いバインダーにし、最終的に廃止。`MapView` からはサービスのみを使用。
5. **テスト追加**: サービス単体テストと Hook 統合テストを追加。
6. **Telemetry/Logging**: 重要イベント (focus, overlay change, gesture error) を EventBus + ログで記録。

## 7. テスト戦略

- **Unit**: MapInteractionService のメソッドごとに Map API モックを使った挙動検証。
- **Integration**: Hook + コンポーネントからのイベントがサービス経由で正しく伝播するか。
- **Regression**: 既存の Map 操作シナリオ (Place 選択、ルートハイライト、TravelTime 表示) の E2E テストを実行。

## 8. ロールアウト計画

| フェーズ | 内容 | Exit Criteria |
| --- | --- | --- |
| Phase2-A | サービス追加 + Hook1 への適用 (例: `useMapEvents`) | QA で既存操作が動作すること |
| Phase2-B | 主要コンポーネント移行 (`MapView`, `PlaceMarker`) | Telemetry で EventBus イベントが期待通りに出ること |
| Phase2-C | 旧 `MapEventHandler.tsx` の削除 | 全コンポーネントがサービス経由で動作 |

## 9. タスク & ステータス

| ID | タスク | 内容 | 成果物 | 期限 | ステータス |
| --- | --- | --- | --- | --- | --- |
| P2-S4-1 | サービス設計ドラフト | 本ドキュメント作成 | `docs/refactoring/phase2/map-interaction-service-plan.md` | 2026-01-30 | ✅ Draft |
| P2-S4-2 | イベント正規化仕様 | MapInteraction 型定義 & 変換仕様 | 追補資料 | 2026-02-02 | ✅ 追加済み |
| P2-S4-3 | Hook 影響調査 | 対象 Hook の改修順序決定 | Hook マッピング表 | 2026-02-02 | ✅ 整備済み |
| P2-S4-4 | ロールアウト手順レビュー | Feature Flag / QA 戦略合意 | レビュー議事録 | 2026-02-05 | ✅ 承認取得 |

## 10. リスク & 対策

| リスク | 影響 | 対策 |
| --- | --- | --- |
| MapInteractionService への移行途中でイベントが二重登録される | パフォーマンス低下 | Feature Flag とログで二重呼び出しを検知し段階的切替 |
| Google Maps SDK バージョン差異 | 予期せぬ動作 | MapApiAdapter を介して互換レイヤーを提供 |
| Hook の依存が循環する | ビルドエラー | Hook からサービス getter のみを使い、コンポーネント間依存を排除 |

## 11. Review Checklist

- [ ] MapInteractionService の責務が UI/Service 間で重複していないか
- [ ] DI 登録と getter でテスト可能な設計になっているか
- [ ] Hook/Component 影響範囲が列挙されているか
- [ ] ロールアウト計画が QA/Telemetry 担当と合意できる内容か

**Approvers**: Architect, Frontend Lead, Map Feature Owner, QA Lead

**Due Date**: 2026-02-05

---
更新履歴
- 2026-01-20: 初版 Draft
