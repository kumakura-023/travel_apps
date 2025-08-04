# 場所管理機能

## 概要

場所管理機能は、ユーザーが地図上に場所を追加、編集、削除する機能を提供します。Google Places APIと統合され、場所の詳細情報を取得・表示します。

## 主要コンポーネント

### 1. PlaceDetailsPanel（メイン詳細パネル）
**場所**: `src/components/PlaceDetailsPanel.tsx`

**責任**:
- Google Places APIから取得した場所の詳細表示
- 場所の候補地追加機能

**特徴**:
- 固定幅540pxのサイドパネル
- 写真、評価、住所、ウェブサイトを表示

**問題点**: PlaceDetailPanelと名前が似ている

### 2. PlaceDetailPanel（保存済み場所の詳細）
**場所**: `src/components/PlaceDetailPanel.tsx`

**責任**:
- 保存済み場所の詳細表示と編集
- メモ機能
- コスト管理
- 画像管理

**特徴**:
- レスポンシブデザイン（デスクトップ/モバイル）
- BottomSheet対応（モバイル）

**問題点**:
- 1000行を超える巨大なコンポーネント
- 複数の責任を持っている

### 3. PlaceList（場所リスト）
**場所**: `src/components/PlaceList.tsx`

**責任**:
- 保存済み場所のリスト表示
- カテゴリーフィルタリング
- ドラッグ&ドロップによる並び替え

### 4. PlaceListItem（リストアイテム）
**場所**: `src/components/PlaceListItem.tsx`

**責任**:
- 個別の場所アイテム表示
- 選択状態の管理
- アクションボタンの提供

### 5. AddPlaceButton（場所追加ボタン）
**場所**: `src/components/AddPlaceButton.tsx`

**責任**:
- Google Places検索結果から場所を追加
- 重複チェック
- 場所データの変換

## サブコンポーネント（placeDetailフォルダ）

### ImageGallery
**場所**: `src/components/placeDetail/ImageGallery.tsx`

**責任**: 場所の画像ギャラリー表示

### MemoEditor
**場所**: `src/components/placeDetail/MemoEditor.tsx`

**責任**: メモの編集機能

### PlaceActions
**場所**: `src/components/placeDetail/PlaceActions.tsx`

**責任**: 場所に対するアクション（削除、ルート検索など）

## 検索機能

### SearchBar
**場所**: `src/components/SearchBar.tsx`

**責任**:
- 場所の検索
- オートコンプリート
- 検索結果の表示

## データ管理

### ストア

#### placesStore
**場所**: `src/store/placesStore.ts`

**管理するデータ**:
- 保存済み場所のリスト
- 論理削除フラグ

#### placeStore
**場所**: `src/store/placeStore.ts`

**管理するデータ**:
- 現在選択中の場所（Google Places結果）

### インターフェース

#### PlaceRepository
**場所**: `src/interfaces/PlaceRepository.ts`

**メソッド**:
- `getPlaces()` - 場所リスト取得
- `addPlace()` - 場所追加
- `updatePlace()` - 場所更新
- `deletePlace()` - 場所削除

#### PlaceService
**場所**: `src/interfaces/PlaceService.ts`

**メソッド**:
- `searchPlaces()` - 場所検索
- `getPlaceDetails()` - 詳細情報取得
- `getAutocompleteSuggestions()` - オートコンプリート

## 問題点

### 1. 名前の混乱
- `PlaceDetailsPanel` vs `PlaceDetailPanel`
- 単数形と複数形の不統一

### 2. 責任の過剰
```typescript
// PlaceDetailPanelが持つ責任（多すぎる）
- 詳細表示
- 編集機能
- 画像管理
- メモ管理
- コスト計算
- ルート検索連携
- レスポンシブ対応
- BottomSheet管理
```

### 3. ビジネスロジックの混在
```typescript
// コンポーネント内でコスト計算
const estimatedCost = useMemo(() => {
  if (!place) return null;
  return estimateCost(place.category, place.priceLevel);
}, [place]);
```

### 4. 状態管理の分散
- 場所データが複数のストアで管理されている
- 選択状態の管理が不明確

## 推奨される改善

### 1. コンポーネントの分割
```typescript
// PlaceDetailPanelを責任ごとに分割
- PlaceDetailViewer    // 表示のみ
- PlaceDetailEditor    // 編集機能
- PlaceImageManager    // 画像管理
- PlaceMemoManager     // メモ管理
- PlaceCostCalculator  // コスト計算
```

### 2. 名前の統一
```typescript
// 明確な命名規則
- PlaceSearchPanel     // Google Places検索用
- PlaceDetailPanel     // 保存済み場所の詳細
- PlaceListPanel       // 場所リスト
```

### 3. カスタムフックの活用
```typescript
// ビジネスロジックをフックに分離
const usePlaceManagement = () => {
  const addPlace = (data: PlaceData) => {
    // バリデーション
    // 重複チェック
    // 追加処理
  };
  
  return { addPlace, updatePlace, deletePlace };
};
```

### 4. PlaceServiceの完全実装
```typescript
class PlaceServiceImpl implements PlaceService {
  constructor(
    private googleMapsAdapter: GoogleMapsAdapter,
    private placeRepository: PlaceRepository
  ) {}
  
  async searchPlaces(query: string): Promise<Place[]> {
    // Google Places APIとローカルデータの統合検索
  }
}
```

## リファクタリング優先順位

1. **高**: PlaceDetailPanelの分割（1000行以上）
2. **高**: 名前の統一（PlaceDetailsPanel → PlaceSearchPanel）
3. **中**: ビジネスロジックのサービス層への移動
4. **低**: カスタムフックによるロジック共有