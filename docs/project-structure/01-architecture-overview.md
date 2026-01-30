# アーキテクチャ概要

## 依存性注入（DI）アーキテクチャ

### DIコンテナ

**場所**: `src/services/ServiceContainer.ts`

VoyageSketchでは`ServiceContainer`が唯一のDI実装であり、`registerDefaultServices()`を通じて各種リポジトリ・サービス・イベントバスをまとめて配線します。地図関連だけはGoogle Maps読み込み後に`registerMapService()`から動的に登録され、必要に応じて差し替え可能です。

```typescript
// サービス識別子
export const SERVICE_IDENTIFIERS = {
  MAP_SERVICE: Symbol("MapService"),
  PLAN_COORDINATOR: Symbol("PlanCoordinator"),
  PLAN_SERVICE: Symbol("PlanService"),
  ACTIVE_PLAN_SERVICE: Symbol("ActivePlanService"),
  UNIFIED_PLAN_SERVICE: Symbol("UnifiedPlanService"),
  FIRESTORE_PLAN_REPOSITORY: Symbol("FirestorePlanRepository"),
  LOCAL_STORAGE_PLAN_REPOSITORY: Symbol("LocalStoragePlanRepository"),
  FIRESTORE_USER_REPOSITORY: Symbol("FirestoreUserRepository"),
  SYNC_SERVICE: Symbol("SyncService"),
  DIRECTIONS_SERVICE: Symbol("DirectionsService"),
  EVENT_BUS: Symbol("EventBus"),
} as const;
```

### 主要コンポーネント

#### 1. ServiceContainer（DIコンテナ）

- **責任**: サービスの登録、解決、ライフサイクル管理
- **場所**: `src/services/ServiceContainer.ts`
- **機能**:
  - シングルトンサービスの管理
  - ファクトリー関数によるサービス生成
  - 動的なサービス登録（Google Maps読み込み後など）
  - ヘルパー関数: `register` / `registerSingleton` / `registerMockServices`

#### 2. EventBus（イベント駆動）

- **場所**: `src/events/EventBus.ts`
- **責任**: イベント駆動でサービスやストア間の疎結合通信を提供
- **解決方法**: `ServiceContainer.resolve(SERVICE_IDENTIFIERS.EVENT_BUS)`で取得し、各サービスが購読/発行を行う

### アダプター層

**目的**: 外部APIをアプリケーション固有のインターフェースに適合させる

#### GoogleMapsServiceAdapter

- **場所**: `src/adapters/GoogleMapsServiceAdapter.ts`
- **インターフェース**: `MapService`
- **責任**: Google Maps APIの抽象化

#### ZustandPlaceRepositoryAdapter

- **場所**: `src/adapters/ZustandPlaceRepositoryAdapter.ts`
- **インターフェース**: `PlaceRepository`
- **責任**: Zustandストアをリポジトリインターフェースに適合

### インターフェース定義

#### MapService

- **場所**: `src/interfaces/MapService.ts`
- **責任**: 地図操作の抽象化
- **主要メソッド**:
  - `addEventListener()` - イベントリスナー登録
  - `panTo()` - 地図の移動
  - `getZoom()/setZoom()` - ズーム操作

#### PlaceService

- **場所**: `src/interfaces/PlaceService.ts`
- **責任**: 場所検索とデータ取得
- **主要メソッド**:
  - `searchPlaces()` - 場所検索
  - `getPlaceDetails()` - 詳細情報取得
  - `searchNearbyPlaces()` - 近隣検索

#### PlaceRepository

- **場所**: `src/interfaces/PlaceRepository.ts`
- **責任**: 場所データの永続化
- **主要メソッド**:
  - `getPlaces()` - 場所リスト取得
  - `addPlace()` - 場所追加
  - `updatePlace()` - 場所更新
  - `deletePlace()` - 場所削除

### コーディネーター層

#### PlanCoordinator

- **場所**: `src/coordinators/PlanCoordinator.ts`
- **責任**: プラン関連の操作を調整
- **特徴**: 複数のサービスとストアを連携

### リポジトリ層

#### FirestorePlanRepository

- **場所**: `src/repositories/FirestorePlanRepository.ts`
- **責任**: Firestoreとのプランデータ同期

#### LocalStoragePlanRepository

- **場所**: `src/repositories/LocalStoragePlanRepository.ts`
- **責任**: ローカルストレージへのプラン保存

#### FirestoreUserRepository

- **場所**: `src/repositories/FirestoreUserRepository.ts`
- **責任**: ユーザーデータの管理

### アーキテクチャの問題点

1. **インターフェースを経由しないサービス**
   - 一部のサービス/リポジトリは依然として具象実装を直接参照しており、置き換えやテストが困難

2. **循環依存の潜在リスク**
   - ストア → サービス → ストアのような再帰的参照があり、設計次第で循環が発生しやすい

3. **イベント駆動の徹底不足**
   - EventBus経由で通知すべき箇所が直接的な関数呼び出しになっており、疎結合性を阻害

### 推奨される改善

1. ServiceContainer配下で未DI化のサービスを整理し、インターフェース越しに解決できるようにする
2. ストア/サービス間の循環依存を監視し、EventBusを介した非同期通知へ移行
3. Zustandストアへ直接アクセスするサービスを減らし、Hook→Service→Repositoryの層分離を徹底
4. EventBusの利用指針を策定し、状態変更通知を統一
