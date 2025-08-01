# PlanNameDisplay問題 - リファクタリング後の修正タスク

## 問題の概要
リファクタリング後、新旧の初期化コードが混在して競合状態が発生し、PlanNameDisplayが表示されない。

## Task 1: 古い初期化コードの削除（必須・最優先）

### 1.1 App.tsxの修正
```typescript
// src/App.tsx - 135-136行目を削除

// 削除前
usePlanLoad(user, isInitializing);
useRealtimePlanListener(user, isInitializing, lastCloudSaveTimestamp, setIsRemoteUpdateInProgress, getSelfUpdateFlag);

// 削除後（これらの行を完全に削除）
// 何も残さない
```

### 1.2 不要なインポートの削除
```typescript
// src/App.tsx - 30-32行目のインポートを削除
// import { usePlanLoad } from './hooks/usePlanLoad';  // 削除
// import { useRealtimePlanListener } from './hooks/useRealtimePlanListener';  // 削除
```

## Task 2: PlanCoordinatorのデバッグログ追加（推奨）

### 2.1 初期化メソッドにログを追加
```typescript
// src/coordinators/PlanCoordinator.ts - initialize メソッドを修正

async initialize(userId: string): Promise<void> {
  console.log('[PlanCoordinator] Starting initialization for user:', userId);
  try {
    // プランリストを先に初期化（重要）
    console.log('[PlanCoordinator] Refreshing plan list...');
    await usePlanListStore.getState().refreshPlans();
    
    const activePlanId = await this.activePlanService.getActivePlanId(userId);
    console.log('[PlanCoordinator] Retrieved active plan ID:', activePlanId);
    
    if (activePlanId) {
      console.log('[PlanCoordinator] Loading and listening to plan:', activePlanId);
      await this.loadAndListenToPlan(activePlanId);
    } else {
      console.log('[PlanCoordinator] No active plan found, setting empty state');
      // プランリストから最初のプランを選択
      const { plans } = usePlanListStore.getState();
      if (plans.length > 0) {
        console.log('[PlanCoordinator] Found plans in list, selecting first:', plans[0].id);
        await this.switchPlan(userId, plans[0].id);
      } else {
        console.log('[PlanCoordinator] No plans available, keeping empty state');
        this.setEmptyState();
      }
    }
    console.log('[PlanCoordinator] Initialization completed');
  } catch (error) {
    console.error('[PlanCoordinator] Failed to initialize:', error);
    this.setErrorState(error);
  }
}
```

### 2.2 loadAndListenToPlanメソッドにログを追加
```typescript
// src/coordinators/PlanCoordinator.ts - loadAndListenToPlan メソッドに追加

private async loadAndListenToPlan(planId: string): Promise<void> {
  console.log('[PlanCoordinator] loadAndListenToPlan called for:', planId);
  
  usePlanStore.setState({ isLoading: true });
  
  const plan = await this.planService.loadPlan(planId);
  console.log('[PlanCoordinator] Plan loaded:', plan?.id, plan?.name);
  
  if (plan) {
    this.updateStores(plan);
    
    this.currentPlanUnsubscribe = this.planService.listenToPlan(
      planId,
      (updatedPlan) => {
        console.log('[PlanCoordinator] Plan updated via listener:', updatedPlan?.id);
        if (updatedPlan) {
          this.updateStores(updatedPlan);
        } else {
          console.log('[PlanCoordinator] Plan deleted, setting empty state');
          this.setEmptyState();
        }
      }
    );
  } else {
    console.log('[PlanCoordinator] Plan not found, setting empty state');
    this.setEmptyState();
  }
}
```

## Task 3: PlanListStore初期化の確認（重要）

### 3.1 PlanCoordinatorのインポートに追加
```typescript
// src/coordinators/PlanCoordinator.ts - インポート部分に追加
import { usePlanListStore } from '../store/planListStore';
```

## Task 4: エラー時の表示改善（推奨）

### 4.1 PlanNameDisplay.tsxの改善
```typescript
// src/components/PlanNameDisplay.tsx - 既存のコンポーネントを修正

const PlanNameDisplay: React.FC<PlanNameDisplayProps> = ({ activeTab }) => {
  const { plan, isLoading, error } = usePlanStore();
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // リスト表示画面では非表示にする
  if (activeTab === 'list') return null;

  // 基本のクラス名
  const baseClassName = `fixed z-30 
                        glass-effect-border rounded-xl 
                        px-4 py-3 
                        text-system-label
                        transition-all duration-150 ease-ios-default
                        ${
                          isDesktop
                            ? 'top-4 left-1/2 -translate-x-1/2 max-w-[280px]'
                            : isTablet
                            ? 'top-4 right-4 max-w-[280px]'
                            : 'top-20 left-1/2 -translate-x-1/2 w-[60%] max-w-[calc(100vw-3rem)] scale-[0.70] origin-top'
                        }`;

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className={baseClassName}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-coral-500"></div>
          <span className="text-system-secondary-label text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  // エラー時の表示（デバッグ用）
  if (error && !plan) {
    return (
      <div className={baseClassName}>
        <div className="text-red-500 text-sm">
          エラー: {error}
        </div>
      </div>
    );
  }

  // プランがない場合の表示
  if (!plan) {
    return (
      <>
        <div className={baseClassName}>
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => setNameModal(true)}
              className="flex items-center space-x-2 text-coral-500 hover:text-coral-600 
                         font-medium transition-all duration-150 ease-ios-default"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className="text-[16px]">新しいプランを作成</span>
            </button>
            <p className="text-system-secondary-label text-[12px]">
              プランがありません
            </p>
          </div>
        </div>

        {/* モーダル */}
        <PlanNameEditModal isOpen={nameModal} onClose={() => setNameModal(false)} />
      </>
    );
  }

  // 以下、既存のプラン表示ロジック...
  const formatDateRange = () => {
    // 既存のコード
  };

  // 既存の表示部分をそのまま返す
  return (
    <>
      {/* 既存のJSX */}
    </>
  );
};
```

## Task 5: 古いコードの完全削除（クリーンアップ）

### 5.1 削除対象ファイル（確認後に削除）
- `src/hooks/usePlanLoad.ts`
- `src/hooks/useRealtimePlanListener.ts`

### 5.2 planStore.tsの互換性メソッド削除
```typescript
// src/store/planStore.ts - 将来的に削除

// 現在は警告を出すだけだが、動作確認後は以下のメソッドを削除：
// - setPlan
// - updatePlan  
// - listenToPlan
// - unsubscribeFromPlan
// - updateLastActionPosition
// - setActivePlanId
```

## 実行順序

1. **Task 1を最優先で実行** - 競合状態を解消
2. **Task 2を実行** - デバッグログで動作確認
3. **Task 3を確認** - プランリストの初期化
4. **Task 4を実行** - UI/UXの改善
5. **Task 5は動作確認後** - クリーンアップ

## テスト手順

1. 修正後、ブラウザの開発者ツールでコンソールを開く
2. アプリをリロード
3. 以下のログを確認：
   - `[PlanCoordinator]`で始まるログが出力される
   - `[usePlanLoad]`のログが出力されない
   - エラーが発生していない
4. PlanNameDisplayが表示されることを確認
5. プランがない場合は「新しいプランを作成」ボタンが表示されることを確認

## 期待される結果

- 新しいアーキテクチャのみが動作
- PlanNameDisplayが適切に表示される
- プランがない場合も適切なUIが表示される
- エラーやローディング状態が適切に表示される