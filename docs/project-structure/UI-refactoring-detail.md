# UIリファクタリング詳細計画

## 概要
このドキュメントは、リファクタリング計画に基づいて、各UIコンポーネントがどのように再構成されるかの詳細を記載します。

## フェーズ1: 緊急対応（1-2週間）の詳細

### 1. PlaceDetailPanelの分割詳細

#### 現在の構造（1000行以上の単一ファイル）
```
src/components/PlaceDetailPanel.tsx
```

#### リファクタリング後の構造
```
src/components/placeDetail/
├── PlaceDetailPanel.tsx          # メインコンテナ（100行以下）
├── components/
│   ├── PlaceDetailHeader.tsx     # ヘッダー部分
│   ├── PlaceDetailInfo.tsx       # 基本情報表示
│   ├── PlaceDetailCost.tsx       # コスト関連
│   ├── PlaceDetailMemo.tsx       # メモ機能
│   ├── PlaceDetailImages.tsx     # 画像管理
│   └── PlaceDetailActions.tsx    # アクションボタン
├── hooks/
│   ├── usePlaceDetail.ts         # ビジネスロジック
│   ├── usePlaceCost.ts           # コスト計算ロジック
│   └── usePlaceImages.ts         # 画像管理ロジック
└── types/
    └── placeDetail.types.ts      # 型定義
```

#### 各コンポーネントの責任

**PlaceDetailPanel.tsx（メインコンテナ）**
```typescript
// 責任: レイアウトと子コンポーネントの調整のみ
export const PlaceDetailPanel: React.FC = () => {
  const { place, isLoading } = usePlaceDetail();
  
  if (!place) return null;
  
  return (
    <div className="place-detail-panel">
      <PlaceDetailHeader place={place} />
      <PlaceDetailInfo place={place} />
      <PlaceDetailCost place={place} />
      <PlaceDetailMemo place={place} />
      <PlaceDetailImages place={place} />
      <PlaceDetailActions place={place} />
    </div>
  );
};
```

**PlaceDetailHeader.tsx**
```typescript
// 責任: 場所名、カテゴリ、評価の表示
interface Props {
  place: Place;
}
```

**PlaceDetailInfo.tsx**
```typescript
// 責任: 住所、営業時間、ウェブサイトなどの基本情報
interface Props {
  place: Place;
}
```

**PlaceDetailCost.tsx**
```typescript
// 責任: 費用の表示と編集
interface Props {
  place: Place;
}
// usePlaceCostフックを使用
```

**PlaceDetailMemo.tsx**
```typescript
// 責任: メモの表示と編集（既存のMemoEditorを使用）
interface Props {
  place: Place;
}
```

**PlaceDetailImages.tsx**
```typescript
// 責任: 画像ギャラリーの表示（既存のImageGalleryを使用）
interface Props {
  place: Place;
}
```

**PlaceDetailActions.tsx**
```typescript
// 責任: 削除、ルート検索などのアクションボタン
interface Props {
  place: Place;
}
```

### 2. 名前の統一詳細

#### PlaceDetailsPanel → PlaceSearchPanel
```typescript
// 現在
src/components/PlaceDetailsPanel.tsx

// リファクタリング後
src/components/PlaceSearchPanel.tsx
```

#### ストア名の変更
```typescript
// 現在
src/store/placeStore.ts    // 選択中の場所
src/store/placesStore.ts   // 保存済み場所リスト

// リファクタリング後
src/store/selectedPlaceStore.ts  // 選択中の場所
src/store/savedPlacesStore.ts    // 保存済み場所リスト

// フック名も変更
useSelectedPlaceStore()  // 変更なし
useSavedPlacesStore()    // usePlacesStore() から変更
```

## フェーズ2: アーキテクチャ改善（2-3週間）の詳細

### 1. Safe*コンポーネントの統一詳細

#### 現在の構造
```typescript
// 個別のSafeコンポーネント
src/components/SafeRouteOverlay.tsx
src/components/SafeTravelTimeOverlay.tsx
```

#### リファクタリング後の構造
```typescript
// HOCパターンで統一
src/components/hoc/withErrorBoundary.tsx

// 使用例
export const RouteOverlay = withErrorBoundary(RouteDisplay, {
  fallback: RouteErrorFallback,
  onError: (error) => console.error('Route display error:', error)
});

export const TravelTimeOverlay = withErrorBoundary(TravelTimeDisplay, {
  fallback: TravelTimeErrorFallback,
  onError: (error) => console.error('Travel time error:', error)
});
```

### 2. ビジネスロジックのサービス層への移動詳細

#### 現在の状態（ストアにビジネスロジックが混在）
```typescript
// src/store/placesStore.ts
export const usePlacesStore = create((set, get) => ({
  places: [],
  addPlace: (place) => {
    // バリデーション、重複チェック、計算などのロジック
    const isValid = validatePlace(place);
    const isDuplicate = checkDuplicate(place);
    // ...
  }
}));
```

#### リファクタリング後（サービス層とストアの分離）
```typescript
// src/services/PlaceManagementService.ts
export class PlaceManagementService {
  constructor(
    private placeRepository: IPlaceRepository,
    private eventBus: IEventBus
  ) {}

  async addPlace(data: PlaceData): Promise<Place> {
    this.validatePlaceData(data);
    const place = this.createPlace(data);
    await this.placeRepository.save(place);
    this.eventBus.emit('place:added', place);
    return place;
  }
}

// src/store/savedPlacesStore.ts（純粋な状態管理）
export const useSavedPlacesStore = create<PlacesState>((set) => ({
  places: [],
  setPlaces: (places) => set({ places }),
  addPlace: (place) => set((state) => ({ 
    places: [...state.places, place] 
  })),
  updatePlace: (id, place) => set((state) => ({
    places: state.places.map(p => p.id === id ? place : p)
  }))
}));
```

## フェーズ3: 統合と最適化（3-4週間）の詳細

### 1. ルート関連ストアの統合詳細

#### 現在の構造（2つの独立したストア）
```typescript
src/store/routeSearchStore.ts    // 検索UI状態
src/store/routeConnectionsStore.ts // ルート接続情報
```

#### リファクタリング後（統合されたストア）
```typescript
// src/store/routeStore.ts
interface RouteState {
  // 検索UI関連
  searchPanel: {
    isOpen: boolean;
    origin: Place | null;
    destination: Place | null;
    travelMode: TravelMode;
  };
  
  // ルート結果
  routes: Map<string, RouteResult>;
  activeRouteId: string | null;
  
  // 接続情報
  connections: Connection[];
  
  // アクション
  openSearchPanel: (origin?: Place, destination?: Place) => void;
  closeSearchPanel: () => void;
  setTravelMode: (mode: TravelMode) => void;
  setRoute: (id: string, route: RouteResult) => void;
  removeRoute: (id: string) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
}
```

### 2. コンポーネント構造の最適化

#### タブナビゲーション関連の統合
```typescript
// 現在（3つのコンポーネント）
src/components/TabNavigation.tsx
src/components/TabNavigationWrapper.tsx
src/components/TabNavigationToggle.tsx

// リファクタリング後（統合）
src/components/navigation/
├── TabNavigation.tsx          # メインコンポーネント
├── TabNavigationItem.tsx      # 個別のタブアイテム
└── hooks/
    └── useTabNavigation.ts    # ナビゲーションロジック
```

## コンポーネント分類と将来的な構造

### Atomic Design適用後の分類

#### Atoms（最小単位）
```
src/components/atoms/
├── Button/
│   ├── Button.tsx
│   ├── Button.styles.ts
│   └── Button.types.ts
├── Input/
├── Icon/
├── Label/
└── Loading/
```

#### Molecules（基本的な組み合わせ）
```
src/components/molecules/
├── FormField/        # Label + Input
├── ListItem/         # Icon + Text + Action
├── Card/             # Header + Content + Footer
├── SearchInput/      # Input + Icon + Clear
└── TabItem/          # Icon + Label + Badge
```

#### Organisms（複雑な組み合わせ）
```
src/components/organisms/
├── PlaceCard/        # 場所情報カード
├── RoutePanel/       # ルート情報パネル
├── CostSummaryCard/  # 費用サマリーカード
├── MapControls/      # 地図コントロール群
└── NavigationBar/    # ナビゲーションバー
```

#### Templates（ページレイアウト）
```
src/components/templates/
├── MainLayout/       # メインレイアウト
├── ModalLayout/      # モーダルレイアウト
├── MobileLayout/     # モバイルレイアウト
└── TabletLayout/     # タブレットレイアウト
```

#### Pages（完全なページ）
```
src/components/pages/
├── MapPage/          # 地図ページ
├── ListPage/         # リストページ
├── SettingsPage/     # 設定ページ
└── SharePage/        # 共有ページ
```

## 移行スケジュール

### 即座に実施（1週間以内）
1. 重複ファイルの削除
2. ストア名の統一
3. PlaceDetailsPanel → PlaceSearchPanelの名前変更

### 短期（2週間以内）
1. PlaceDetailPanelの分割
2. Safe*コンポーネントのHOC化
3. タブナビゲーション関連の統合

### 中期（1ヶ月以内）
1. ビジネスロジックのサービス層への移動
2. ルート関連ストアの統合
3. エラーハンドリングの統一

### 長期（2ヶ月以内）
1. Atomic Designの段階的導入
2. コンポーネントライブラリの構築
3. Storybookの導入

## 成功指標

| 指標 | 現在 | 目標 |
|------|------|------|
| 最大コンポーネント行数 | 1000行以上 | 300行以下 |
| ビジネスロジックの分離 | ストアに混在 | サービス層に集約 |
| 重複コード | 複数箇所 | ゼロ |
| 命名の一貫性 | 不統一 | 統一された命名規則 |
| テストカバレッジ | 未測定 | 80%以上 |

## 注意事項

1. **段階的な移行**: 一度に全てを変更せず、機能を維持しながら段階的に移行
2. **後方互換性**: 既存のAPIとインターフェースを可能な限り維持
3. **テスト**: 各変更後に必ず動作確認とテストを実施
4. **ドキュメント**: 変更内容と新しい構造を常に文書化
5. **チーム連携**: 大きな変更は事前にチームで共有し、レビューを実施