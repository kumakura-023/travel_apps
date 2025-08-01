# PlanNameDisplay非表示問題 - リファクタリング後の調査結果

## 問題の概要
リファクタリング後もPlanNameDisplayが表示されない問題が継続している。

## ログ分析

### 重要なログメッセージ
```
usePlanLoad.ts:62 [usePlanLoad] No plans available
planStore.ts:38 [planStore] setActivePlanId is deprecated. Use ActivePlanService instead.
```

### 観察された事象
1. **古いコードが動作している**: `usePlanLoad`からのログが出力されている
2. **新しいコードからのログがない**: `PlanCoordinator`関連のログが一切出力されていない
3. **プランがnullに設定されている**: `usePlanLoad`が`setPlan(null)`を実行

## 根本原因

### 1. 初期化の競合
App.tsxで新旧両方の初期化ロジックが実行されている：
```typescript
// 132行目：新しい初期化
const { isInitialized } = usePlanInitializer();

// 135行目：古い初期化（一時的に残す）
usePlanLoad(user, isInitializing);
```

### 2. 実行順序の問題
1. `usePlanInitializer`が実行を開始
2. `usePlanLoad`も同時に実行
3. `usePlanLoad`が「プランなし」と判断して`setPlan(null)`を実行
4. 結果として`plan`が`null`になり、PlanNameDisplayが非表示

### 3. 新しいアーキテクチャの実装不完全
- `PlanCoordinator`がエラーで初期化されていない可能性
- DIContainerの依存関係が正しく構築されていない可能性

## 解決策

### 即座の解決策（推奨）
App.tsxから古い初期化コードを削除：

```typescript
// src/App.tsx - 135-136行目を削除またはコメントアウト
// usePlanLoad(user, isInitializing);  // 削除
// useRealtimePlanListener(user, isInitializing, lastCloudSaveTimestamp, setIsRemoteUpdateInProgress, getSelfUpdateFlag);  // 削除
```

### 追加の修正が必要な場合

#### 1. PlanCoordinatorにログを追加
```typescript
// src/coordinators/PlanCoordinator.ts
async initialize(userId: string): Promise<void> {
  console.log('[PlanCoordinator] Initializing for user:', userId);
  try {
    const activePlanId = await this.activePlanService.getActivePlanId(userId);
    console.log('[PlanCoordinator] Active plan ID:', activePlanId);
    
    if (activePlanId) {
      await this.loadAndListenToPlan(activePlanId);
    } else {
      console.log('[PlanCoordinator] No active plan, setting empty state');
      this.setEmptyState();
    }
  } catch (error) {
    console.error('[PlanCoordinator] Failed to initialize:', error);
    this.setErrorState(error);
  }
}
```

#### 2. プランリストの初期化を確認
新しいアーキテクチャでは、プランリストの初期化も必要です。PlanCoordinatorの初期化時に：

```typescript
async initialize(userId: string): Promise<void> {
  try {
    // プランリストを先に初期化
    await usePlanListStore.getState().refreshPlans();
    
    // その後でアクティブプランを処理
    const activePlanId = await this.activePlanService.getActivePlanId(userId);
    // ...続き
  }
}
```

#### 3. エラーハンドリングの改善
現在のPlanNameDisplay.tsxはplanがnullの場合に非表示になります。これを改善：

```typescript
// src/components/PlanNameDisplay.tsx
const PlanNameDisplay: React.FC<PlanNameDisplayProps> = ({ activeTab }) => {
  const { plan, isLoading, error } = usePlanStore();
  
  if (activeTab === 'list') return null;
  
  // ローディング中の表示
  if (isLoading) {
    return (
      <div className={`fixed z-30 ...`}>
        <div>読み込み中...</div>
      </div>
    );
  }
  
  // エラー時の表示
  if (error) {
    return (
      <div className={`fixed z-30 ...`}>
        <div>エラー: {error}</div>
      </div>
    );
  }
  
  // プランがない場合の表示
  if (!plan) {
    return (
      <div className={`fixed z-30 ...`}>
        <button onClick={() => setNameModal(true)}>
          + 新しいプランを作成
        </button>
      </div>
    );
  }
  
  // 既存の表示ロジック...
}
```

## テスト手順

1. **App.tsxから古いコードを削除**
2. **アプリをリロード**
3. **コンソールログを確認**
   - `[PlanCoordinator]`のログが出力されるか
   - `[usePlanLoad]`のログが出力されないか
4. **PlanNameDisplayの表示を確認**

## 期待される結果

リファクタリング後の新しいアーキテクチャが正しく動作すれば：
1. 単一の初期化フローのみが実行される
2. データの整合性が保たれる
3. PlanNameDisplayが適切に表示される

## まとめ

リファクタリング後も問題が継続している原因は、**新旧両方の初期化コードが混在していること**です。古いコードを完全に削除することで、新しいアーキテクチャが正しく動作するはずです。