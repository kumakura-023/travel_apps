# 状態管理（Zustandストア）

## 概要

VoyageSketchはZustandを使用してアプリケーションの状態を管理しています。現在はプラン関連・場所関連・UI関連を中心に複数のストアが存在し、一部には移行中のバックアップファイルも併存します。

## ストア一覧

### 1. planStore / planStore.backup

**場所**: `src/store/planStore.ts`

**管理する状態**:

- 現在のプラン（`plan: TravelPlan | null`）
- ローディング状態
- エラー状態

**主要メソッド**:

- `setPlan()` - プラン設定
- `updatePlan()` - プラン更新
- `updateLastActionPosition()` - 最後の操作位置更新

**問題点**: 非推奨API（`listenToPlan`, `unsubscribeFromPlan`）が残っており、`planStore.backup.ts`の旧実装が依然として手放せていない

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

### 3. savedPlacesStore

**場所**: `src/store/savedPlacesStore.ts`

**管理する状態**:

- 保存済み場所の詳細（メモ/コスト/タグなど拡張フィールド）
- 削除フラグと復元情報

**問題点**: `placesStore`との責務が重複し、どちらがソースオブトゥルースか曖昧

### 4. selectedPlaceStore

**場所**: `src/store/selectedPlaceStore.ts`

**管理する状態**:

- 選択中の場所（`place: google.maps.places.PlaceResult | null`）

**問題点**: 名前が`savedPlacesStore`と紛らわしく、UI用途のみの一時状態であることが分かりづらい

**主要メソッド**:

- `setPlace()` - 場所選択

**問題点**: 名前が紛らわしい（placesStoreと混同しやすい）

### 5. savedPlacesStore（重複ドメイン）

**場所**: `src/store/savedPlacesStore.ts`

**管理する状態**:

- 保存済み場所の詳細（メモ/コスト/タグなど拡張フィールド）
- 削除フラグと復元情報

**問題点**: `placesStore`との責務が重複し、どちらがソースオブトゥルースか曖昧

### 6. selectedPlaceStore

**場所**: `src/store/selectedPlaceStore.ts`

**管理する状態**:

- 現在選択中のGoogle Places結果を保持し、PlaceDetailsPanelで利用

**問題点**: 名前が`savedPlacesStore`と紛らわしく、UI用途のみの一時状態であることが伝わりにくい

### 7. labelsStore / labelModeStore

**場所**: `src/store/labelsStore.ts`, `src/store/labelModeStore.ts`

**管理する状態**:

- カスタムラベルと位置情報
- ラベル編集モードのON/OFF

**問題点**: ラベル編集のアクションがstore内に散らばり、UIと密結合

### 8. planListStore

**場所**: `src/store/planListStore.ts`

**管理する状態**:

- プランのリスト
- 選択中のプランID
- フィルター状態

### 9. routeStore / routeStoreMigration

**場所**: `src/store/routeStore.ts`, `src/store/routeStoreMigration.ts`

**管理する状態**:

- ルート検索結果（polylines, markers）
- 選択した経路モード
- 移行用バックアップロジック（routeStoreMigration）

**問題点**: migrationファイルが残り続けており、どちらを参照すべきか不明な箇所がある

### 10. travelTimeStore

**場所**: `src/store/travelTimeStore.ts`

**管理する状態**:

- 移動時間モードON/OFF
- 基準地点
- 移動手段設定

### 11. uiStore / bottomSheetStore

**場所**: `src/store/uiStore.ts`, `src/store/bottomSheetStore.ts`

**管理する状態**:

- UIパネル開閉、テーマ、ロードインジケータ
- モバイルボトムシートの高さ・モード

**問題点**: uiStoreの責務が広範で、Map/Place/Plan関連のフラグが混在

### 12. browserPromptStore / notificationStore

**場所**: `src/store/browserPromptStore.ts`, `src/store/notificationStore.ts`

**管理する状態**:

- 外部ブラウザ誘導モーダル表示
- アプリ内通知キュー

### 13. savedPlacesStoreバックアップ系

**場所**: `src/store/savedPlacesStore.backup.ts`（存在する場合）

**注意**: 古いMigration用ファイルが残存している可能性があり、メンテ対象から外れている

## 状態管理の問題点

### 1. 状態の重複

- `placesStore`と`savedPlacesStore`がほぼ同じ情報を持ち、どちらが真実か不明
- `routeStore`と`routeStoreMigration`が並存しメンテが煩雑

### 2. レガシーAPIの残存

- `planStore.listenToPlan`など非推奨APIが削除されず、新旧実装が混在
- `planStore.backup.ts`や`savedPlacesStore.backup.ts`が参照されるケースが残っている

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

### 4. 命名・境界の不一致

- `selectedPlaceStore`は一時選択に留まるのに`savedPlacesStore`と似た名前
- route系ストアのMigration命名が残り続けている

## 推奨される改善

### 1. ストア統合/整理

- `placesStore`と`savedPlacesStore`を単一のplaceStateモジュールへ統合
- `routeStoreMigration`などの移行ファイルを削除または自動テスト化

### 2. ビジネスロジックのサービス層移動

- コスト計算やバリデーションをPlaceManagementServiceへ寄せ、ストアを純粋に保つ

### 3. レガシーAPIの段階的削除

- `planStore.listenToPlan`やbackupファイル依存を洗い出し、EventBusやサービス層へ置き換え

### 4. 命名/責務の明確化

- 一時的な選択状態には`selectedPlaceState`のような命名を採用し、保存済みとは区別
- route系ストアの命名を現行仕様（`routeStore`）に揃える

## リファクタリング優先順位

1. **高**: place関連ストアの統合と命名整理（savedPlaces vs places vs selectedPlace）
2. **高**: 旧API（planStore.listenToPlan等）の排除とサービス層経由のアクセス統一
3. **中**: routeStoreMigrationの削除と状態定義の一本化
4. **低**: uiStoreの責務分割と通知/プロンプト系ストアの整理
