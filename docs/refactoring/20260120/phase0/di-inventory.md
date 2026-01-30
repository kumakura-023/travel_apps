# Phase 0: ServiceContainer依存棚卸し

## ServiceContainer登録一覧

|識別子|登録タイミング|ライフサイクル|具象/ファクトリ|主要依存|補足|
|---|---|---|---|---|---|
|`PLACE_REPOSITORY`|`registerDefaultServices`|Singleton|`new ZustandPlaceRepositoryAdapter()`|`useSavedPlacesStore`|Zustandストアを直接叩くアダプターで、コンテナ外ロジックを多く内包|
|`FIRESTORE_PLAN_REPOSITORY`|`registerDefaultServices`|Singleton|`new FirestorePlanRepository()`|Firestore SDK|Plan同期はここ経由で実装済み|
|`LOCAL_STORAGE_PLAN_REPOSITORY`|`registerDefaultServices`|Singleton|`new LocalStoragePlanRepository()`|`localStorage`|オフライン計画の暫定保存に使用|
|`FIRESTORE_USER_REPOSITORY`|`registerDefaultServices`|Singleton|`new FirestoreUserRepository()`|Firestore SDK|アクティブプラン解決で利用|
|`PLAN_SERVICE`|`registerDefaultServices`|Singleton|`new PlanService(firestorePlanRepo, firestoreUserRepo, localRepo)`|上記3リポジトリ|Plan CRUDの正規サービス|
|`ACTIVE_PLAN_SERVICE`|`registerDefaultServices`|Singleton|`new ActivePlanService(firestoreUserRepo)`|`FIRESTORE_USER_REPOSITORY`|現在のユーザーIDを引数に取る|
|`PLAN_COORDINATOR`|`registerDefaultServices`|Singleton|`new PlanCoordinator(planService, activePlanService)`|`PLAN_SERVICE`, `ACTIVE_PLAN_SERVICE`|ストア/サービス橋渡し。未だにComponentから直接参照される|
|`SYNC_SERVICE`|`registerDefaultServices`|Singleton|`new SyncManager()`|内部でリポジトリアクセス|`ISyncService`契約の唯一実装|
|`DIRECTIONS_SERVICE`|`registerDefaultServices`|Singleton|`directionsService`（既存インスタンス）|Google Maps API|軽量ユーティリティをそのまま共有|
|`EVENT_BUS`|`registerDefaultServices`|Singleton|`eventBus`|`EventBus`|PlaceEventBusなどが依存|
|`UNIFIED_PLAN_SERVICE`|`registerDefaultServices`|Singleton|`new UnifiedPlanService(firestorePlanRepo)`|`FIRESTORE_PLAN_REPOSITORY`, 各種Zustandストア|内部で`usePlanStore`等を直接参照する旧実装を保持|
|`MAP_SERVICE`|`registerMapService`|Transient|`new GoogleMapsServiceAdapter(mapInstance)`|Google Mapsインスタンス|`useGoogleMaps`完了後にのみ登録|
|`PLACE_SERVICE`|未登録|—|—|—|識別子のみ存在し、実装はモック登録でしか利用されていない|

## コンテナ外で生成されているサービス/ユーティリティ

- `src/hooks/useUnifiedPlan.ts`: `new UnifiedPlanService(new FirestorePlanRepository())`をフック内で生成し、ServiceContainerを介さずにPlan操作を実行している。
- `src/services/place/PlaceManagementService.ts`: 具象クラスは存在するが、コンテナへの登録もエクスポート済みインスタンスも無く、利用箇所は暫定的に`savedPlacesStore`内のビジネスロジックで肩代わりされている。
- `src/components/PlaceDetailsPanel.tsx`など多数のUIコンポーネントが`getPlanCoordinator()`を直接呼出し、Hook層やService層をバイパスしている（DI経路外のシングルトン取得）。

## クリーンアップ提案

1. `UnifiedPlanService`をServiceContainer経由のシングルトンに統一し、`useUnifiedPlan`では`getUnifiedPlanService()`を解決してHook専用状態（ローディング/メッセージ）だけを扱う構造へ書き換える。
2. `PlaceManagementService`を`PLACE_SERVICE`識別子で登録し、`savedPlacesStore`からビジネスロジックを段階的に移行する。移行フェーズ中はサービスからEventBusを通じてストアへ通知する。
3. `PlanCoordinator`やその他シングルトン取得ヘルパーをHooks/Services層にラップし、UIコンポーネントは`usePlanCoordinator()`のようなHookかContext越しに依存する。これによりテスト時の差し替えを単純化できる。
4. `registerMapService`実行前に`getMapService()`が呼ばれた場合の防衛ロジック（例: `has`チェックと例外メッセージ改善）を追加し、初期化タイミングのバグ調査を容易にする。
5. `PlaceRepository`アダプターの`localStorage`永続化はストア責務と重複しているため、イベント駆動のSyncに寄せるか、ServiceContainer側で別`PlacePersistenceService`を切り出して副作用を整理する。
