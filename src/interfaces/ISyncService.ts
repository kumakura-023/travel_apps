import { TravelPlan } from "../types";
import { SyncOperation, SyncContext } from "../types/SyncTypes";

/**
 * 同期競合の情報を表すインターフェース
 */
export interface SyncConflict {
  localPlan: TravelPlan;
  remotePlan: TravelPlan;
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictType: "update" | "delete" | "merge";
}

/**
 * 同期結果を表すインターフェース
 */
export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  conflicts?: SyncConflict[];
  error?: Error;
}

/**
 * 同期サービスのインターフェース
 * プランの同期と競合解決を管理
 */
export interface ISyncService {
  /**
   * 指定されたプランを同期
   * @param planId 同期するプランのID
   * @returns 同期結果
   */
  sync(planId: string): Promise<SyncResult>;

  /**
   * 自動同期を有効化
   */
  enableAutoSync(): void;

  /**
   * 自動同期を無効化
   */
  disableAutoSync(): void;

  /**
   * 同期競合を解決
   * @param conflict 解決する競合
   * @returns 解決されたプラン
   */
  resolveConflict(conflict: SyncConflict): Promise<TravelPlan>;

  /**
   * 同期操作をキューに追加
   * @param operation 同期操作
   * @param plan 対象プラン
   * @param context 同期コンテキスト
   */
  queueOperation(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext,
  ): void;

  /**
   * 保留中の同期操作を実行
   */
  processPendingOperations(): Promise<void>;

  /**
   * 同期状態を取得
   * @returns 現在の同期が有効かどうか
   */
  isAutoSyncEnabled(): boolean;

  /**
   * 同期履歴をクリア
   */
  clearSyncHistory(): void;
}
