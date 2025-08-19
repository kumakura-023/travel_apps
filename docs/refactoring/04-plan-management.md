# プラン管理の一元化

## 現状の問題点

### 分散したプラン管理

プラン関連の処理が複数のファイルに分散し、責任が不明確：

1. **PlanManager.tsx (150行)** - UI層でのプラン操作
2. **PlanCoordinator.ts (200行)** - プラン初期化・切り替え
3. **planStore.ts (60行)** - 基本状態管理（非推奨メソッド含む）
4. **usePlanLoad.ts (74行)** - プラン読み込みロジック
5. **services/plan/ 配下** - 複数のプランサービス

### 具体的な問題

```typescript
// PlanManager.tsx - UI層なのにビジネスロジックが混在
const handleCreateNewPlan = async () => {
  if (!user) return;

  const newPlan = createEmptyPlan("新しいプラン");
  const payload = serializePlan(newPlan);

  try {
    const planId = await createNewPlan(user, newPlan.name, payload);
    usePlanStore.getState().listenToPlan(planId); // ストア直接操作

    setTimeout(() => {
      usePlanListStore.getState().refreshPlans(); // 複数ストア操作
    }, 500);
  } catch (error) {
    console.error("[PlanManager] Failed to create new plan:", error);
    alert("プランの作成に失敗しました"); // UIロジック混在
  }
};
```

### 循環依存と複雑性

- PlanManager → PlanCoordinator → planStore → usePlanLoad
- 初期化処理が複数箇所に分散
- エラーハンドリングが一貫していない

## 目標とする設計

### 単一責任による階層化

```
UI層: PlanManager (プレゼンテーション)
  ↓
サービス層: PlanService (ビジネスロジック)
  ↓
リポジトリ層: PlanRepository (データアクセス)
  ↓
ストア層: planStore (状態管理)
```

#### 責任の明確化

1. **PlanManager**: UI表示とユーザー操作のハンドリングのみ
2. **PlanService**: プラン操作のビジネスロジック
3. **PlanRepository**: データの永続化とアクセス
4. **planStore**: 純粋な状態管理

## 実装手順

### Step 1: 統一されたPlanService

```typescript
// src/services/plan/UnifiedPlanService.ts
export class UnifiedPlanService {
  constructor(
    private planRepository: PlanRepository,
    private sessionManager: SessionManager,
    private syncService: SyncService,
  ) {}

  // プラン作成
  async createPlan(userId: string, name: string): Promise<PlanOperationResult> {
    try {
      const newPlan = this.createEmptyPlan(name);
      const savedPlan = await this.planRepository.create(newPlan, userId);

      await this.setActivePlan(userId, savedPlan.id);

      return {
        success: true,
        plan: savedPlan,
        message: "プランが作成されました",
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: "プランの作成に失敗しました",
      };
    }
  }

  // プラン切り替え
  async switchPlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult> {
    try {
      const plan = await this.planRepository.get(planId, userId);
      if (!plan) {
        throw new Error("プランが見つかりません");
      }

      await this.setActivePlan(userId, planId);
      this.startRealtimeSync(planId);

      return {
        success: true,
        plan,
        message: "プランを切り替えました",
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: "プランの切り替えに失敗しました",
      };
    }
  }

  // プラン削除
  async deletePlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult> {
    try {
      await this.planRepository.delete(planId, userId);

      // 次のプランに切り替え
      const availablePlans = await this.planRepository.list(userId);
      if (availablePlans.length > 0) {
        await this.switchPlan(userId, availablePlans[0].id);
      } else {
        await this.setActivePlan(userId, "");
      }

      return {
        success: true,
        message: "プランが削除されました",
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: "プランの削除に失敗しました",
      };
    }
  }

  // プラン複製
  async duplicatePlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult> {
    try {
      const originalPlan = await this.planRepository.get(planId, userId);
      if (!originalPlan) {
        throw new Error("複製元のプランが見つかりません");
      }

      const duplicatedPlan = {
        ...originalPlan,
        id: "",
        name: `${originalPlan.name}_コピー`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedPlan = await this.planRepository.create(
        duplicatedPlan,
        userId,
      );
      await this.setActivePlan(userId, savedPlan.id);

      return {
        success: true,
        plan: savedPlan,
        message: "プランが複製されました",
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: "プランの複製に失敗しました",
      };
    }
  }

  // プラン初期化
  async initializePlans(userId: string): Promise<PlanOperationResult> {
    try {
      // プランリストを更新
      await this.refreshPlanList();

      // アクティブプランを取得
      const activePlanId = await this.getActivePlanId(userId);
      const availablePlans = await this.planRepository.list(userId);

      if (activePlanId && availablePlans.some((p) => p.id === activePlanId)) {
        // 既存のアクティブプランがある場合
        return await this.switchPlan(userId, activePlanId);
      } else if (availablePlans.length > 0) {
        // アクティブプランがない場合は最初のプランを選択
        return await this.switchPlan(userId, availablePlans[0].id);
      } else {
        // プランがない場合は空の状態
        return {
          success: true,
          message: "プランが見つかりません",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: "プランの初期化に失敗しました",
      };
    }
  }

  private async setActivePlan(userId: string, planId: string): Promise<void> {
    // ストアとリポジトリの両方を更新
    await this.planRepository.setActive(userId, planId);
    planStore.getState().setActivePlan(planId);
  }

  private startRealtimeSync(planId: string): void {
    this.syncService.startListening(planId);
  }
}
```

### Step 2: 簡素化されたPlanManager

```typescript
// src/components/PlanManager.tsx (新しいバージョン)
export default function PlanManager() {
  const { user } = useAuth()
  const { plan } = usePlanStore()
  const planService = useRef(container.get<UnifiedPlanService>('PlanService'))

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // プラン作成
  const handleCreatePlan = async () => {
    if (!user) return

    setIsLoading(true)
    const result = await planService.current.createPlan(user.uid, '新しいプラン')

    setMessage(result.message)
    setIsLoading(false)

    if (!result.success) {
      console.error('Plan creation failed:', result.error)
    }
  }

  // プラン複製
  const handleDuplicatePlan = async () => {
    if (!user || !plan) return

    setIsLoading(true)
    const result = await planService.current.duplicatePlan(user.uid, plan.id)

    setMessage(result.message)
    setIsLoading(false)

    if (!result.success) {
      console.error('Plan duplication failed:', result.error)
    }
  }

  // プラン削除
  const handleDeletePlan = async () => {
    if (!user || !plan) return
    if (!confirm('本当に削除しますか？')) return

    setIsLoading(true)
    const result = await planService.current.deletePlan(user.uid, plan.id)

    setMessage(result.message)
    setIsLoading(false)

    if (!result.success) {
      console.error('Plan deletion failed:', result.error)
    }
  }

  // プラン名変更
  const handleNameChange = async (newName: string) => {
    if (!user || !plan) return

    const result = await planService.current.updatePlanName(user.uid, plan.id, newName)
    if (!result.success) {
      console.error('Plan name update failed:', result.error)
      setMessage(result.message)
    }
  }

  if (!user) {
    return <div className="text-gray-500 text-sm">プラン管理にはログインが必要です。</div>
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`text-sm p-2 rounded ${
          message.includes('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <PlanCreateButton onClick={handleCreatePlan} disabled={isLoading} />

      {plan && (
        <>
          <PlanNameEditor
            name={plan.name}
            onChange={handleNameChange}
            disabled={isLoading}
          />
          <PlanActionButtons
            onDuplicate={handleDuplicatePlan}
            onDelete={handleDeletePlan}
            disabled={isLoading}
          />
        </>
      )}

      <PlanList />
    </div>
  )
}
```

### Step 3: 型定義の整理

```typescript
// src/types/PlanOperations.ts
export interface PlanOperationResult {
  success: boolean;
  plan?: TravelPlan;
  error?: Error;
  message: string;
}

export interface PlanServiceConfig {
  autoSyncEnabled: boolean;
  conflictResolutionStrategy: ConflictResolutionStrategy;
  offlineMode: boolean;
}
```

### Step 4: 依存性注入の設定

```typescript
// src/services/ServiceContainer.ts (更新)
container.registerSingleton(
  "PlanService",
  () =>
    new UnifiedPlanService(
      container.get("PlanRepository"),
      container.get("SessionManager"),
      container.get("SyncService"),
    ),
);
```

## 移行計画

### Phase 1: 新PlanService作成 (2-3日)

- UnifiedPlanService の実装
- 型定義とインターフェースの作成
- 単体テストの作成

### Phase 2: PlanManager簡素化 (1-2日)

- 新しいPlanManager の実装
- UIコンポーネントの分離
- エラーハンドリングの統一

### Phase 3: 段階的移行 (2-3日)

- PlanCoordinator の責任をPlanService に移行
- usePlanLoad の統合
- 既存機能との互換性確保

### Phase 4: クリーンアップ (1-2日)

- 旧PlanCoordinator, usePlanLoad の削除
- 未使用コードの削除
- ドキュメント更新

## 期待される効果

### コードの簡素化

- **PlanManager: 150行 → 80行** (50%削減)
- **責任の明確化**: UIとビジネスロジックの分離
- **エラーハンドリング統一**: 一貫したユーザー体験

### 保守性の向上

- **単一責任原則**: 各層が明確な責任を持つ
- **テスト容易性**: ビジネスロジックの単体テストが可能
- **変更影響の局所化**: 機能変更の影響範囲が明確

### 開発効率の向上

- **新機能追加**: 統一されたインターフェース
- **バグ修正**: 問題箇所の特定が容易
- **チーム開発**: 責任分界が明確

## リスク分析

### 高リスク

- プラン操作の互換性変更
- 既存のリアルタイム同期への影響

### 中リスク

- パフォーマンスへの影響
- エラーメッセージの変更

### 対策

- 段階的移行による影響最小化
- 十分なテスト期間
- ユーザー受け入れテスト

### テストシナリオ

- プラン作成・削除・複製の動作確認
- エラー時の適切なメッセージ表示
- リアルタイム同期との連携確認
