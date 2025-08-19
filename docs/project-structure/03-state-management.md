# 状態管理（Zustandストア）

## 概要

VoyageSketchはZustandを使用してアプリケーションの状態を管理しています。現在12個のストアが存在し、それぞれが特定のドメインを管理しています。

## ストア一覧

### 1. planStore

**場所**: `src/store/planStore.ts`

**管理する状態**:

- 現在のプラン（`plan: TravelPlan | null`）
- ローディング状態
- エラー状態

**主要メソッド**:

- `setPlan()` - プラン設定
- `updatePlan()` - プラン更新
- `updateLastActionPosition()` - 最後の操作位置更新

**問題点**: 非推奨メソッドが残存（`listenToPlan`, `unsubscribeFromPlan`）

### 2. placesStore

**場所**: `src/store/placesStore.ts`

**管理する状態**:

- 場所のリスト（`places: Place[]`）
- 削除済みフラグによる論理削除

**主要メソッド**:

- `addPlace()` - 場所追加
- `updatePlace()` - 場所更新
- `deletePlace()` - 場所削除（論理削除）
- `getFilteredPlaces()` - 削除済みを除く場所取得

### 3. placeStore（選択された場所）

**場所**: `src/store/placeStore.ts`

**管理する状態**:

- 選択中の場所（`place: google.maps.places.PlaceResult | null`）

**主要メソッド**:

- `setPlace()` - 場所選択

**問題点**: 名前が紛らわしい（placesStoreと混同しやすい）

### 4. routeSearchStore

**場所**: `src/store/routeSearchStore.ts`

**管理する状態**:

- ルート検索パネルの開閉状態
- 出発地と目的地
- 検索結果

**主要メソッド**:

- `openRouteSearch()` - 検索パネルを開く
- `setSelectedOrigin()` - 出発地設定
- `setSelectedDestination()` - 目的地設定

### 5. routeConnectionsStore

**場所**: `src/store/routeConnectionsStore.ts`

**管理する状態**:

- 場所間の接続情報
- ルート表示の管理

### 6. travelTimeStore

**場所**: `src/store/travelTimeStore.ts`

**管理する状態**:

- 移動時間モードのON/OFF
- 基準となる場所
- 移動手段

### 7. uiStore

**場所**: `src/store/uiStore.ts`

**管理する状態**:

- 各種UIパネルの開閉状態
- 地図操作の有効/無効
- 表示モード

**問題点**: 責任範囲が広すぎる

### 8. labelModeStore

**場所**: `src/store/labelModeStore.ts`

**管理する状態**:

- ラベル編集モードのON/OFF
- ラベル表示設定

### 9. labelsStore

**場所**: `src/store/labelsStore.ts`

**管理する状態**:

- カスタムラベルのリスト
- ラベルの位置情報

### 10. bottomSheetStore

**場所**: `src/store/bottomSheetStore.ts`

**管理する状態**:

- モバイル版ボトムシートの状態
- シートの高さ

### 11. browserPromptStore

**場所**: `src/store/browserPromptStore.ts`

**管理する状態**:

- 外部ブラウザー誘導プロンプトの表示状態

### 12. planListStore

**場所**: `src/store/planListStore.ts`

**管理する状態**:

- プランのリスト
- 選択中のプランID

## 状態管理の問題点

### 1. ストアの過剰な分割

- 12個のストアは多すぎる可能性
- 関連する状態が複数のストアに分散

### 2. 名前の一貫性の欠如

- `placeStore` vs `placesStore` - 紛らわしい
- 単数形と複数形の使い分けが不明確

### 3. ビジネスロジックの混在

```typescript
// ストアにビジネスロジックが含まれている例
addPlace: (partial) => {
  // バリデーションロジック
  if (!partial.coordinates) {
    throw new Error("Coordinates are required");
  }
  // IDの生成
  const id = uuidv4();
  // ... その他のロジック
};
```

### 4. 状態の重複

- 同じ情報が複数のストアで管理されている可能性

### 5. コールバックの管理

- `onPlaceAdded`, `onPlaceDeleted`などのコールバックがストアに含まれている
- イベントシステムとして独立させるべき

## 推奨される改善

### 1. ストアの統合

```typescript
// Before: 分散したストア
-placeStore.ts -
  placesStore.ts -
  labelsStore.ts -
  labelModeStore.ts -
  // After: 統合されたストア
  placeManagementStore.ts(場所関連すべて) -
  uiStateStore.ts(UI状態すべて);
```

### 2. ビジネスロジックの分離

```typescript
// Service層でビジネスロジックを処理
class PlaceService {
  validatePlace(data: Partial<Place>): void {
    if (!data.coordinates) {
      throw new Error("Coordinates are required");
    }
  }
}

// ストアは純粋な状態管理のみ
const usePlacesStore = create((set) => ({
  places: [],
  setPlaces: (places) => set({ places }),
}));
```

### 3. セレクターパターンの導入

```typescript
// 計算済みの値を取得するセレクター
const useFilteredPlaces = () => {
  const places = usePlacesStore((state) => state.places);
  return useMemo(() => places.filter((p) => !p.deleted), [places]);
};
```

### 4. アクションの分離

```typescript
// アクションを別ファイルに分離
export const placeActions = {
  addPlace: async (data: PlaceData) => {
    const validated = await placeService.validate(data);
    const place = await placeService.create(validated);
    usePlacesStore.getState().addPlace(place);
  },
};
```

## リファクタリング優先順位

1. **高**: placeStore と placesStore の統合
2. **高**: ビジネスロジックのサービス層への移動
3. **中**: UIストアの責任分離
4. **低**: セレクターパターンの導入
