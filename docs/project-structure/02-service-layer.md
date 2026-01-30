# サービス層とビジネスロジック

## 概要

サービス層はアプリケーションのビジネスロジックを管理し、UIコンポーネントとデータ層の間の橋渡しをする責任を持ちます。

## 主要サービス

### 1. PlanService

**場所**: `src/services/plan/PlanService.ts`

**責任**: プラン作成/更新/削除、共有設定、Firestore・LocalStorage両リポジトリへの書き込み調整。

**主要依存**: `FirestorePlanRepository`, `LocalStoragePlanRepository`, `EventBus`

### 2. ActivePlanService

**場所**: `src/services/plan/ActivePlanService.ts`

**責任**: アクティブプランIDの管理、planStoreとの同期、画面遷移時のフェッチ制御。

**主要依存**: `planStore`, `PlanService`, `EventBus`

### 3. UnifiedPlanService

**場所**: `src/services/plan/UnifiedPlanService.ts`

**責任**: ローカル/クラウド差分を吸収して単一Plan APIを提供し、オフライン差分をPlanCoordinatorへ伝搬。

**主要依存**: `PlanService`, `PlanCoordinator`, `SyncManager`, `EventBus`

### 4. PlanEventService

**場所**: `src/services/plan/PlanEventService.ts`

**責任**: EventBus経由でPlan更新/削除イベントを発行し、planStoreやUIフックが購読できるよう調整。

**主要依存**: `EventBus`, `planStore`

### 5. PlanCoordinator

**場所**: `src/coordinators/PlanCoordinator.ts`

**責任**: PlanService・UnifiedPlanService・ストア・hooksの間で指示を仲介するユースケース調整役。

**主要依存**: `PlanService`, `UnifiedPlanService`, `ServiceContainer`, 各種 stores

### 6. PlanService 補助（PlanListService/PlanCloudService）

- **PlanListService** (`src/services/planListService.ts`)
  - プラン一覧の取得/キャッシュ、ソート・フィルタリング、planListStoreへの反映。
  - 依存: `planStore`, `UnifiedPlanService`, `FirestorePlanRepository`
- **PlanCloudService** (`src/services/planCloudService.ts`)
  - クラウドバックアップ、共有リンク生成、Firebase連携。
  - 依存: `PlanService`, `storageService`, Firebase APIs

### 7. SyncManager & SyncCoordinator

- **SyncManager** (`src/services/SyncManager.ts`)
  - 同期のオーケストレーション、競合検出、バックグラウンド同期トリガー。
  - 依存: `FirestorePlanRepository`, `LocalStoragePlanRepository`, `SyncCoordinator`, `EventBus`
- **SyncCoordinator** (`src/services/sync/SyncCoordinator.ts`)
  - SyncManagerと各リポジトリ/サービスの橋渡し、スケジュール/リトライ制御。
  - 依存: `SyncManager`, `storageService`, `EventBus`

### 8. Sync & Save 系ユーティリティ

- **SaveService / AutoSaveService** (`src/services/save/`)
  - 手動保存とplanStore監視による自動保存、storageServiceとの連携。
  - 依存: `PlanService`, `storageService`, `planStore`, `EventBus`
- **SyncConflictResolver** (`src/services/syncConflictResolver.ts`)
  - Firestore/LocalStorage間の差分マージと勝者決定、EventBus通知。
  - 依存: `FirestorePlanRepository`, `LocalStoragePlanRepository`, `EventBus`
- **ConflictResolver** (`src/services/conflict/ConflictResolver.ts`)
  - SyncManagerから委譲された競合をドメインルールで解決しUnifiedPlanServiceへ返却。
  - 依存: `SyncManager`, `planStore`, `EventBus`

### 9. PlanLifecycleManager

**場所**: `src/services/lifecycle/PlanLifecycleManager.ts`

**責任**: プランの状態遷移（作成→編集中→共有）やAutoSave/Syncトリガーを管理。

**主要依存**: `ActivePlanService`, `SaveService`, `AutoSaveService`, `EventBus`

### 10. Directions/Directions Adjacent

- **directionsService** (`src/services/directionsService.ts`)
  - Google Directions/TravelTime API呼び出し、ルート・移動時間のキャッシュ。
  - 依存: Google Maps JS API, `routeStore`, `travelTimeStore`
- **planListServiceNoSort**: 削除済みで、現行は`planListService.ts`のみが使用される

### 11. ユーティリティサービス

- **storageService** (`src/services/storageService.ts`)
  - LocalStorage/IndexedDBアクセス、マイグレーション、暗号化。
  - 依存: ブラウザStorage APIs, 暗号化ユーティリティ
- **bookingService** (`src/services/bookingService.ts`)
  - 宿泊/交通予約リンクや外部アフィリエイト生成。
  - 依存: 外部連携設定, Google Travel APIs, `planStore`

### 12. PlaceManagementService

**場所**: `src/services/place/PlaceManagementService.ts`

**責任**: 保存済み場所のCRUD、メモ/コスト/削除フラグ更新、savedPlacesStoreとplacesStoreの同期。

**主要依存**: `savedPlacesStore`, `planStore`, `PlaceRepository`, `EventBus`

### 13. PlanLifecycle周辺（PlanEventServiceと連携）

**責任**: PlanEventService / PlanLifecycleManager / UnifiedPlanServiceが連動して状態変化をUIへ伝える構造。ServiceContainerから`PLAN_COORDINATOR`, `PLAN_SERVICE`, `ACTIVE_PLAN_SERVICE`, `UNIFIED_PLAN_SERVICE`として解決される。

## サービス層の問題点

### 1. 責任の重複

- 保存済み場所関連サービス（PlaceManagementService／planListService内ロジックなど）が同じドメインを扱い境界が曖昧

### 2. ストアへ直接アクセス

- PlanService以外でもZustandストアに直接触れる箇所が残り、テストが難しい

### 3. 永続化ロジックの重複

- PlanService／SaveService／AutoSaveServiceで同様の永続化コードが散在

### 4. エラーハンドリングの不統一

- DirectionsServiceやSync系でエラー表現がバラバラ

## 推奨される改善

### 1. サービス境界の整理

- PlaceManagementService / PlanListService / UnifiedPlanServiceなど、重複する責務を洗い出し統合

### 2. インターフェースとDIの徹底

- ServiceContainer経由で解決されないサービスにも契約を定義し、テストや差し替えを容易にする

### 3. 永続化・エラーハンドリングの共通化

- SaveService／AutoSaveService／PlanServiceで共通の保存ユーティリティとServiceError規約を共有

### 4. ストアアクセスの抽象化

- 直接Zustandを呼び出しているサービスはアクション層を挟み、EventBus／サービス経由のアクセスへ置き換える

## 実装優先順位

1. **高**: ドメインごとのサービス統合（Place系/Save系の整理）
2. **高**: インターフェース未定義サービス（PlanList/PlanLifecycle等）への契約導入
3. **中**: 永続化・エラーハンドリングの共通ユーティリティ整備
4. **低**: EventBusを介した通知の標準化とサンプル実装の整備
