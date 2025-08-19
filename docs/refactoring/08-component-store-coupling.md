# コンポーネント結合度の低減

## 現状の問題点

### コンポーネントとストアの密結合

36個のコンポーネントがストアを直接インポートしており、密結合が発生：

```typescript
// 典型的な問題例 - 複数ストアへの直接依存
import { usePlanStore } from '../store/planStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanListStore } from '../store/planListStore';
import { useUIStore } from '../store/uiStore';

function SomeComponent() {
  const { plan } = usePlanStore();
  const places = useSavedPlacesStore((s) => s.getFilteredPlaces());
  const labels = useLabelsStore((s) => s.labels);
  const planList = usePlanListStore((s) => s.plans);
  const isMapInteractionEnabled = useUIStore((s) => s.isMapInteractionEnabled);

  // 複雑なデータ変換ロジック
  const mergedData = useMemo(() => {
    // 複雑な計算...
  }, [plan, places, labels, planList]);

  // 複数ストアの状態変更処理
  const handleSomething = () => {
    usePlanStore.getState().updatePlan({...});
    useSavedPlacesStore.getState().addPlace({...});
    useLabelsStore.getState().addLabel({...});
  };
}
```

### 具体的な問題

1. **高い結合度**: コンポーネントが複数のストアに直接依存
2. **ビジネスロジックの分散**: データ変換ロジックがコンポーネント内に散在
3. **テスト困難性**: ストアの状態を事前設定してテストが困難
4. **再利用性の低下**: 特定のストア構造に依存するため再利用困難

## 目標とする設計

### レイヤード・アーキテクチャによる結合度低減

```
Presentation Layer (コンポーネント)
       │
       ▼
Application Layer (カスタムフック)
       │
       ▼
Domain Layer (ビジネスロジック)
       │
       ▼
Infrastructure Layer (ストア)
```

#### 設計原則

1. **単一責任**: コンポーネントはプレゼンテーションのみ
2. **依存性逆転**: 抽象に依存し、具象に依存しない
3. **カプセル化**: ストアの詳細をカスタムフックで隠蔽
4. **テスト容易性**: モック可能なインターフェース設計

## 実装手順

### Step 1: ドメインモデルの定義

```typescript
// src/domain/models/Plan.ts
export interface PlanViewModel {
  id: string;
  name: string;
  description?: string;
  places: PlaceViewModel[];
  labels: LabelViewModel[];
  totalCost: number;
  placeCount: number;
  labelCount: number;
  isLoading: boolean;
  error?: string;
}

export interface PlaceViewModel {
  id: string;
  name: string;
  position: google.maps.LatLngLiteral;
  category: string;
  estimatedCost: number;
  memo?: string;
  imageUrls: string[];
  isSelected: boolean;
}

export interface LabelViewModel {
  id: string;
  text: string;
  position: google.maps.LatLngLiteral;
  color: string;
  fontSize: number;
}
```

### Step 2: アプリケーションサービス（カスタムフック）

```typescript
// src/hooks/usePlanData.ts
export interface PlanDataHook {
  plan: PlanViewModel | null;
  isLoading: boolean;
  error?: string;

  // プラン操作
  createPlan: (name: string) => Promise<void>;
  updatePlanName: (name: string) => Promise<void>;
  deletePlan: () => Promise<void>;
  duplicatePlan: () => Promise<void>;

  // 場所操作
  addPlace: (place: Partial<Place>) => Promise<void>;
  updatePlace: (id: string, update: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  selectPlace: (id: string | null) => void;

  // ラベル操作
  addLabel: (label: Partial<Label>) => Promise<void>;
  updateLabel: (id: string, update: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
}

export function usePlanData(): PlanDataHook {
  // 内部でストアを使用するが、外部には公開しない
  const planMeta = usePlanStore((s) => s.getCurrentPlan());
  const places = usePlacesStore((s) =>
    planMeta ? s.getPlacesForPlan(planMeta.id) : [],
  );
  const labels = useLabelsStore((s) =>
    planMeta ? s.getLabelsForPlan(planMeta.id) : [],
  );
  const selectedPlaceId = usePlacesStore((s) => s.selectedPlaceId);
  const isLoading = usePlanStore((s) => s.isLoading);
  const error = usePlanStore((s) => s.error);

  // サービスへの参照
  const planService = useRef(container.get<UnifiedPlanService>("PlanService"));

  // ビューモデルの構築
  const plan: PlanViewModel | null = useMemo(() => {
    if (!planMeta) return null;

    return {
      id: planMeta.id,
      name: planMeta.name,
      description: planMeta.description,
      places: places.map((p) => ({
        ...p,
        isSelected: p.id === selectedPlaceId,
      })),
      labels,
      totalCost: places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
      placeCount: places.length,
      labelCount: labels.length,
      isLoading,
      error,
    };
  }, [planMeta, places, labels, selectedPlaceId, isLoading, error]);

  // 操作の実装
  const createPlan = useCallback(async (name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("User not authenticated");

    const result = await planService.current.createPlan(user.uid, name);
    if (!result.success) {
      throw result.error;
    }
  }, []);

  const updatePlanName = useCallback(
    async (name: string) => {
      if (!planMeta) return;

      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const result = await planService.current.updatePlanName(
        user.uid,
        planMeta.id,
        name,
      );
      if (!result.success) {
        throw result.error;
      }
    },
    [planMeta],
  );

  const addPlace = useCallback(
    async (place: Partial<Place>) => {
      if (!planMeta) return;

      const completePlace: Place = {
        id: "",
        planId: planMeta.id,
        name: place.name || "",
        position: place.position!,
        category: place.category || "other",
        estimatedCost: place.estimatedCost || 0,
        memo: place.memo || "",
        imageUrls: place.imageUrls || [],
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await planService.current.addPlace(planMeta.id, completePlace);
    },
    [planMeta],
  );

  const selectPlace = useCallback((id: string | null) => {
    usePlacesStore.getState().selectPlace(id);
  }, []);

  return {
    plan,
    isLoading,
    error,
    createPlan,
    updatePlanName,
    deletePlan: () => Promise.resolve(), // 実装省略
    duplicatePlan: () => Promise.resolve(), // 実装省略
    addPlace,
    updatePlace: () => Promise.resolve(), // 実装省略
    deletePlace: () => Promise.resolve(), // 実装省略
    selectPlace,
    addLabel: () => Promise.resolve(), // 実装省略
    updateLabel: () => Promise.resolve(), // 実装省略
    deleteLabel: () => Promise.resolve(), // 実装省略
  };
}
```

### Step 3: 特化したフック

```typescript
// src/hooks/useMapData.ts - マップ専用のフック
export interface MapDataHook {
  places: PlaceViewModel[];
  labels: LabelViewModel[];
  selectedPlace: PlaceViewModel | null;
  mapCenter: google.maps.LatLngLiteral | null;

  onPlaceClick: (place: PlaceViewModel) => void;
  onMapClick: (position: google.maps.LatLngLiteral) => void;
  onLabelClick: (label: LabelViewModel) => void;
}

export function useMapData(): MapDataHook {
  const { plan, selectPlace } = usePlanData();

  const selectedPlace = useMemo(
    () => plan?.places.find((p) => p.isSelected) || null,
    [plan?.places],
  );

  const mapCenter = useMemo(() => {
    if (plan?.places && plan.places.length > 0) {
      // 全プレイスの中心を計算
      const lat =
        plan.places.reduce((sum, p) => sum + p.position.lat, 0) /
        plan.places.length;
      const lng =
        plan.places.reduce((sum, p) => sum + p.position.lng, 0) /
        plan.places.length;
      return { lat, lng };
    }
    return null;
  }, [plan?.places]);

  const onPlaceClick = useCallback(
    (place: PlaceViewModel) => {
      selectPlace(place.id);
    },
    [selectPlace],
  );

  const onMapClick = useCallback(
    (position: google.maps.LatLngLiteral) => {
      // 新しい場所の追加ロジック
      selectPlace(null);
    },
    [selectPlace],
  );

  const onLabelClick = useCallback((label: LabelViewModel) => {
    // ラベル選択ロジック
  }, []);

  return {
    places: plan?.places || [],
    labels: plan?.labels || [],
    selectedPlace,
    mapCenter,
    onPlaceClick,
    onMapClick,
    onLabelClick,
  };
}
```

### Step 4: UI専用フック

```typescript
// src/hooks/useUIState.ts
export interface UIStateHook {
  isMapInteractionEnabled: boolean;
  showLabels: boolean;
  selectedTab: TabType;
  isBottomSheetOpen: boolean;

  toggleMapInteraction: () => void;
  toggleLabels: () => void;
  selectTab: (tab: TabType) => void;
  openBottomSheet: () => void;
  closeBottomSheet: () => void;
}

export function useUIState(): UIStateHook {
  const mapInteraction = useUIStore((s) => s.isMapInteractionEnabled);
  const labelsVisible = useUIStore((s) => s.showLabels);
  const selectedTab = useUIStore((s) => s.selectedTab);
  const bottomSheetOpen = useBottomSheetStore((s) => s.isOpen);

  return {
    isMapInteractionEnabled: mapInteraction,
    showLabels: labelsVisible,
    selectedTab,
    isBottomSheetOpen: bottomSheetOpen,

    toggleMapInteraction: () => useUIStore.getState().toggleMapInteraction(),
    toggleLabels: () => useUIStore.getState().toggleLabels(),
    selectTab: (tab) => useUIStore.getState().setSelectedTab(tab),
    openBottomSheet: () => useBottomSheetStore.getState().open(),
    closeBottomSheet: () => useBottomSheetStore.getState().close(),
  };
}
```

### Step 5: 簡素化されたコンポーネント

```typescript
// src/components/PlanManager.tsx (新しいバージョン)
export default function PlanManager() {
  const {
    plan,
    isLoading,
    error,
    createPlan,
    updatePlanName,
    deletePlan,
    duplicatePlan
  } = usePlanData()

  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleCreatePlan = async () => {
    setIsCreating(true)
    try {
      await createPlan('新しいプラン')
      setMessage('プランが作成されました')
    } catch (error) {
      setMessage('プランの作成に失敗しました')
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleNameChange = async (newName: string) => {
    try {
      await updatePlanName(newName)
      setMessage('プラン名が更新されました')
    } catch (error) {
      setMessage('プラン名の更新に失敗しました')
      console.error(error)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  return (
    <div className="space-y-4">
      {message && <StatusMessage message={message} />}

      <CreatePlanButton
        onClick={handleCreatePlan}
        disabled={isCreating}
      />

      {plan && (
        <>
          <PlanNameEditor
            name={plan.name}
            onChange={handleNameChange}
          />

          <PlanStats
            placeCount={plan.placeCount}
            labelCount={plan.labelCount}
            totalCost={plan.totalCost}
          />

          <PlanActions
            onDuplicate={duplicatePlan}
            onDelete={deletePlan}
          />
        </>
      )}

      <PlanList />
    </div>
  )
}
```

### Step 6: テスト容易性の向上

```typescript
// src/components/__tests__/PlanManager.test.tsx
describe('PlanManager', () => {
  it('should display plan information', () => {
    // モックのフックを提供
    const mockPlanData = {
      plan: {
        id: '1',
        name: 'Test Plan',
        placeCount: 5,
        labelCount: 3,
        totalCost: 1000
      },
      isLoading: false,
      createPlan: jest.fn(),
      updatePlanName: jest.fn()
    }

    jest.mock('../hooks/usePlanData', () => ({
      usePlanData: () => mockPlanData
    }))

    render(<PlanManager />)

    expect(screen.getByText('Test Plan')).toBeInTheDocument()
    expect(screen.getByText('場所数: 5')).toBeInTheDocument()
  })
})
```

## 移行計画

### Phase 1: ドメインモデル定義 (1-2日)

- ViewModel インターフェースの作成
- ビジネスロジック仕様の整理
- 型定義の統一

### Phase 2: カスタムフック作成 (3-4日)

- usePlanData, useMapData, useUIState の実装
- 既存ストアとの統合
- テストケースの作成

### Phase 3: コンポーネント移行 (4-5日)

- 主要コンポーネントでのカスタムフック採用
- 直接ストア依存の削除
- UIロジックの分離

### Phase 4: テスト整備 (2-3日)

- モック可能なテストの作成
- エンドツーエンドテストの更新
- パフォーマンステスト

### Phase 5: クリーンアップ (1-2日)

- 未使用コードの削除
- importの整理
- ドキュメント更新

## 期待される効果

### 保守性の向上

- **単一責任**: コンポーネントはUI表示のみに集中
- **テスト容易性**: モック可能なインターフェース
- **可読性**: ビジネスロジックがフックに集約

### 再利用性の向上

- **ポータブル**: ストア実装に依存しない
- **モジュラー**: 機能ごとに分離されたフック
- **拡張性**: 新しい要件への対応が容易

### 開発効率の向上

- **予測可能**: 明確なデータフロー
- **デバッグ容易**: 問題箇所の特定が簡単
- **並行開発**: UI・ロジック・ストアを独立して開発

## リスク分析

### 高リスク

- 既存コンポーネントの大幅な変更
- パフォーマンスへの影響

### 中リスク

- カスタムフックの複雑化
- テストケースの大幅変更

### 対策

- 段階的移行による影響最小化
- パフォーマンスモニタリング
- 十分なテスト期間の確保

### テストシナリオ

- フック単体でのロジックテスト
- コンポーネント統合テスト
- パフォーマンス回帰テスト
