# 段階的移行計画

## 概要

このドキュメントは、VoyageSketchプロジェクトの大規模リファクタリングを安全かつ効率的に実行するための詳細な移行計画です。単一責任原則に基づく設計への移行を、11のフェーズに分けて段階的に実施します。

## 全体スケジュール

```
Phase 1: 基盤整備        [Week 1-2]   ┌─────────────┐
Phase 2: 同期システム    [Week 3-4]   │ テスト実装  │
Phase 3: プラン管理      [Week 5-6]   │ 並行実施    │
Phase 4: ストア再設計    [Week 7-9]   └─────────────┘
Phase 5: 統合・検証      [Week 10-11]
```

### 総実装期間: 11週間 (約2.5ヶ月)

## フェーズ別詳細計画

### Phase 1: 基盤整備とテスト環境構築 (Week 1-2)

#### 目標

- 安全な移行のためのテスト基盤構築
- 現在動作の完全な把握と記録

#### Week 1: テスト環境構築

**Day 1-2: テストフレームワーク設定**

```bash
# 必要なパッケージのインストール
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom @vitest/ui @vitest/coverage-v8
npm install -D playwright msw

# 設定ファイルの作成
touch vite.config.ts vitest.config.ts playwright.config.ts
```

**Day 3-4: テストユーティリティ作成**

- `src/test/utils/testUtils.tsx` - React Testing Library wrapper
- `src/test/mocks/handlers.ts` - MSW API mocks
- `src/test/setup.ts` - テスト環境設定

**Day 5: CI/CD統合**

- GitHub Actions でのテスト自動化
- カバレッジレポート設定

#### Week 2: 現状動作の記録とテスト

**Day 1-3: E2Eテストで現在動作を記録**

```typescript
// tests/e2e/existing-behavior.spec.ts
test("existing plan creation flow", async ({ page }) => {
  // 現在の動作を正確にキャプチャ
});
```

**Day 4-5: 重要機能のスナップショットテスト**

- 主要コンポーネントの出力を記録
- API レスポンスの期待値を記録

#### 成果物・検証項目

- [ ] テスト環境が正常に動作する
- [ ] 既存機能のE2Eテストが全て成功する
- [ ] CI/CDパイプラインでテストが自動実行される

### Phase 2: 同期システムの責任分離 (Week 3-4)

#### 目標

- 複雑な同期システムをシンプルで単一責任のサービスに分離
- 既存機能への影響を最小限に抑制

#### Week 3: 新同期サービス作成

**Day 1-2: SaveService 実装**

```typescript
// src/services/save/SaveService.ts
export class SaveService {
  async saveLocal(plan: TravelPlan): Promise<void>;
  async saveCloud(plan: TravelPlan, userId: string): Promise<void>;
}
```

**Day 3-4: SyncCoordinator 実装**

```typescript
// src/services/sync/SyncCoordinator.ts
export class SyncCoordinator {
  scheduleSync(plan: TravelPlan, strategy: SyncStrategy): Promise<void>;
}
```

**Day 5: RealtimeWatcher 実装**

```typescript
// src/services/sync/RealtimeWatcher.ts
export class RealtimeWatcher {
  watch(planId: string, callback: (plan: TravelPlan) => void): () => void;
}
```

#### Week 4: 統合と段階的移行

**Day 1-2: ConflictResolver 分離**

- 競合解決ロジックを独立したサービスに
- 決定論的な動作を保証

**Day 3-4: useSync フック作成**

```typescript
// src/hooks/useSync.ts
export function useSync(plan: TravelPlan) {
  return {
    isSaving: boolean
    isConflicting: boolean
    lastSaved: Date
    forceSync: () => Promise<void>
  }
}
```

**Day 5: PlanManager での試験運用**

- 1つのコンポーネントで新システムをテスト
- 既存システムとの並行稼働

#### 成果物・検証項目

- [ ] 新同期システムが既存システムと同じ動作をする
- [ ] PlanManager で新システムが正常動作する
- [ ] 既存のE2Eテストが全て成功する
- [ ] パフォーマンスが既存システムと同等以上

### Phase 3: プラン管理の一元化 (Week 5-6)

#### 目標

- 分散したプラン管理ロジックを一元化
- UIとビジネスロジックを明確に分離

#### Week 5: UnifiedPlanService 作成

**Day 1-2: コアサービス実装**

```typescript
// src/services/plan/UnifiedPlanService.ts
export class UnifiedPlanService {
  async createPlan(userId: string, name: string): Promise<PlanOperationResult>;
  async switchPlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult>;
  async deletePlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult>;
}
```

**Day 3-4: エラーハンドリング統一**

- 一貫したエラーメッセージとログ
- ユーザーフレンドリーなエラー表示

**Day 5: 依存性注入設定**

```typescript
// ServiceContainer への UnifiedPlanService 登録
container.registerSingleton('PlanService', () => new UnifiedPlanService(...))
```

#### Week 6: UI層の簡素化

**Day 1-2: PlanManager リファクタリング**

```typescript
// 150行 → 80行 (50%削減目標)
function PlanManager() {
  const planService = useRef(container.get<UnifiedPlanService>("PlanService"));
  // UI表示とイベントハンドリングのみ
}
```

**Day 3-4: 他コンポーネントの移行**

- PlanList, PlanEditModal 等の移行
- ビジネスロジックの除去

**Day 5: 旧コードの削除**

- PlanCoordinator.ts の削除
- usePlanLoad.ts の削除
- 未使用メソッドの除去

#### 成果物・検証項目

- [ ] プラン操作（作成・削除・複製）が正常動作する
- [ ] エラーメッセージが適切に表示される
- [ ] コード行数が目標通り削減される
- [ ] 機能テストが全て成功する

### Phase 4: ストア再設計と依存関係解消 (Week 7-9)

#### 目標

- ストア間の依存関係を完全に排除
- イベント駆動アーキテクチャの導入

#### Week 7: イベントシステム構築

**Day 1-2: イベントバス実装**

```typescript
// src/events/StoreEvents.ts
export type StoreEvent =
  | { type: "PLAN_LOADED"; planId: string; plan: TravelPlan }
  | { type: "PLACE_ADDED"; planId: string; place: Place };

export const storeEventBus = new EventBus<StoreEvent>();
```

**Day 3-4: PlanEventService 実装**

```typescript
// src/services/plan/PlanEventService.ts
export class PlanEventService {
  planLoaded(plan: TravelPlan): void;
  placeAdded(planId: string, place: Place): void;
}
```

**Day 5: イベント発行の仕組み作成**

#### Week 8: ストア独立化

**Day 1-2: planStore の責任限定**

```typescript
// プランメタデータのみ管理（places, labelsは除外）
interface PlanState {
  currentPlan: PlanMetadata | null;
  isLoading: boolean;
  error: string | null;
}
```

**Day 3-4: placesStore と labelsStore の分離**

```typescript
// 各ストアを完全に独立化
interface PlacesState {
  placesByPlan: Map<string, Map<string, Place>>;
  selectedPlaceId: string | null;
}
```

**Day 5: イベントリスナーの実装**

#### Week 9: セレクターと統合

**Day 1-2: セレクター関数作成**

```typescript
// src/store/selectors/planSelectors.ts
export function usePlanWithData(planId: string | null) {
  // 複数ストアからデータを合成
}
```

**Day 3-4: コンポーネント更新**

- セレクター使用への移行
- 直接ストア依存の削除

**Day 5: 旧依存関係の削除**

#### 成果物・検証項目

- [ ] ストア間の直接依存が完全に排除される
- [ ] イベント経由でのデータフローが正常動作する
- [ ] パフォーマンスが維持される
- [ ] すべてのE2Eテストが成功する

### Phase 5: コンポーネント結合度低減 (Week 10-11)

#### 目標

- コンポーネントとストアの密結合を解消
- カスタムフックによる責任分離

#### Week 10: カスタムフック作成

**Day 1-2: usePlanData フック**

```typescript
// src/hooks/usePlanData.ts
export function usePlanData(): PlanDataHook {
  // ストアの詳細を隠蔽
  // ビジネスロジックをカプセル化
}
```

**Day 3-4: 特化フック作成**

```typescript
// src/hooks/useMapData.ts - マップ専用
// src/hooks/useUIState.ts - UI状態専用
```

**Day 5: フックのテスト作成**

#### Week 11: 統合とクリーンアップ

**Day 1-2: 主要コンポーネント移行**

- PlanManager, MapContainer, PlaceList 等
- カスタムフック採用

**Day 3-4: テスト整備**

- コンポーネントテストの更新
- モック可能なテストの作成

**Day 5: 最終クリーンアップ**

- 未使用コードの削除
- imports の整理
- ドキュメント更新

#### 成果物・検証項目

- [ ] コンポーネントが単一責任を持つ
- [ ] テストが容易になる
- [ ] 36個のコンポーネントのストア依存が適切に分離される

## リスク管理と対策

### 高リスクシナリオ

#### 1. 同期システム変更による重大な問題

**リスク**: データ喪失、同期不整合
**対策**:

- Phase 2 で既存システムとの並行稼働
- 十分なテスト期間（2週間）
- ロールバック計画の準備

#### 2. ストア再設計によるパフォーマンス劣化

**リスク**: レンダリング性能の低下
**対策**:

- 各フェーズでのパフォーマンステスト
- メモ化戦略の最適化
- 段階的移行による検証

### 中リスクシナリオ

#### 1. 複雑な状態依存の見落とし

**リスク**: 一部機能の動作不良
**対策**:

- E2Eテストによる動作保証
- 重要フローの手動テスト
- 段階的移行による早期発見

#### 2. チーム学習コストの増大

**リスク**: 開発速度の低下
**対策**:

- 各フェーズでの勉強会実施
- ドキュメント整備
- ペアプログラミングの活用

### 緊急時の対応

#### ロールバック手順

```bash
# 各フェーズでのロールバック用ブランチ作成
git checkout -b backup/before-phase-2
git push origin backup/before-phase-2

# 問題発生時の切り戻し
git checkout backup/before-phase-2
git checkout -b hotfix/rollback-phase-2
```

#### 段階的無効化

新システムの段階的無効化機能を実装：

```typescript
// feature flags による新システムの制御
if (featureFlags.useNewSyncSystem) {
  // 新システム
} else {
  // 既存システム
}
```

## 成功指標 (KPI)

### 技術指標

- **コード行数削減**: 目標30%削減
- **テストカバレッジ**: 80%以上
- **ビルド時間**: 現状維持（悪化しない）
- **バンドルサイズ**: 現状維持または削減

### 品質指標

- **バグ発生率**: 移行期間中の新規バグ数
- **パフォーマンス**: Core Web Vitals の維持
- **ユーザー体験**: 機能のレスポンス時間維持

### プロセス指標

- **開発速度**: 各フェーズの計画通り完了
- **チーム満足度**: リファクタリング後の開発しやすさ
- **保守性**: 新機能追加時の実装時間短縮

## 最終検証項目

### 機能検証

- [ ] すべての既存機能が正常動作する
- [ ] 新しいアーキテクチャが要件を満たす
- [ ] パフォーマンスが要求水準を満たす

### 品質検証

- [ ] テストカバレッジが目標を達成する
- [ ] コード品質が向上している
- [ ] ドキュメントが整備されている

### 運用検証

- [ ] デプロイメントが正常に実行できる
- [ ] 監視・ログ機能が正常動作する
- [ ] エラーハンドリングが適切に動作する

## 移行完了後の保守計画

### 継続的改善

- 月次でのアーキテクチャレビュー
- パフォーマンスモニタリング
- 新たな技術債務の早期発見

### チーム教育

- 新アーキテクチャの研修実施
- ベストプラクティス文書の作成
- コードレビューガイドラインの更新

### 将来拡張への準備

- 新機能追加のためのガイドライン作成
- 外部API連携の標準化
- モバイル対応の検討準備
