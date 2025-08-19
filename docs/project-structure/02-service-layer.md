# サービス層とビジネスロジック

## 概要

サービス層はアプリケーションのビジネスロジックを管理し、UIコンポーネントとデータ層の間の橋渡しをする責任を持ちます。

## 主要サービス

### 1. PlanService

**場所**: `src/services/plan/PlanService.ts`

**責任**:

- プランの作成、更新、削除
- プランのメタデータ管理
- プラン共有機能

**依存関係**:

- `FirestorePlanRepository`
- `LocalStoragePlanRepository`

### 2. ActivePlanService

**場所**: `src/services/plan/ActivePlanService.ts`

**責任**:

- 現在アクティブなプランの管理
- プラン切り替え機能
- アクティブプランの状態同期

### 3. SyncManager

**場所**: `src/services/SyncManager.ts`

**責任**:

- オンライン/オフライン同期
- 競合解決
- 同期状態の管理

**主要メソッド**:

- `sync()` - 手動同期
- `enableAutoSync()` - 自動同期の有効化
- `resolveConflicts()` - 競合解決

### 4. DirectionsService

**場所**: `src/services/directionsService.ts`

**責任**:

- Google Directions APIとの通信
- ルート計算
- 移動時間の見積もり

### 5. BookingService

**場所**: `src/services/bookingService.ts`

**責任**:

- 宿泊施設の予約リンク生成
- 外部予約サービスとの連携

### 6. PlanCloudService

**場所**: `src/services/planCloudService.ts`

**責任**:

- クラウドストレージとの同期
- プランのバックアップ
- 共有機能の実装

### 7. PlanListService

**場所**: `src/services/planListService.ts`

**責任**:

- プランリストの管理
- プランのソートとフィルタリング
- プランの検索機能

**問題点**: `planListServiceNoSort.ts`という重複ファイルが存在

### 8. StorageService

**場所**: `src/services/storageService.ts`

**責任**:

- ローカルストレージの管理
- データの永続化
- キャッシュ管理

### 9. SyncConflictResolver

**場所**: `src/services/syncConflictResolver.ts`

**責任**:

- 同期競合の検出
- 競合解決戦略の実装
- マージロジック

## サービス層の問題点

### 1. 責任の不明確さ

- 一部のサービスが複数の責任を持っている
- サービス間の境界が曖昧

### 2. 直接的な依存関係

- サービスがストアに直接依存している箇所がある
- インターフェースを介さない通信

### 3. 重複コード

- `planListService.ts`と`planListServiceNoSort.ts`の重複
- 同様の機能が複数のサービスに散在

### 4. エラーハンドリングの不統一

- 各サービスで異なるエラーハンドリング方法
- 統一されたエラー処理戦略の欠如

## 推奨される改善

### 1. サービスの責任分離

```typescript
// Before: 複数の責任を持つサービス
class PlanService {
  createPlan() {}
  syncPlan() {}
  sharePlan() {}
  validatePlan() {}
}

// After: 単一責任に分離
class PlanCreationService {}
class PlanSyncService {}
class PlanSharingService {}
class PlanValidationService {}
```

### 2. インターフェースの導入

```typescript
interface IPlanService {
  createPlan(data: PlanData): Promise<Plan>;
  updatePlan(id: string, data: Partial<PlanData>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;
}
```

### 3. イベント駆動アーキテクチャ

```typescript
// サービス間の疎結合な通信
class EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
}
```

### 4. 統一されたエラーハンドリング

```typescript
class ServiceError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
  ) {
    super(message);
  }
}
```

## 実装優先順位

1. **高**: 重複サービスの統合（planListService）
2. **高**: サービスインターフェースの定義
3. **中**: エラーハンドリングの統一
4. **低**: イベント駆動アーキテクチャの導入
