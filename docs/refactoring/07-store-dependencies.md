# ストア間依存の解消

## 現状の問題点

### 複雑なストア間依存関係
現在のアーキテクチャでは、ストア間で複雑な依存関係が形成されています：

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│  planStore  │────│ savedPlacesStore │────│ labelsStore │
└─────────────┘    └──────────────────┘    └─────────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌─────────────────┐
                    │ planListStore   │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │   uiStore       │
                    └─────────────────┘
```

### 具体的な問題例
```typescript
// PlanCoordinator.ts - 複数ストアの直接操作
private updateStores(plan: TravelPlan): void {
  // プラン切り替え時にオーバーレイを一時的にクリア
  useSavedPlacesStore.getState().clearPlaces();
  useLabelsStore.setState({ labels: [] });
  
  // 各ストアを個別に更新
  usePlanStore.getState().setPlan(plan);
  useSavedPlacesStore.setState({ places: plan.places || [] });
  useLabelsStore.setState({ labels: plan.labels || [] });
}
```

### 問題のあるパターン
1. **循環依存**: A → B → C → A の依存チェーン
2. **カスケード更新**: 1つの変更が複数ストアに波及
3. **手動同期**: 開発者が手動でストア間を同期
4. **暗黙的依存**: どのストアがどのストアに依存するか不明確

## 目標とする設計

### 依存関係のない独立したストア

```
Service Layer (Events)
       │
       ▼
┌─────────────┐  ┌──────────────────┐  ┌─────────────┐
│  planStore  │  │   placesStore    │  │ labelsStore │
│ (独立)      │  │   (独立)         │  │  (独立)     │
└─────────────┘  └──────────────────┘  └─────────────┘
       │                 │                    │
       └─────────────────┼────────────────────┘
                         │
                ┌─────────────────┐
                │ Computed Store  │
                │ (読み取り専用)   │
                └─────────────────┘
```

#### 設計原則
1. **イベント駆動**: ストア間の通信はイベント経由
2. **単方向データフロー**: サービス → ストア → コンポーネント
3. **独立性**: 各ストアは他のストアを直接参照しない
4. **合成**: 複数のデータが必要な場合は計算プロパティで合成

## 実装手順

### Step 1: イベントベースの通信
```typescript
// src/events/StoreEvents.ts
export type StoreEvent = 
  | { type: 'PLAN_LOADED'; planId: string; plan: TravelPlan }
  | { type: 'PLAN_UPDATED'; planId: string; changes: Partial<TravelPlan> }
  | { type: 'PLAN_DELETED'; planId: string }
  | { type: 'PLACE_ADDED'; planId: string; place: Place }
  | { type: 'PLACE_UPDATED'; planId: string; placeId: string; changes: Partial<Place> }
  | { type: 'PLACE_DELETED'; planId: string; placeId: string }
  | { type: 'LABEL_ADDED'; planId: string; label: Label }
  | { type: 'LABEL_UPDATED'; planId: string; labelId: string; changes: Partial<Label> }
  | { type: 'LABEL_DELETED'; planId: string; labelId: string }

// イベントバスの作成
export const storeEventBus = new EventBus<StoreEvent>()
```

### Step 2: 独立したストアの実装
```typescript
// src/store/planStore.ts (独立版)
interface PlanState {
  plans: Map<string, PlanMetadata>
  currentPlanId: string | null
  isLoading: boolean
  error: string | null
}

export const usePlanStore = create<PlanState>((set, get) => {
  // イベントリスナーの設定
  storeEventBus.on('PLAN_LOADED', (event) => {
    if (event.type === 'PLAN_LOADED') {
      set((state) => ({
        plans: new Map(state.plans.set(event.planId, {
          id: event.plan.id,
          name: event.plan.name,
          createdAt: event.plan.createdAt,
          updatedAt: event.plan.updatedAt,
          // places と labels は除外
        })),
        currentPlanId: event.planId
      }))
    }
  })
  
  storeEventBus.on('PLAN_UPDATED', (event) => {
    if (event.type === 'PLAN_UPDATED') {
      set((state) => {
        const plan = state.plans.get(event.planId)
        if (plan) {
          const updatedPlans = new Map(state.plans)
          updatedPlans.set(event.planId, { ...plan, ...event.changes })
          return { plans: updatedPlans }
        }
        return state
      })
    }
  })
  
  return {
    plans: new Map(),
    currentPlanId: null,
    isLoading: false,
    error: null,
    
    // ストア固有の操作のみ
    getCurrentPlan: () => {
      const { plans, currentPlanId } = get()
      return currentPlanId ? plans.get(currentPlanId) || null : null
    },
    
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error })
  }
})
```

### Step 3: 場所ストアの独立化
```typescript
// src/store/placesStore.ts (独立版)
interface PlacesState {
  placesByPlan: Map<string, Map<string, Place>>
  selectedPlaceId: string | null
}

export const usePlacesStore = create<PlacesState>((set, get) => {
  // イベントリスナー
  storeEventBus.on('PLAN_LOADED', (event) => {
    if (event.type === 'PLAN_LOADED') {
      const placesMap = new Map<string, Place>()
      event.plan.places?.forEach(place => {
        placesMap.set(place.id, place)
      })
      
      set((state) => ({
        placesByPlan: new Map(state.placesByPlan.set(event.planId, placesMap))
      }))
    }
  })
  
  storeEventBus.on('PLACE_ADDED', (event) => {
    if (event.type === 'PLACE_ADDED') {
      set((state) => {
        const planPlaces = state.placesByPlan.get(event.planId) || new Map()
        const updatedPlaces = new Map(planPlaces.set(event.place.id, event.place))
        const updatedPlans = new Map(state.placesByPlan.set(event.planId, updatedPlaces))
        
        return { placesByPlan: updatedPlans }
      })
    }
  })
  
  return {
    placesByPlan: new Map(),
    selectedPlaceId: null,
    
    // 計算プロパティ
    getPlacesForPlan: (planId: string) => {
      const planPlaces = get().placesByPlan.get(planId) || new Map()
      return Array.from(planPlaces.values()).filter(p => !p.deleted)
    },
    
    getPlaceById: (planId: string, placeId: string) => {
      const planPlaces = get().placesByPlan.get(planId)
      return planPlaces?.get(placeId)
    },
    
    selectPlace: (placeId: string | null) => set({ selectedPlaceId: placeId })
  }
})
```

### Step 4: サービス層でのイベント発行
```typescript
// src/services/plan/PlanEventService.ts
export class PlanEventService {
  constructor(private eventBus: EventBus<StoreEvent>) {}
  
  planLoaded(plan: TravelPlan): void {
    this.eventBus.emit({
      type: 'PLAN_LOADED',
      planId: plan.id,
      plan
    })
  }
  
  planUpdated(planId: string, changes: Partial<TravelPlan>): void {
    this.eventBus.emit({
      type: 'PLAN_UPDATED',
      planId,
      changes
    })
  }
  
  placeAdded(planId: string, place: Place): void {
    this.eventBus.emit({
      type: 'PLACE_ADDED',
      planId,
      place
    })
  }
  
  // 他のイベントも同様に実装
}
```

### Step 5: サービスでの統合
```typescript
// src/services/plan/UnifiedPlanService.ts (更新版)
export class UnifiedPlanService {
  constructor(
    private planRepository: PlanRepository,
    private eventService: PlanEventService
  ) {}
  
  async loadPlan(planId: string, userId: string): Promise<TravelPlan | null> {
    const plan = await this.planRepository.get(planId, userId)
    
    if (plan) {
      // イベントを発行してストアを更新
      this.eventService.planLoaded(plan)
    }
    
    return plan
  }
  
  async addPlace(planId: string, place: Place): Promise<void> {
    // リポジトリでの追加
    await this.planRepository.addPlace(planId, place)
    
    // イベント発行
    this.eventService.placeAdded(planId, place)
  }
  
  // ストアを直接操作せず、常にイベント経由で通信
}
```

### Step 6: 合成データ用のセレクター
```typescript
// src/store/selectors/planSelectors.ts
export function usePlanWithData(planId: string | null) {
  const planMeta = usePlanStore((s) => 
    planId ? s.plans.get(planId) : null
  )
  
  const places = usePlacesStore((s) => 
    planId ? s.getPlacesForPlan(planId) : []
  )
  
  const labels = useLabelsStore((s) => 
    planId ? s.getLabelsForPlan(planId) : []
  )
  
  return useMemo(() => {
    if (!planMeta) return null
    
    return {
      ...planMeta,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0)
    }
  }, [planMeta, places, labels])
}
```

### Step 7: コンポーネントでの使用
```typescript
// コンポーネントでの新しい使用方法
function PlanManager() {
  const currentPlanId = usePlanStore((s) => s.currentPlanId)
  const planWithData = usePlanWithData(currentPlanId)
  
  // または個別に必要なデータのみ取得
  const places = usePlacesStore((s) => 
    currentPlanId ? s.getPlacesForPlan(currentPlanId) : []
  )
  
  return (
    <div>
      <h1>{planWithData?.name}</h1>
      <p>場所数: {places.length}</p>
    </div>
  )
}
```

## 移行計画

### Phase 1: イベントシステム構築 (2-3日)
- StoreEvent 型定義とイベントバスの作成
- PlanEventService の実装
- イベント発行の仕組み作成

### Phase 2: ストア独立化 (3-4日)
- 各ストアをイベント駆動型に変更
- 直接依存の削除
- セレクター関数の作成

### Phase 3: サービス層統合 (2-3日)
- UnifiedPlanService でのイベント発行
- 既存の直接ストア操作をイベント経由に変更
- データフローの確認

### Phase 4: コンポーネント更新 (3-4日)
- セレクター使用への移行
- 不要なuseEffect の削除
- パフォーマンステスト

### Phase 5: クリーンアップ (1-2日)
- 旧依存関係の削除
- 未使用コードの削除
- ドキュメント更新

## 期待される効果

### アーキテクチャの改善
- **疎結合**: ストア間の依存関係を完全に排除
- **テスト容易性**: 各ストアを独立してテスト可能
- **拡張性**: 新しいストアの追加が容易

### パフォーマンス向上
- **選択的更新**: 必要な部分のみ再レンダリング
- **メモ化効率**: 依存関係が明確なため効率的
- **デバッグ性**: イベントフローの追跡が可能

### 開発効率向上
- **予測可能**: データフローが一方向で明確
- **保守性**: 変更の影響範囲が限定的
- **並行開発**: ストアごとに独立して開発可能

## リスク分析

### 高リスク
- 既存データフローの大幅変更
- イベント順序による問題

### 中リスク
- パフォーマンスへの影響
- デバッグの複雑化（イベント追跡）

### 対策
- 段階的移行による安全性確保
- イベントログ機能の実装
- 十分なテスト期間の確保

### テストシナリオ
- イベント順序の正当性確認
- 大量データでのパフォーマンステスト
- エラー時のイベント処理確認