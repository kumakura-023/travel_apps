# 同期システムの責任分離

## 現状の問題点

### 複雑な相互依存関係
- `useAutoSave`、`SyncManager`、`useRealtimePlanListener`が密結合
- 同期ロジックが複数のファイルに分散
- 責任の境界が不明確

### 具体的な問題
1. **useAutoSave (270行)**
   - プラン保存 + 同期管理 + エラーハンドリング + 状態管理
   - 単一ファイルで複数の責任を持つ
   - SyncManagerとの重複する機能

2. **SyncManager (300行以上)**
   - 同期操作管理 + デバウンス + バッチ処理 + 書き込み制限
   - 設定可能性が高すぎて複雑
   - 使用箇所が限定的

3. **useRealtimePlanListener (180行)**
   - リアルタイム監視 + 競合解決 + 状態更新
   - 自己更新判定ロジックが複雑
   - デバッグ用コードが混在

## 目標とする設計

### 単一責任の原則に基づく分離

```
同期システム = 保存層 + 同期層 + 監視層
```

#### 1. 保存層 (SaveService)
- **責任**: データの永続化のみ
- **機能**: ローカル/クラウド保存の実行
- **依存**: なし

#### 2. 同期層 (SyncCoordinator)
- **責任**: 同期戦略の調整のみ
- **機能**: 保存タイミングの制御、デバウンス
- **依存**: SaveService

#### 3. 監視層 (RealtimeWatcher)
- **責任**: リアルタイム変更の監視のみ
- **機能**: Firebase監視、変更通知
- **依存**: なし

#### 4. 競合解決層 (ConflictResolver)
- **責任**: データ競合の解決のみ
- **機能**: マージアルゴリズム
- **依存**: なし

## 実装手順

### Step 1: SaveService の作成
```typescript
// src/services/save/SaveService.ts
export class SaveService {
  async saveLocal(plan: TravelPlan): Promise<void>
  async saveCloud(plan: TravelPlan, userId: string): Promise<void>
  async saveHybrid(plan: TravelPlan, config: SaveConfig): Promise<void>
}
```

### Step 2: SyncCoordinator の作成
```typescript
// src/services/sync/SyncCoordinator.ts
export class SyncCoordinator {
  private saveService: SaveService
  private debounceTimer: Map<string, Timer>
  
  scheduleSync(plan: TravelPlan, strategy: SyncStrategy): Promise<void>
  cancelSync(planId: string): void
}
```

### Step 3: RealtimeWatcher の作成
```typescript
// src/services/sync/RealtimeWatcher.ts
export class RealtimeWatcher {
  watch(planId: string, callback: (plan: TravelPlan) => void): () => void
  stopWatching(planId: string): void
}
```

### Step 4: ConflictResolver の分離
```typescript
// src/services/sync/ConflictResolver.ts
export class ConflictResolver {
  resolve(local: TravelPlan, remote: TravelPlan): TravelPlan
  detectConflicts(local: TravelPlan, remote: TravelPlan): Conflict[]
}
```

### Step 5: 統合フック useSync の作成
```typescript
// src/hooks/useSync.ts
export function useSync(plan: TravelPlan) {
  // 上記サービスを組み合わせたシンプルなインターフェース
  return {
    isSaving: boolean
    isConflicting: boolean
    lastSaved: Date
    forceSync: () => Promise<void>
  }
}
```

## 移行計画

### Phase 1: 新サービス作成 (1-2日)
- SaveService, SyncCoordinator, RealtimeWatcher, ConflictResolver を作成
- 既存コードはそのまま保持

### Phase 2: 部分的置き換え (2-3日)
- 新しいuseSyncフックを作成
- 1つのコンポーネントで新システムをテスト
- 既存システムと並行稼働

### Phase 3: 段階的移行 (3-4日)
- 主要コンポーネントを順次移行
- 旧システムの依存を削除
- テストとバグ修正

### Phase 4: クリーンアップ (1日)
- useAutoSave, SyncManager, useRealtimePlanListener を削除
- 未使用コードの削除
- ドキュメント更新

## 期待される効果

### 保守性の向上
- 各サービスが単一責任を持つ
- テストが容易になる
- バグの特定が簡単になる

### パフォーマンス改善
- 不要な再レンダリングの削減
- メモリ使用量の最適化
- 同期処理の効率化

### 開発速度の向上
- 新機能追加が容易
- デバッグ時間の短縮
- コードレビューの質向上

## リスク管理

### 高リスク箇所
- 既存の自動保存機能への影響
- リアルタイム同期の停止

### 対策
- 段階的移行による影響最小化
- 十分なテスト期間の確保
- ロールバック計画の準備

### テスト戦略
- 新旧システムの並行テスト
- エッジケースの事前検証
- ユーザー受け入れテスト