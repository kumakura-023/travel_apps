# アーキテクチャ概要

## 依存性注入（DI）アーキテクチャ

### DIコンテナ

**場所**: `src/services/ServiceContainer.ts`

VoyageSketchの中核となる依存性注入システム。アプリケーション全体でサービスの管理と提供を行う。

```typescript
// サービス識別子
export const SERVICE_IDENTIFIERS = {
  MAP_SERVICE: Symbol('MapService'),
  PLACE_SERVICE: Symbol('PlaceService'),
  PLACE_REPOSITORY: Symbol('PlaceRepository'),
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

#### 2. DIContainer（新しいDIシステム）
- **場所**: `src/di/DIContainer.ts`
- **注意**: 現在2つのDIシステムが混在している（要統合）

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

1. **DIシステムの重複**
   - `ServiceContainer`と`DIContainer`が並存
   - 統一が必要

2. **インターフェースの不完全な実装**
   - 一部のサービスがインターフェースを通さず直接使用されている

3. **循環依存の可能性**
   - ストアとサービス間の依存関係が明確でない

### 推奨される改善

1. DIシステムの統一
2. すべてのサービスのインターフェース化
3. 明確な層の分離（UI → Hook → Service → Repository）
4. イベント駆動アーキテクチャの導入