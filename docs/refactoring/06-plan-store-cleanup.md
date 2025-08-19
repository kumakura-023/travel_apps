# ストアの責任明確化

## 現状の問題点

### planStore の曖昧な責任

現在のplanStoreは複数の責任を持ち、非推奨メソッドも混在：

```typescript
// src/store/planStore.ts - 混在する責任
interface PlanState {
  plan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;

  // プラン更新リスナー（ビジネスロジック）
  onPlanUpdated?: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;

  // 非推奨メソッド（互換性のためだけに存在）
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
  updateLastActionPosition: (
    position: google.maps.LatLngLiteral,
    actionType: "place" | "label",
  ) => Promise<void>;
  setActivePlanId: (planId: string) => Promise<void>;
}
```

### 他のストアとの依存関係

複数のストアが相互に依存し、データの整合性に問題：

1. **planStore** ↔ **savedPlacesStore** ↔ **labelsStore**
2. **プラン変更時の連鎖更新**: 3つのストアを手動で同期
3. **初期化順序の問題**: どのストアを最初に更新するかが不明確

### 具体的な問題

```typescript
// PlanManager.tsx - ストア間の手動同期
const mergedPlan: TravelPlan | null = React.useMemo(() => {
  if (!plan) return null;
  return {
    ...plan,
    places, // savedPlacesStore から
    labels, // labelsStore から
    totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
  };
}, [plan, places, labels]);
```

## 目標とする設計

### 単一責任の原則に基づく分離

```
planStore = プラン基本情報のみ（places, labels は除外）
placesStore = 場所データの管理
labelsStore = ラベルデータの管理
uiStore = UI状態の管理
```

#### 責任の明確化

1. **planStore**: プランのメタデータ（id, name, dates など）
2. **placesStore**: 場所データの CRUD 操作
3. **labelsStore**: ラベルデータの CRUD 操作
4. **planDataStore**: プラン全体のデータ統合（読み取り専用）

#### データフローの単純化

```
Service Layer → Individual Stores → Computed Store → Components
```

## 実装手順

### Step 1: planStore の責任を限定

```typescript
// src/store/planStore.ts (新しいバージョン)
interface PlanMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActionPosition?: {
    position: google.maps.LatLngLiteral;
    actionType: "place" | "label";
  };
  settings: PlanSettings;
}

interface PlanState {
  // 純粋な状態管理のみ
  currentPlan: PlanMetadata | null;
  isLoading: boolean;
  error: string | null;

  // 基本的な操作のみ
  setPlan: (plan: PlanMetadata | null) => void;
  updatePlan: (update: Partial<PlanMetadata>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  currentPlan: null,
  isLoading: false,
  error: null,

  setPlan: (plan) => set({ currentPlan: plan }),
  updatePlan: (update) =>
    set((state) => ({
      currentPlan: state.currentPlan
        ? { ...state.currentPlan, ...update }
        : null,
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearPlan: () => set({ currentPlan: null, error: null }),
}));
```

### Step 2: placesStore の責任を明確化

```typescript
// src/store/placesStore.ts (リネーム: savedPlacesStore → placesStore)
interface PlacesState {
  places: Place[];
  selectedPlaceId: string | null;
  isLoading: boolean;

  // 基本的な CRUD 操作
  setPlaces: (places: Place[]) => void;
  addPlace: (place: Place) => void;
  updatePlace: (id: string, update: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  clearPlaces: () => void;

  // 選択状態管理
  selectPlace: (id: string | null) => void;

  // フィルタリング（計算プロパティ）
  getFilteredPlaces: () => Place[];
  getPlaceById: (id: string) => Place | undefined;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  selectedPlaceId: null,
  isLoading: false,

  setPlaces: (places) => set({ places }),
  addPlace: (place) =>
    set((state) => ({
      places: [...state.places, place],
    })),
  updatePlace: (id, update) =>
    set((state) => ({
      places: state.places.map((p) => (p.id === id ? { ...p, ...update } : p)),
    })),
  deletePlace: (id) =>
    set((state) => ({
      places: state.places.filter((p) => p.id !== id),
    })),
  clearPlaces: () => set({ places: [], selectedPlaceId: null }),

  selectPlace: (id) => set({ selectedPlaceId: id }),

  // 計算プロパティ
  getFilteredPlaces: () => {
    const { places } = get();
    return places.filter((p) => !p.deleted);
  },
  getPlaceById: (id) => {
    const { places } = get();
    return places.find((p) => p.id === id);
  },
}));
```

### Step 3: labelsStore の責任を明確化

```typescript
// src/store/labelsStore.ts (同様の設計)
interface LabelsState {
  labels: Label[];
  isLoading: boolean;

  // 基本的な CRUD 操作
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (id: string, update: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  clearLabels: () => void;

  // 計算プロパティ
  getFilteredLabels: () => Label[];
  getLabelById: (id: string) => Label | undefined;
}
```

### Step 4: 統合データストア（読み取り専用）

```typescript
// src/store/planDataStore.ts
interface PlanDataState {
  // 統合されたプランデータ（読み取り専用）
  getCurrentPlan: () => TravelPlan | null;
  getTotalCost: () => number;
  getPlaceCount: () => number;
  getLabelCount: () => number;

  // プラン全体のデータ検証
  isValidPlan: () => boolean;
  getValidationErrors: () => string[];
}

export const usePlanDataStore = create<PlanDataState>((set, get) => ({
  getCurrentPlan: () => {
    const planMeta = usePlanStore.getState().currentPlan;
    const places = usePlacesStore.getState().getFilteredPlaces();
    const labels = useLabelsStore.getState().getFilteredLabels();

    if (!planMeta) return null;

    return {
      ...planMeta,
      places,
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
    };
  },

  getTotalCost: () => {
    const places = usePlacesStore.getState().getFilteredPlaces();
    return places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  },

  getPlaceCount: () => {
    return usePlacesStore.getState().getFilteredPlaces().length;
  },

  getLabelCount: () => {
    return useLabelsStore.getState().getFilteredLabels().length;
  },

  isValidPlan: () => {
    const planMeta = usePlanStore.getState().currentPlan;
    return !!planMeta?.id && !!planMeta?.name;
  },

  getValidationErrors: () => {
    const errors: string[] = [];
    const planMeta = usePlanStore.getState().currentPlan;

    if (!planMeta?.id) errors.push("プランIDが設定されていません");
    if (!planMeta?.name) errors.push("プラン名が設定されていません");

    return errors;
  },
}));
```

### Step 5: ストア同期サービス

```typescript
// src/services/store/StoreCoordinator.ts
export class StoreCoordinator {
  updatePlanData(plan: TravelPlan): void {
    // 各ストアを順序よく更新
    usePlanStore.getState().setPlan({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      lastActionPosition: plan.lastActionPosition,
      settings: plan.settings,
    });

    usePlacesStore.getState().setPlaces(plan.places || []);
    useLabelsStore.getState().setLabels(plan.labels || []);
  }

  clearAllData(): void {
    usePlanStore.getState().clearPlan();
    usePlacesStore.getState().clearPlaces();
    useLabelsStore.getState().clearLabels();
  }

  // データの整合性チェック
  validateDataConsistency(): boolean {
    const planMeta = usePlanStore.getState().currentPlan;
    const places = usePlacesStore.getState().places;
    const labels = useLabelsStore.getState().labels;

    if (!planMeta) return places.length === 0 && labels.length === 0;

    // planId の整合性チェック
    const invalidPlaces = places.filter((p) => p.planId !== planMeta.id);
    const invalidLabels = labels.filter((l) => l.planId !== planMeta.id);

    if (invalidPlaces.length > 0 || invalidLabels.length > 0) {
      console.warn("Data consistency error:", { invalidPlaces, invalidLabels });
      return false;
    }

    return true;
  }
}
```

### Step 6: コンポーネントでの使用

```typescript
// コンポーネントでの新しい使用方法
function PlanManager() {
  // 個別のストアから必要なデータのみ取得
  const planMeta = usePlanStore((s) => s.currentPlan)
  const places = usePlacesStore((s) => s.getFilteredPlaces())
  const totalCost = usePlanDataStore((s) => s.getTotalCost())

  // または統合データが必要な場合
  const currentPlan = usePlanDataStore((s) => s.getCurrentPlan())

  return (
    <div>
      <h1>{planMeta?.name}</h1>
      <p>場所数: {places.length}</p>
      <p>総費用: {totalCost}</p>
    </div>
  )
}
```

## 移行計画

### Phase 1: 新ストア構造作成 (2-3日)

- planStore, placesStore, labelsStore, planDataStore の新実装
- StoreCoordinator の作成
- 型定義の整理

### Phase 2: ストア移行 (2-3日)

- 既存ストアをリネーム（backup）
- 新ストアで段階的置き換え
- データ整合性テスト

### Phase 3: コンポーネント更新 (3-4日)

- 主要コンポーネントでの新ストア採用
- useMemo による不要な計算の削除
- パフォーマンステスト

### Phase 4: クリーンアップ (1-2日)

- 旧ストアとバックアップファイルの削除
- 未使用フックの削除
- ドキュメント更新

## 期待される効果

### コードの明確化

- **責任の分離**: 各ストアが単一責任を持つ
- **データフロー明確化**: どのデータがどこから来るかが明確
- **型安全性向上**: より厳密な型定義

### パフォーマンス改善

- **選択的な再レンダリング**: 必要な部分のみ更新
- **計算の最適化**: 無駄な再計算の削除
- **メモリ効率**: 重複データの削除

### 開発効率向上

- **テスト容易性**: 各ストアを独立してテスト
- **デバッグ容易性**: 問題のあるストアの特定が簡単
- **拡張性**: 新機能追加時の影響範囲が明確

## リスク分析

### 高リスク

- 既存コンポーネントでの動作変更
- データ同期タイミングの変更

### 中リスク

- パフォーマンスへの影響
- 複雑な状態依存の見落とし

### 対策

- 段階的移行による安全性確保
- 十分なテスト期間
- 既存動作との並行稼働

### テストシナリオ

- ストア間のデータ整合性確認
- 大量データでのパフォーマンステスト
- エラー状態での動作確認
