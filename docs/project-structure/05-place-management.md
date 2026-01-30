# 場所管理機能

## 概要

場所管理機能は、ユーザーが地図上に場所を追加、編集、削除する機能を提供します。Google Places APIと統合され、場所の詳細情報を取得・表示します。

## 主要コンポーネント

### 1. PlaceDetailsPanel（検索結果ビュー）

**場所**: `src/components/PlaceDetailsPanel.tsx`

**責任**:

- Google Places APIから取得した候補の詳細表示
- 検索結果からの場所追加、一時保存

**特徴**:

- 固定幅サイドパネルで検索結果を表示
- 写真、評価、住所、ウェブサイトなどGoogleデータ中心

**課題**: PlaceDetailPanelとの命名が似ており役割が伝わりづらい

### 2. PlaceDetailPanel（保存済み場所エディタ）

**場所**: `src/components/PlaceDetailPanel.tsx`

**責任**:

- 保存済み場所の詳細表示と編集
- メモ・コスト・画像などローカルデータの管理
- PlanCoordinator/UnifiedPlanServiceを通じたプラン更新

**特徴**:

- レスポンシブデザイン（デスクトップ/BottomSheet）
- コメント、コスト、属性パネルなど多機能

**問題点**:

- 1000行近い巨大なコンポーネントで責務過多
- HookやZustandストアへの直接アクセスが多い

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

### ImageGallery / MemoEditor / PlaceActions など

**場所**: `src/components/placeDetail/` 配下

**責任**:

- ImageGallery: 画像ギャラリー表示
- MemoEditor: メモやコメント編集
- PlaceActions: 削除、ルート検索、共有などの操作
- CostBreakdown, AttributesPanel など補助コンポーネント群がPlaceDetailPanelをサポート

## 検索機能

### SearchBar

**場所**: `src/components/SearchBar.tsx`

**責任**:

- 場所の検索
- オートコンプリート
- 検索結果の表示

## データ管理

### ストア

#### savedPlacesStore

**場所**: `src/store/savedPlacesStore.ts`

**管理するデータ**:

- 保存済み場所のリストと詳細フィールド（メモ、コスト、ラベル）
- 削除フラグ、復元情報

#### selectedPlaceStore

**場所**: `src/store/selectedPlaceStore.ts`

**管理するデータ**:

- Google Places検索結果のうち現在選択中の場所
- PlaceDetailsPanelの開閉/ステップ状態

#### placesStore（レガシー）

**場所**: `src/store/placesStore.ts`

**備考**:

- savedPlacesStoreとほぼ同じ責務を持つ旧ストア
- 論理削除フラグや並び順の処理が二重に存在

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

**現状**:

- インターフェースのみで実装クラスは登録されていない
- 実際の検索・保存ロジックはPlanCoordinator/UnifiedPlanService/PlaceManagementServiceが担い、ServiceContainerにPlaceServiceは存在しない

## 問題点

### 1. 名前/責務の混乱

- `PlaceDetailsPanel`（検索）と`PlaceDetailPanel`（保存済み）が名前以外で区別されない
- `savedPlacesStore` / `placesStore` / `selectedPlaceStore` の命名が似通い用途が曖昧

### 2. コンポーネントの肥大化

```typescript
// PlaceDetailPanelが持つ責任（多すぎる）
-詳細表示 -
  編集機能 -
  画像管理 -
  メモ管理 -
  コスト計算 -
  ルート検索連携 -
  レスポンシブ対応 -
  BottomSheet管理;
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

- savedPlacesStore / placesStore / selectedPlaceStore に重複があり、削除フラグやコスト情報の真実が不明瞭

## 推奨される改善

### 1. コンポーネント責務の再分割

- PlaceDetailPanelを「表示」「編集」「メモ」「コスト」「アクション」などカテゴリごとに分割

### 2. 命名とストア整理

- PlaceDetailsPanel（検索）とPlaceDetailPanel（保存済み）の命名差別化
- savedPlacesStore / placesStore / selectedPlaceStore の役割分担を明文化

### 3. ビジネスロジックのサービス層移動

- コスト計算、メモバリデーション、削除フラグ処理をPlanCoordinator / UnifiedPlanService / PlaceManagementServiceへ移す

### 4. 状態統合と削除フロー整理

- savedPlacesStoreを単一ソースとし、placesStoreは移行または廃止
- 削除フラグや復元処理を共通ユーティリティへ

## リファクタリング優先順位

1. **高**: PlaceDetailPanelの分割とPlaceDetailsPanelとの責務整理
2. **高**: savedPlacesStore / placesStore / selectedPlaceStore の統合戦略と命名整理
3. **中**: PlanCoordinatorやUnifiedPlanServiceへのロジック移動、PlaceService実装方針の再検討
4. **低**: placeDetail配下コンポーネントの整理とファイル構造再編
