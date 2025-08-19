# プラン管理とクラウド同期

## 概要

プラン管理機能は、旅行計画の作成、編集、共有、同期を担当します。Firebase Firestoreを使用したリアルタイム同期と、オフライン対応が特徴です。

## 主要コンポーネント

### 1. PlanManager

**場所**: `src/components/PlanManager.tsx`

**責任**:

- プランの切り替え
- 新規プラン作成
- プラン一覧の管理

### 2. PlanList

**場所**: `src/components/PlanList.tsx`

**責任**:

- プラン一覧の表示
- プランの選択
- プランの削除

### 3. PlanEditModal

**場所**: `src/components/PlanEditModal.tsx`

**責任**:

- プラン情報の編集
- プラン名、説明の変更

### 4. PlanNameDisplay

**場所**: `src/components/PlanNameDisplay.tsx`

**責任**:

- 現在のプラン名表示
- プラン名編集への導線

### 5. PlanNameEditModal

**場所**: `src/components/PlanNameEditModal.tsx`

**責任**:

- プラン名の変更UI
- バリデーション

## 共有機能

### SharePlanModal

**場所**: `src/components/SharePlanModal.tsx`

**責任**:

- プラン共有リンクの生成
- 共有設定の管理
- QRコード生成

### InviteUrlModal

**場所**: `src/components/InviteUrlModal.tsx`

**責任**:

- 招待URLの表示
- コピー機能

### InviteAcceptPage

**場所**: `src/components/InviteAcceptPage.tsx`

**責任**:

- 共有リンクからのアクセス処理
- プランへの参加

## サービス層

### PlanService

**場所**: `src/services/plan/PlanService.ts`

**責任**:

- プランのCRUD操作
- ビジネスロジック

### ActivePlanService

**場所**: `src/services/plan/ActivePlanService.ts`

**責任**:

- アクティブプランの管理
- プラン切り替え

### PlanCoordinator

**場所**: `src/coordinators/PlanCoordinator.ts`

**責任**:

- プラン関連の操作を調整
- ストアとサービスの連携

### PlanCloudService

**場所**: `src/services/planCloudService.ts`

**責任**:

- クラウドとの同期
- オンライン/オフライン切り替え

## 同期機能

### SyncManager

**場所**: `src/services/SyncManager.ts`

**責任**:

- 自動同期の管理
- 競合解決
- 同期状態の監視

**主要機能**:

- オンライン/オフライン検出
- 差分同期
- バックグラウンド同期

### SyncConflictResolver

**場所**: `src/services/syncConflictResolver.ts`

**責任**:

- 同期競合の検出
- マージ戦略の実装
- ユーザーへの通知

### 同期関連コンポーネント

#### SyncStatusIndicator

**場所**: `src/components/SyncStatusIndicator.tsx`

**責任**: 同期状態の表示

#### SyncDebugButton

**場所**: `src/components/SyncDebugButton.tsx`

**責任**: 同期デバッグ機能（開発用）

#### SyncTestButton

**場所**: `src/components/SyncTestButton.tsx`

**責任**: 同期テスト機能（開発用）

## データ永続化

### リポジトリ

#### FirestorePlanRepository

**場所**: `src/repositories/FirestorePlanRepository.ts`

**責任**:

- Firestoreとの通信
- プランデータの永続化
- リアルタイム更新の監視

#### LocalStoragePlanRepository

**場所**: `src/repositories/LocalStoragePlanRepository.ts`

**責任**:

- ローカルストレージへの保存
- オフラインキャッシュ
- 一時データの管理

### ストア

#### planStore

**場所**: `src/store/planStore.ts`

**管理する状態**:

- 現在のプラン
- ローディング状態
- エラー状態

#### planListStore

**場所**: `src/store/planListStore.ts`

**管理する状態**:

- プランのリスト
- 選択中のプランID

## フック

### usePlanInitializer

**場所**: `src/hooks/usePlanInitializer.ts`

**責任**: プランの初期化処理

### usePlanLoad

**場所**: `src/hooks/usePlanLoad.ts`

**責任**: プランの読み込み

### useRealtimePlanListener

**場所**: `src/hooks/useRealtimePlanListener.ts`

**責任**: リアルタイム更新の監視

### usePlanSyncEvents

**場所**: `src/hooks/usePlanSyncEvents.ts`

**責任**: 同期イベントの処理

### useAutoSave

**場所**: `src/hooks/useAutoSave.ts`

**責任**: 自動保存機能

## 問題点

### 1. サービスの重複

- `PlanService`と`ActivePlanService`の責任が不明確
- `planListService`と`planListServiceNoSort`の重複

### 2. 同期ロジックの分散

```typescript
// 同期ロジックが複数の場所に存在
-SyncManager - PlanCloudService - FirestorePlanRepository - useAutoSave;
```

### 3. 状態管理の複雑さ

- プラン状態が複数のストアに分散
- 同期状態の管理が不透明

### 4. エラーハンドリングの不統一

- 各サービスで異なるエラー処理
- ユーザーへの通知方法が不統一

## 推奨される改善

### 1. サービスの統合

```typescript
// PlanServiceに責任を集約
class UnifiedPlanService {
  // プランCRUD
  createPlan(): Promise<Plan>;
  updatePlan(): Promise<Plan>;
  deletePlan(): Promise<void>;

  // アクティブプラン管理
  setActivePlan(): Promise<void>;
  getActivePlan(): Promise<Plan>;

  // 同期機能
  syncPlan(): Promise<void>;
  resolveSyncConflict(): Promise<void>;
}
```

### 2. 同期戦略の明確化

```typescript
interface SyncStrategy {
  sync(): Promise<SyncResult>;
  resolveConflict(local: Plan, remote: Plan): Plan;
  handleOffline(): void;
}

class LastWriteWinsSyncStrategy implements SyncStrategy {
  // 実装
}
```

### 3. イベント駆動の同期

```typescript
class SyncEventBus {
  emit('sync:started', { planId });
  emit('sync:completed', { planId, changes });
  emit('sync:conflict', { planId, conflict });
  emit('sync:error', { planId, error });
}
```

### 4. 統一されたエラー処理

```typescript
class PlanError extends Error {
  constructor(
    public code: PlanErrorCode,
    public message: string,
    public retry?: () => Promise<void>,
  ) {
    super(message);
  }
}

enum PlanErrorCode {
  SYNC_CONFLICT = "SYNC_CONFLICT",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
}
```

## リファクタリング優先順位

1. **高**: サービスの統合（PlanService + ActivePlanService）
2. **高**: 重複サービスの削除（planListServiceNoSort）
3. **中**: 同期ロジックの一元化
4. **低**: イベント駆動アーキテクチャの導入
