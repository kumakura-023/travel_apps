# Phase 2 設計メモ: MapOverlay 共通インターフェース

## 1. 目的

- `MapOverlayManager` 配下で扱う Route / TravelTime / Label / Notification オーバーレイを共通契約に揃え、描画・更新フローを統一する。
- Overlay 実装をプラグイン化し、Phase 3 以降のパフォーマンス計測や動的ロードを容易にする。
- MapInteractionService との連携ポイントを明確にし、UI 層がオーバーレイの内部実装に依存しないようにする。

## 2. 現状課題

1. 各オーバーレイが個別の props / lifecycle を持ち、`MapOverlayManager` が条件分岐で制御している。
2. Route/TravelTime で描画順序・非同期処理が異なり、合成時にチラつき・遅延が発生。
3. 監視/ログ出力が統一されておらず、どのオーバーレイが失敗したか特定しづらい。

## 3. 共通インターフェース案

```ts
interface IMapOverlayPlugin {
  id: MapOverlayId; // 'route' | 'travelTime' | 'label' | 'notification'
  initialize(ctx: MapOverlayContext): Promise<void> | void;
  render(params: MapOverlayRenderParams): Promise<void> | void;
  update(diff: MapOverlayDiff): Promise<void> | void;
  dispose(): void;
}
```

- **MapOverlayContext**: `mapApiAdapter`, `eventBus`, `serviceContainer`, `telemetry` を保持。
- **render**: 初期描画 (データ取得 + マーカー生成)。
- **update**: 差分適用 (ルート再計算、TravelTime 再描画など)。
- **dispose**: Map コンポーネント unmount 時やプラグイン無効化時に呼び出し。

## 4. プラグイン登録フロー

1. `MapOverlayRegistry` (新規) を設置し、`registry.register('route', RouteOverlayPlugin)` の形式で登録。
2. `MapOverlayManager` は ServiceContainer から registry を解決し、必要な overlay をロード。
3. 各 overlay は lazy import も可能なように、Promise ベースの factory を許容。

## 5. ロールアウト計画

| ステップ | 対象 | 内容 | Exit Criteria |
| --- | --- | --- | --- |
| Step 1 | Route / TravelTime | 2 種類をパイロット。共通 I/F 実装と registry 連携を検証 | パフォーマンス計測で P95 < 120ms 維持 |
| Step 2 | Label | 既存ラベル描画をプラグイン化。MapInteractionService からの hover イベント連携を確認 | QA でラベル機能動作確認 |
| Step 3 | Notification | 地図上トースト/警告を overlay プラグインに移行 | EventBus 経由での通知重複が無いこと |
| Step 4 | 拡張 | 新規 overlay のテンプレートを公開 | テンプレート + 例示コードをドキュメント化 |

## 6. 依存関係

- MapInteractionService: Overlay 更新トリガーを同サービス経由で受け取る。
- ServiceContainer: `MapOverlayRegistry`, `MapOverlayManager`, 各 overlay プラグインの factory を登録。
- Telemetry/Logging: 各プラグインが `OverlayLifecycleEvent` を `PlanEventPublisher` (Map variant) へ送信。

## 7. テレメトリー / モニタリング

- 共通イベント: `MapOverlayInitialized`, `MapOverlayRenderCompleted`, `MapOverlayError`。
- Payload には `overlayId`, `durationMs`, `errorCode` を含め、Phase 3 の監視指標に連携。

## 8. タスク一覧

| ID | タスク | 内容 | 成果物 | 期限 | ステータス |
| --- | --- | --- | --- | --- | --- |
| P2-S5-1 | インターフェース設計 | 本ドキュメント作成 | `docs/refactoring/phase2/map-overlay-interface-plan.md` | 2026-01-31 | ✅ Draft |
| P2-S5-2 | Overlay Registry 案 | 登録 API と ServiceContainer 連携案を詳細化 | Registry 仕様追補 | 2026-02-03 | ✅ 追記済み |
| P2-S5-3 | Pilot Rollout 計画 | Route/TravelTime 先行導入の QA / Flag 戦略策定 | Rollout checklist | 2026-02-05 | ✅ 合意済み |

## 9. リスク & 対策

| リスク | 影響 | 対策 |
| --- | --- | --- |
| 共通 I/F で性能劣化 | Map レイヤー遅延 | render/update を async chunk 化し、計測で閾値超過時は個別最適を許可 |
| 既存 overlay で依存 API が不足 | 実装手戻り | OverlayContext に必要サービスを列挙し合意。足りない場合は Phase2 内で追加 |
| Lazy load でちらつき | UX 低下 | Skeleton を MapInteractionService 側で用意し、overlay 完了イベントで切替 |

## 10. Review Checklist

- [ ] I/F で overlay 共通化に必要なライフサイクルフックが揃っているか
- [ ] Registry / ServiceContainer 連携に抜けがないか
- [ ] ロールアウト手順が Route/TravelTime 先行の現実的プランになっているか
- [ ] テレメトリー項目が Phase3 での監視要件を満たすか

**Approvers**: Map Feature Owner, Frontend Lead, SRE, Product Manager

**Due Date**: 2026-02-05

---
更新履歴
- 2026-01-20: 初版 Draft
