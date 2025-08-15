# 自動保存の簡略化

## 現状の問題点

### useAutoSave フックの複雑性
- **272行の巨大なフック**
- **複数の責任**：保存 + 同期 + エラーハンドリング + 状態管理
- **複雑な状態管理**：11個のref + 4個のstate
- **デバッグが困難**：多数のタイムスタンプとフラグ管理

### 具体的な問題
```typescript
// 現在のuseAutoSave - 複雑すぎる状態管理
const lastSavedTimestampRef = useRef<number>(0);
const lastPlanHashRef = useRef<string>('');
const changeCountRef = useRef<number>(0);
const lastLocalSaveRef = useRef<number>(0);
const lastCloudSaveRef = useRef<number>(0);
const cloudSaveTimestampRef = useRef<number>(0);
const isWritingToCloudRef = useRef<boolean>(false);
const lastWriteCompletedRef = useRef<number>(0);
```

### 重複する機能
- `saveImmediately` と `saveImmediatelyCloud` が類似
- `batchCloudSync` と `saveImmediatelyCloud` の違いが不明確
- SyncManagerとの機能重複

## 目標とする設計

### シンプルな自動保存システム

```
自動保存 = 変更検知 + 保存スケジューリング + 実行
```

#### 責任の明確化
1. **変更検知**: プランの変更を監視
2. **保存スケジューリング**: いつ保存するかを決定
3. **保存実行**: 実際の保存処理

#### 設計原則
- **単一の保存関数**: `save(plan, options)`
- **シンプルな状態**: `{ isSaving, lastSaved, error }`
- **明確な戦略**: immediate | debounced | manual

## 実装手順

### Step 1: シンプルな保存サービス
```typescript
// src/services/save/AutoSaveService.ts
export class AutoSaveService {
  private strategy: SaveStrategy = 'debounced'
  private debounceMs = 1000
  
  async save(plan: TravelPlan, strategy?: SaveStrategy): Promise<void> {
    switch (strategy || this.strategy) {
      case 'immediate':
        return this.saveImmediate(plan)
      case 'debounced':
        return this.saveDebounced(plan)
      case 'manual':
        return // no-op
    }
  }
  
  private async saveImmediate(plan: TravelPlan): Promise<void>
  private async saveDebounced(plan: TravelPlan): Promise<void>
}
```

### Step 2: 新しいuseAutoSaveフック
```typescript
// src/hooks/useAutoSave.ts (新しいバージョン)
export function useAutoSave(plan: TravelPlan | null, options?: AutoSaveOptions) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null
  })
  
  const autoSaveService = useRef(new AutoSaveService(options))
  
  const save = useCallback(async (strategy?: SaveStrategy) => {
    if (!plan) return
    
    setState(prev => ({ ...prev, isSaving: true, error: null }))
    
    try {
      await autoSaveService.current.save(plan, strategy)
      setState(prev => ({ 
        ...prev, 
        isSaving: false, 
        lastSaved: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isSaving: false, 
        error: error as Error 
      }))
    }
  }, [plan])
  
  // プラン変更時の自動保存
  useEffect(() => {
    if (plan && options?.autoSave !== false) {
      save('debounced')
    }
  }, [plan, save, options?.autoSave])
  
  return {
    ...state,
    save,
    saveImmediate: () => save('immediate')
  }
}
```

### Step 3: 型定義の整理
```typescript
// src/types/AutoSave.ts
export type SaveStrategy = 'immediate' | 'debounced' | 'manual'

export interface AutoSaveOptions {
  autoSave?: boolean
  strategy?: SaveStrategy
  debounceMs?: number
  localOnly?: boolean
}

export interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
}
```

### Step 4: 段階的な移行
```typescript
// 既存のuseAutoSave.tsを一時的にrename
// mv useAutoSave.ts useAutoSaveLegacy.ts

// 新しいuseAutoSave.tsを作成
// 既存のコンポーネントを1つずつ移行
```

## コンポーネントでの使用例

### Before (複雑)
```typescript
const {
  isSaving,
  isSynced,
  isRemoteUpdateInProgress,
  setIsRemoteUpdateInProgress,
  lastSavedTimestamp,
  lastCloudSaveTimestamp,
  saveImmediately,
  saveImmediatelyCloud,
  saveWithSyncManager,
  syncManager,
  getSelfUpdateFlag
} = useAutoSave(plan, handleSave)
```

### After (シンプル)
```typescript
const { isSaving, lastSaved, error, save, saveImmediate } = useAutoSave(plan, {
  strategy: 'debounced',
  debounceMs: 2000
})
```

## 移行計画

### Phase 1: 新サービス作成 (1日)
- AutoSaveService の実装
- 新しいuseAutoSaveフックの作成
- 型定義の整理

### Phase 2: テストとvalidation (1日)
- 単体テストの作成
- PlanManagerでの試用
- パフォーマンステスト

### Phase 3: 段階的移行 (2-3日)
- 主要コンポーネントの移行
- 旧useAutoSaveとの並行稼働
- バグ修正とデバッグ

### Phase 4: クリーンアップ (1日)
- 旧useAutoSave.tsの削除
- 未使用imports の削除
- ドキュメント更新

## 期待される効果

### コードの簡素化
- **272行 → 約60行** (75%削減)
- **11個のref → 1個のstate** (90%削減)
- **3つの保存関数 → 1つの統一関数**

### 保守性の向上
- 単一責任原則の適用
- テストが容易
- デバッグが簡単

### パフォーマンス改善
- 不要な再レンダリング削減
- メモリ使用量の最適化
- 処理時間の短縮

## リスク分析

### 高リスク
- 既存の自動保存動作への影響
- コンポーネント間の連携問題

### 中リスク
- 保存タイミングの変更
- エラーハンドリングの変更

### 対策
- 十分なテスト期間
- 段階的移行
- ロールバック計画

### テストシナリオ
- 高頻度変更時の保存動作
- ネットワーク断絶時の動作
- 同時編集時の競合解決