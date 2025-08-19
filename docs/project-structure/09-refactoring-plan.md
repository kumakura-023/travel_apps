# リファクタリング計画

## 概要

このドキュメントは、VoyageSketchプロジェクトのリファクタリング計画を詳細に記載します。各タスクは具体的で実装可能な形で定義され、実装者が迷わず作業できるように設計されています。

## リファクタリングの目標

1. **単一責任原則の徹底** - 各コンポーネント/サービスが1つの明確な責任を持つ
2. **重複コードの削除** - DRY原則の適用
3. **保守性の向上** - コードの理解しやすさと変更のしやすさ
4. **テスタビリティの改善** - 依存性注入とモック可能な設計

## フェーズ1: 緊急対応（1-2週間）

### タスク1-1: 重複ファイルの削除

**対象ファイル**:

- `src/services/planListServiceNoSort.ts` を削除
- `src/components/Map.tsx` を削除（MapContainerを直接使用）

**実装手順**:

1. `planListServiceNoSort.ts`の参照箇所を検索
2. すべての参照を`planListService.ts`に変更
3. ファイルを削除
4. `Map.tsx`の参照箇所をすべて`MapContainer.tsx`に変更
5. ファイルを削除

### タスク1-2: DIシステムの統一

**現状**: 2つのDIシステムが混在

- `src/services/ServiceContainer.ts`
- `src/di/DIContainer.ts`

**実装手順**:

1. `DIContainer.ts`の機能を`ServiceContainer.ts`に統合
2. すべての参照を`ServiceContainer`に統一
3. `DIContainer.ts`を削除
4. テストを実行して動作確認

### タスク1-3: PlaceDetailPanelの分割

**現状**: 1000行以上の巨大コンポーネント

**新しい構造**:

```
src/components/placeDetail/
├── PlaceDetailPanel.tsx (メインコンテナ - 100行以下)
├── PlaceDetailHeader.tsx (ヘッダー部分)
├── PlaceDetailInfo.tsx (基本情報表示)
├── PlaceDetailCost.tsx (コスト関連)
├── PlaceDetailMemo.tsx (メモ機能)
├── PlaceDetailImages.tsx (画像管理)
├── PlaceDetailActions.tsx (アクションボタン)
└── hooks/
    ├── usePlaceDetail.ts (ビジネスロジック)
    └── usePlaceCost.ts (コスト計算ロジック)
```

**実装手順**:

1. 新しいディレクトリ構造を作成
2. PlaceDetailPanelから各セクションを抽出
3. ビジネスロジックをカスタムフックに移動
4. 元のPlaceDetailPanelを削除
5. インポートパスを更新

### タスク1-4: ストア名の統一

**変更内容**:

- `placeStore.ts` → `selectedPlaceStore.ts`
- `placesStore.ts` → `savedPlacesStore.ts`

**実装手順**:

1. ファイル名を変更
2. ストア名とフック名を変更
   - `useSelectedPlaceStore` → `useSelectedPlaceStore`（変更なし）
   - `usePlacesStore` → `useSavedPlacesStore`
3. 全ファイルでインポートを更新
4. テスト実行

## フェーズ2: アーキテクチャ改善（2-3週間）

### タスク2-1: サービスインターフェースの完全実装

**作成するインターフェース**:

```typescript
// src/interfaces/ISyncService.ts
interface ISyncService {
  sync(planId: string): Promise<SyncResult>;
  enableAutoSync(): void;
  disableAutoSync(): void;
  resolveConflict(conflict: SyncConflict): Promise<void>;
}

// src/interfaces/IPlanService.ts
interface IPlanService {
  createPlan(data: PlanData): Promise<Plan>;
  updatePlan(id: string, data: Partial<PlanData>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;
  setActivePlan(id: string): Promise<void>;
}

// src/interfaces/IDirectionsService.ts
interface IDirectionsService {
  calculateRoute(request: RouteRequest): Promise<RouteResult>;
  calculateBatchRoutes(requests: RouteRequest[]): Promise<RouteResult[]>;
}
```

**実装手順**:

1. 各インターフェースファイルを作成
2. 既存サービスにインターフェースを実装
3. ServiceContainerでインターフェースベースの登録に変更
4. 依存箇所をインターフェース参照に変更

### タスク2-2: Safe\*コンポーネントの統一

**対象**:

- `SafeRouteOverlay` + `RouteDisplay`
- `SafeTravelTimeOverlay` + `TravelTimeOverlay`

**新しい実装**:

```typescript
// src/components/hoc/withErrorBoundary.tsx
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<{ error: Error }>
) {
  return (props: P) => {
    return (
      <ErrorBoundary fallback={FallbackComponent}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// 使用例
export const RouteOverlay = withErrorBoundary(RouteDisplay);
export const TravelTimeOverlay = withErrorBoundary(TravelTimeDisplay);
```

**実装手順**:

1. `withErrorBoundary` HOCを作成
2. Safe\*コンポーネントの参照を新しい実装に変更
3. 元のSafe\*コンポーネントを削除

### タスク2-3: ビジネスロジックのサービス層への移動

**対象ストア**: すべてのZustandストア

**例: placesStoreのリファクタリング**:

```typescript
// src/services/PlaceManagementService.ts
export class PlaceManagementService {
  constructor(
    private placeRepository: IPlaceRepository,
    private eventBus: IEventBus,
  ) {}

  async addPlace(data: PlaceData): Promise<Place> {
    // バリデーション
    this.validatePlaceData(data);

    // ビジネスロジック
    const place = this.createPlace(data);

    // 永続化
    await this.placeRepository.save(place);

    // イベント発行
    this.eventBus.emit("place:added", place);

    return place;
  }

  private validatePlaceData(data: PlaceData): void {
    if (!data.coordinates) {
      throw new PlaceValidationError("Coordinates are required");
    }
  }
}

// src/store/savedPlacesStore.ts (新しい実装)
export const useSavedPlacesStore = create<PlacesState>((set) => ({
  places: [],
  setPlaces: (places) => set({ places }),
  // ビジネスロジックなし、純粋な状態管理のみ
}));
```

**実装手順**:

1. 各ストアに対応するサービスクラスを作成
2. ビジネスロジックをサービスに移動
3. ストアを純粋な状態管理に変更
4. コンポーネントからサービスを使用するように変更

## フェーズ3: 統合と最適化（3-4週間）

### タスク3-1: ルート関連ストアの統合

**現状**:

- `routeSearchStore.ts`
- `routeConnectionsStore.ts`

**新しい統合ストア**:

```typescript
// src/store/routeStore.ts
interface RouteState {
  // 検索UI
  searchPanel: {
    isOpen: boolean;
    origin: Place | null;
    destination: Place | null;
  };

  // ルート結果
  routes: Map<string, RouteResult>;

  // 接続情報
  connections: Connection[];

  // アクション
  openSearchPanel: () => void;
  closeSearchPanel: () => void;
  setRoute: (id: string, route: RouteResult) => void;
  addConnection: (connection: Connection) => void;
}
```

**実装手順**:

1. 新しい統合ストアを作成
2. 既存ストアのデータと機能を移行
3. 参照箇所を新しいストアに変更
4. 元のストアを削除

### タスク3-2: エラーハンドリングの統一

**実装内容**:

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public retry?: () => Promise<void>,
  ) {
    super(message);
  }
}

// src/errors/ErrorCodes.ts
export enum ErrorCode {
  // ネットワーク
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",

  // 同期
  SYNC_CONFLICT = "SYNC_CONFLICT",
  SYNC_FAILED = "SYNC_FAILED",

  // バリデーション
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // 権限
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHORIZED = "UNAUTHORIZED",
}

// src/errors/ErrorHandler.ts
export class ErrorHandler {
  static handle(error: Error): void {
    if (error instanceof AppError) {
      // アプリケーションエラーの処理
      this.handleAppError(error);
    } else {
      // 予期しないエラー
      this.handleUnexpectedError(error);
    }
  }
}
```

**実装手順**:

1. エラークラス階層を作成
2. エラーコードを定義
3. 統一エラーハンドラーを実装
4. 各サービスでAppErrorを使用
5. UIでエラー表示を統一

### タスク3-3: イベントシステムの導入

**実装内容**:

```typescript
// src/events/EventBus.ts
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }
}

// 使用例
eventBus.on("place:added", (place) => {
  // 場所が追加されたときの処理
});
```

**実装手順**:

1. EventBusクラスを作成
2. ServiceContainerに登録
3. ストアのコールバックをイベントに置き換え
4. サービス間通信をイベントベースに変更

## 実装順序と優先度

### 即座に実施（1週間以内）

1. タスク1-1: 重複ファイルの削除
2. タスク1-2: DIシステムの統一
3. タスク1-4: ストア名の統一

### 短期（2週間以内）

1. タスク1-3: PlaceDetailPanelの分割
2. タスク2-2: Safe\*コンポーネントの統一

### 中期（1ヶ月以内）

1. タスク2-1: サービスインターフェースの完全実装
2. タスク2-3: ビジネスロジックのサービス層への移動
3. タスク3-2: エラーハンドリングの統一

### 長期（2ヶ月以内）

1. タスク3-1: ルート関連ストアの統合
2. タスク3-3: イベントシステムの導入

## 成功指標

- コンポーネントの行数: 最大300行
- ストアの責任: 純粋な状態管理のみ
- サービスの責任: 単一のビジネスドメイン
- テストカバレッジ: 80%以上
- TypeScriptエラー: 0件

## 注意事項

1. **段階的な変更**: 一度にすべてを変更せず、小さな変更を積み重ねる
2. **後方互換性**: 可能な限り既存のAPIを維持
3. **テスト**: 各変更後に必ずテストを実行
4. **ドキュメント**: 変更内容をREADMEやコメントで文書化
