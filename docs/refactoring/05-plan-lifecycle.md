# ライフサイクル管理の整理

## 現状の問題点

### プランライフサイクルの複雑性

プランの初期化・読み込み・切り替え・終了処理が複数のファイルに分散：

1. **usePlanLoad.ts** - プラン読み込み処理
2. **PlanCoordinator.ts** - 初期化と切り替え
3. **useRealtimePlanListener.ts** - リアルタイム監視
4. **App.tsx** - アプリケーション初期化
5. **各コンポーネント** - 個別の初期化処理

### 具体的な問題

```typescript
// usePlanLoad.ts - 複雑な初期化ロジック
useEffect(() => {
  if (isInitializing) return;
  (async () => {
    const planFromUrl = loadPlanFromUrl();
    if (planFromUrl) {
      // URL から読み込み
      useSavedPlacesStore.setState({ places: planFromUrl.places });
      useLabelsStore.setState({ labels: planFromUrl.labels });
      usePlanStore.getState().setPlan(planFromUrl);
      return;
    }

    // アクティブプラン読み込み
    let loaded: TravelPlan | null = null;
    if (navigator.onLine && user) {
      loaded = await loadActivePlanHybrid({ mode: "cloud", uid: user.uid });
    }
    if (!loaded) {
      loaded = getActivePlan();
    }

    // 複雑な分岐処理が続く...
  })();
}, [user, isInitializing]);
```

### 問題のあるパターン

- **初期化順序の不確定性**: 複数のuseEffectが相互依存
- **状態の不整合**: 部分的な初期化状態が発生
- **エラーハンドリングの分散**: 各段階でのエラー処理が異なる
- **デバッグの困難性**: どの段階で問題が発生したかの特定が困難

## 目標とする設計

### 統一されたライフサイクル管理

```
初期化 → 読み込み → 監視開始 → 使用中 → 切り替え → 終了
   ↓       ↓       ↓       ↓       ↓      ↓
 Setup → Load → Watch → Active → Switch → Cleanup
```

#### ライフサイクルステート

1. **Uninitialized**: 未初期化状態
2. **Initializing**: 初期化中
3. **Loading**: プラン読み込み中
4. **Active**: アクティブ（使用可能）
5. **Switching**: プラン切り替え中
6. **Error**: エラー状態
7. **Cleanup**: 終了処理中

#### 責任の明確化

- **PlanLifecycleManager**: ライフサイクル全体の制御
- **PlanLoader**: プランの読み込み処理
- **PlanWatcher**: リアルタイム監視
- **StateManager**: 状態の一元管理

## 実装手順

### Step 1: ライフサイクル状態の定義

```typescript
// src/types/PlanLifecycle.ts
export type PlanLifecycleState =
  | "uninitialized"
  | "initializing"
  | "loading"
  | "active"
  | "switching"
  | "error"
  | "cleanup";

export interface PlanLifecycleContext {
  state: PlanLifecycleState;
  currentPlan: TravelPlan | null;
  error: Error | null;
  lastTransition: Date;
  userId: string;
}

export interface LifecycleTransition {
  from: PlanLifecycleState;
  to: PlanLifecycleState;
  timestamp: Date;
  reason: string;
  data?: any;
}
```

### Step 2: ライフサイクルマネージャー

```typescript
// src/services/lifecycle/PlanLifecycleManager.ts
export class PlanLifecycleManager {
  private state: PlanLifecycleState = "uninitialized";
  private context: PlanLifecycleContext;
  private transitions: LifecycleTransition[] = [];
  private cleanupFunctions: (() => void)[] = [];

  constructor(
    private planLoader: PlanLoader,
    private planWatcher: PlanWatcher,
    private stateManager: StateManager,
  ) {}

  async initialize(userId: string): Promise<void> {
    this.transition("uninitialized", "initializing", "User login detected");

    try {
      this.context = {
        state: "initializing",
        currentPlan: null,
        error: null,
        lastTransition: new Date(),
        userId,
      };

      await this.loadInitialPlan(userId);
    } catch (error) {
      this.transition("initializing", "error", "Initialization failed", error);
      throw error;
    }
  }

  private async loadInitialPlan(userId: string): Promise<void> {
    this.transition("initializing", "loading", "Starting plan load");

    try {
      // URL からのプラン読み込みを優先
      const urlPlan = await this.planLoader.loadFromUrl();
      if (urlPlan) {
        await this.activatePlan(urlPlan);
        return;
      }

      // アクティブプランの読み込み
      const activePlan = await this.planLoader.loadActivePlan(userId);
      if (activePlan) {
        await this.activatePlan(activePlan);
        return;
      }

      // プランリストから最初のプランを選択
      const firstPlan = await this.planLoader.loadFirstAvailablePlan(userId);
      if (firstPlan) {
        await this.activatePlan(firstPlan);
        return;
      }

      // プランがない場合は空の状態でアクティブ化
      this.transition("loading", "active", "No plans available - empty state");
      this.stateManager.setEmptyState();
    } catch (error) {
      this.transition("loading", "error", "Plan loading failed", error);
      throw error;
    }
  }

  private async activatePlan(plan: TravelPlan): Promise<void> {
    try {
      // ストアの状態を更新
      this.stateManager.setPlan(plan);

      // リアルタイム監視を開始
      const unsubscribe = this.planWatcher.watch(plan.id, (updatedPlan) => {
        this.handlePlanUpdate(updatedPlan);
      });
      this.cleanupFunctions.push(unsubscribe);

      // アクティブ状態に移行
      this.transition("loading", "active", "Plan activated", {
        planId: plan.id,
      });
      this.context.currentPlan = plan;
    } catch (error) {
      this.transition("loading", "error", "Plan activation failed", error);
      throw error;
    }
  }

  async switchPlan(newPlanId: string): Promise<void> {
    if (this.state !== "active") {
      throw new Error(`Cannot switch plan from state: ${this.state}`);
    }

    this.transition("active", "switching", "Plan switch requested", {
      newPlanId,
    });

    try {
      // 現在の監視を停止
      this.cleanup();

      // 新しいプランを読み込み
      const newPlan = await this.planLoader.loadPlan(
        newPlanId,
        this.context.userId,
      );
      if (!newPlan) {
        throw new Error("Plan not found");
      }

      // 新しいプランをアクティブ化
      await this.activatePlan(newPlan);
    } catch (error) {
      this.transition("switching", "error", "Plan switch failed", error);
      throw error;
    }
  }

  private handlePlanUpdate(updatedPlan: TravelPlan | null): void {
    if (!updatedPlan) {
      // プランが削除された場合
      this.transition("active", "cleanup", "Plan deleted remotely");
      this.cleanup();
      return;
    }

    // プランを更新
    this.stateManager.updatePlan(updatedPlan);
    this.context.currentPlan = updatedPlan;
  }

  cleanup(): void {
    this.transition(this.state, "cleanup", "Cleanup requested");

    // すべてのクリーンアップ関数を実行
    this.cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error("Cleanup function failed:", error);
      }
    });
    this.cleanupFunctions = [];

    // 状態をリセット
    this.state = "uninitialized";
    this.context = {
      state: "uninitialized",
      currentPlan: null,
      error: null,
      lastTransition: new Date(),
      userId: "",
    };
  }

  private transition(
    from: PlanLifecycleState,
    to: PlanLifecycleState,
    reason: string,
    data?: any,
  ): void {
    const transition: LifecycleTransition = {
      from,
      to,
      timestamp: new Date(),
      reason,
      data,
    };

    this.transitions.push(transition);
    this.state = to;
    this.context.state = to;
    this.context.lastTransition = transition.timestamp;

    // デバッグログ
    if (import.meta.env.DEV) {
      console.log(`[PlanLifecycle] ${from} → ${to}: ${reason}`, data);
    }

    // 状態変更を通知
    this.stateManager.notifyStateChange(this.context);
  }

  // デバッグ用
  getTransitionHistory(): LifecycleTransition[] {
    return [...this.transitions];
  }

  getCurrentContext(): PlanLifecycleContext {
    return { ...this.context };
  }
}
```

### Step 3: 統一されたフック

```typescript
// src/hooks/usePlanLifecycle.ts
export function usePlanLifecycle(user: any) {
  const [lifecycleContext, setLifecycleContext] =
    useState<PlanLifecycleContext>({
      state: "uninitialized",
      currentPlan: null,
      error: null,
      lastTransition: new Date(),
      userId: "",
    });

  const lifecycleManagerRef = useRef<PlanLifecycleManager>();

  // 初期化
  useEffect(() => {
    if (!user) return;

    const initializeLifecycle = async () => {
      try {
        if (!lifecycleManagerRef.current) {
          const planLoader = new PlanLoader();
          const planWatcher = new PlanWatcher();
          const stateManager = new StateManager(setLifecycleContext);

          lifecycleManagerRef.current = new PlanLifecycleManager(
            planLoader,
            planWatcher,
            stateManager,
          );
        }

        await lifecycleManagerRef.current.initialize(user.uid);
      } catch (error) {
        console.error("Plan lifecycle initialization failed:", error);
        setLifecycleContext((prev) => ({
          ...prev,
          state: "error",
          error: error as Error,
        }));
      }
    };

    initializeLifecycle();

    // クリーンアップ
    return () => {
      lifecycleManagerRef.current?.cleanup();
    };
  }, [user]);

  // プラン切り替え
  const switchPlan = useCallback(async (planId: string) => {
    if (!lifecycleManagerRef.current) return;

    try {
      await lifecycleManagerRef.current.switchPlan(planId);
    } catch (error) {
      console.error("Plan switch failed:", error);
      setLifecycleContext((prev) => ({
        ...prev,
        state: "error",
        error: error as Error,
      }));
    }
  }, []);

  return {
    ...lifecycleContext,
    switchPlan,
    isReady: lifecycleContext.state === "active",
    isLoading: ["initializing", "loading", "switching"].includes(
      lifecycleContext.state,
    ),
    hasError: lifecycleContext.state === "error",
  };
}
```

### Step 4: App.tsx での統合

```typescript
// src/App.tsx (更新版)
function App() {
  const { user } = useAuth()
  const {
    currentPlan,
    isReady,
    isLoading,
    hasError,
    error,
    switchPlan
  } = usePlanLifecycle(user)

  if (!user) {
    return <LoginPage />
  }

  if (hasError) {
    return <ErrorPage error={error} />
  }

  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <div className="app">
      <PlanProvider value={{ plan: currentPlan, switchPlan }}>
        <MapContainer />
        <UI />
      </PlanProvider>
    </div>
  )
}
```

## 移行計画

### Phase 1: ライフサイクル基盤作成 (2-3日)

- PlanLifecycleManager の実装
- PlanLoader, PlanWatcher, StateManager の作成
- 型定義とインターフェースの整備

### Phase 2: 統合フック作成 (1-2日)

- usePlanLifecycle フックの実装
- 既存フックとの互換性確保
- 単体テストの作成

### Phase 3: App.tsx統合 (1-2日)

- App.tsx での新ライフサイクル採用
- 既存初期化処理との並行稼働
- エラーハンドリングの統合

### Phase 4: 既存フック置き換え (2-3日)

- usePlanLoad.ts の削除
- useRealtimePlanListener の統合
- 各コンポーネントでの移行

### Phase 5: クリーンアップ (1日)

- 未使用コードの削除
- パフォーマンステスト
- ドキュメント更新

## 期待される効果

### コードの明確化

- **初期化処理の一元化**: 1つのフローで管理
- **状態の可視化**: どの段階にいるかが明確
- **エラーハンドリング統一**: 一貫したエラー処理

### デバッグの改善

- **トランジション履歴**: 状態変化の追跡が可能
- **ライフサイクル可視化**: デバッグツールでの状態確認
- **エラー原因の特定**: どの段階で問題が発生したかが明確

### 開発効率の向上

- **予測可能な動作**: 決定論的なライフサイクル
- **テスト容易性**: 各段階を独立してテスト可能
- **メンテナンス性**: 変更の影響範囲が明確

## リスク分析

### 高リスク

- 初期化タイミングの変更
- 既存状態管理との不整合

### 中リスク

- パフォーマンスへの影響
- エラー時の回復処理

### 対策

- 段階的移行による安全性確保
- 十分なテスト期間
- ロールバック計画の準備

### テストシナリオ

- 各ライフサイクル段階での動作確認
- エラー発生時の適切な状態遷移
- 複数プラン間の切り替え動作
