# Phase 0: Place系ストア統合要件

## ステート比較

|ストア|主要フィールド|責務|現在の利用例|課題|
|---|---|---|---|---|
|`savedPlacesStore` (`src/store/savedPlacesStore.ts`)|`places: Place[]` / `onPlaceAdded` / `onPlaceDeleted` / `addPlace` / `updatePlace` / `deletePlace` / `getFilteredPlaces`|保存済み地点のCRUD、削除フラグ、ラベル座標、メモ/コストを保持し、PlanCoordinatorとAuth情報にもアクセス|PlaceDetailPanel、MapOverlay、PlanCoordinator、EventBus連携|ストア内部にビジネスロジックが密集し、PlanService呼び出しやEventBus発火まで一括処理している|
|`placesStore` (`src/store/placesStore.ts`)|`placesByPlan: Map<string, Map<string, Place>>` / `selectedPlaceId` / `_addPlace` / `_updatePlace` / イベント購読|Planロード時にplacesをMap構造で保持し、StoreEvents経由で同期する読み取り専用キャッシュ|旧Route/Map UI、MapOverlay選択ハイライト|`savedPlacesStore`と重複するデータをPlan単位で保持し、削除・更新が二重管理|
|`selectedPlaceStore` (`src/store/selectedPlaceStore.ts`)|`place: google.maps.places.PlaceResult | null` / `setPlace`|Google Places検索結果の一時保持、PlaceDetailsPanel表示制御|PlaceDetailsPanel、AddPlaceButton|永続化前のドラフトであるにも関わらずフォーム状態やバリデーションを兼ね始め、命名も`saved`系と紛らわしい|

## アクション/副作用整理

- `savedPlacesStore`
  - `addPlace`: 座標必須チェック、UUID発行、Auth情報付与、EventBus発火、PlanService経由で`updateLastActionPosition`を非同期実行。
  - `updatePlace`: 既存PlaceのmergeとEventBus発火。
  - `deletePlace`: 削除フラグ更新、syncDebugログ記録、EventBus発火、互換コールバック実行。
  - 直接`usePlanStore`/`useAuthStore`を参照しておりストアがサービス境界を越えている。

- `placesStore`
  - EventBus (`storeEventBus`) のPLAN_LOADED/PLACE_ADDED等を購読し、`placesByPlan` Mapを更新。
  - `_addPlace/_updatePlace/_deletePlace`はイベント経由以外の直接操作用として残存。

- `selectedPlaceStore`
  - `setPlace`のみ。UIイベントドリブンで他ストアやServiceとの依存なし。

## 依存関係

- `savedPlacesStore`は`usePlanStore`, `useAuthStore`, `getPlanCoordinator`, `getEventBus`, `PlaceEventBus`, `useAuthStore`, `syncDebugUtils`に直接依存。
- `placesStore`は`storeEventBus`イベントのみに依存し、Plan本体データから同期された構造体。
- `selectedPlaceStore`は外部依存なし（Google Maps型のみ）。

## 統合要件

1. **単一ソース宣言**: 保存済み地点の真実は`savedPlacesStore`に限定し、Plan単位のMap構造が必要な場合はセレクター/サービスで構築する。
2. **ビジネスロジック分離**: `PlaceManagementService`（`PLACE_SERVICE`）にCRUDバリデーション/イベント発火/PlanService呼び出しを移し、`savedPlacesStore`は`setState`と購読処理に限定する。
3. **イベント経由同期**: `placesStore`のPLAN_*イベントを`PlaceEventBus`起点のイベントへ置き換え、`placesStore`自体は統合後に削除。必要なMap構造は`PlaceSelector`ユーティリティで生成。
4. **UI一時状態の明確化**: `selectedPlaceStore`を`placeSearchDraftStore`のような命名に改め、保存済みデータとは別ドメインとして明記する。
5. **Hook化されたアクセサ**: `useSavedPlaces()`/`usePlaceActions()`のようなHookを導入し、コンポーネントから直接ストア/DIへ触らせない。
6. **移行パス**:
   - Step1: `PlaceManagementService`をServiceContainerへ登録し、`savedPlacesStore`のCRUDでサービスを呼ぶ薄いアクションに置換。
   - Step2: `placesStore`を読み取り専用Selectorへ変換し、イベント購読を`PlaceEventBus`へ切り替え。
   - Step3: コンポーネントが`placesStore`を参照している箇所をHook越しに差し替え、不要になった`placesStore`実装を削除。
   - Step4: `selectedPlaceStore`の命名変更と責務整理（フォーム状態を専用Hookへ退避）。

## データ移行/整合性チェック

- `placesStore`が保持する`placesByPlan`は`savedPlacesStore.places`と同じオブジェクト参照ではないため、統合前に以下の同期確認が必要。
  - PLAN_LOADEDイベントで`savedPlacesStore`へ`plan.places`をセットする`hydrate`アクションを追加。
  - `savedPlacesStore`から`placesStore`へイベントで流している箇所（PlaceEventBus）を洗い出し重複通知を削減。
- 削除フラグ/復元情報は`savedPlacesStore`にのみ存在。`placesStore`で削除された場合、`savedPlacesStore`側のPlaceは残留するため、統合集約時に一括削除処理を実施。

## 完了判定基準

- `placesStore.ts`が削除され、検索結果やMapハイライトは`useSavedPlacesStore`またはSelector経由で提供される。
- `savedPlacesStore.ts`内から`getPlanCoordinator`, `getEventBus`, `useAuthStore`, `usePlanStore`直接参照が無くなり、DIサービスとHook越しに依存する。
- `PlaceManagementService`がServiceContainerで`PLACE_SERVICE`識別子に登録され、Hook/コンポーネントは`getPlaceService()`経由で利用する。
- `selectedPlaceStore`（改名済み）がUI一時状態のみ扱い、保存済み情報との混在ロジックが存在しない。
