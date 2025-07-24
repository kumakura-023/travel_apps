import { TravelPlan } from '../types';
import { SyncOperation, SyncMode, SyncPriority, SyncOperationType, SyncConfig, SyncContext } from '../types/SyncTypes';
import { savePlanHybrid } from './storageService';
import { syncDebugUtils } from '../utils/syncDebugUtils';

/**
 * 同期システム全体を管理するクラス
 * 操作の種類に応じて最適な同期戦略を適用
 */
export class SyncManager {
  private config: SyncConfig;
  private operationQueue: Map<string, SyncOperation> = new Map();
  private debounceTimers: Map<SyncOperationType, NodeJS.Timeout> = new Map();
  private isProcessing = false;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      debounceDelay: 300,
      batchSize: 10,
      retryLimit: 3,
      criticalOperations: ['place_added', 'place_deleted'],
      debouncedOperations: ['memo_updated', 'place_updated'],
      ...config
    };
  }

  /**
   * 同期操作をキューに追加
   */
  async queueOperation(
    type: SyncOperationType,
    plan: TravelPlan,
    context: SyncContext,
    data?: any
  ): Promise<void> {
    // リモート更新中は同期を停止
    if (context.isRemoteUpdateInProgress) {
      if (import.meta.env.DEV) {
        console.log('🚫 リモート更新中のため同期をスキップ:', type);
      }
      return;
    }
    const operation: SyncOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      mode: this.determineSyncMode(type),
      priority: this.determineSyncPriority(type),
      timestamp: Date.now(),
      data,
      retryCount: 0
    };

    this.operationQueue.set(operation.id, operation);

    if (import.meta.env.DEV) {
      console.log(`🔄 同期操作キューイング:`, {
        type: operation.type,
        mode: operation.mode,
        priority: operation.priority,
        queueSize: this.operationQueue.size
      });
    }

    await this.processOperation(operation, plan, context);
  }

  /**
   * 操作の同期モードを決定
   */
  private determineSyncMode(type: SyncOperationType): SyncMode {
    if (this.config.criticalOperations.includes(type)) {
      return 'immediate';
    }
    if (this.config.debouncedOperations.includes(type)) {
      return 'debounced';
    }
    return 'batch';
  }

  /**
   * 操作の同期優先度を決定
   */
  private determineSyncPriority(type: SyncOperationType): SyncPriority {
    switch (type) {
      case 'place_added':
      case 'place_deleted':
        return 'critical';
      case 'memo_updated':
      case 'place_updated':
        return 'high';
      case 'label_added':
      case 'label_updated':
      case 'label_deleted':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * 操作を処理
   */
  private async processOperation(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): Promise<void> {
    switch (operation.mode) {
      case 'immediate':
        await this.processImmediate(operation, plan, context);
        break;
      case 'debounced':
        await this.processDebounced(operation, plan, context);
        break;
      case 'batch':
        await this.processBatch(operation, plan, context);
        break;
    }
  }

  /**
   * 即座同期処理
   */
  private async processImmediate(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): Promise<void> {
    try {
      // ローカル保存（即座）
      await savePlanHybrid(plan, { mode: 'local' });
      
      // クラウド同期（即座）
      if (context.isOnline && context.hasUser && !context.isRemoteUpdateInProgress) {
        await this.syncToCloud(operation, plan, context);
      }

      this.operationQueue.delete(operation.id);

      syncDebugUtils.log('save', {
        type: 'immediate_sync',
        operation: operation.type,
        timestamp: operation.timestamp,
        success: true
      });

    } catch (error) {
      await this.handleSyncError(operation, plan, context, error);
    }
  }

  /**
   * デバウンス同期処理
   */
  private async processDebounced(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): Promise<void> {
    // 既存のタイマーをクリア
    const existingTimer = this.debounceTimers.get(operation.type);
    if (existingTimer) {
      clearTimeout(existingTimer);
      if (import.meta.env.DEV) {
        console.log(`⏰ デバウンスタイマークリア:`, operation.type);
      }
    }

    // ローカル保存は即座実行
    try {
      await savePlanHybrid(plan, { mode: 'local' });
    } catch (error) {
      console.warn('ローカル保存失敗:', error);
    }

    // デバウンスタイマーを設定
    if (import.meta.env.DEV) {
      console.log(`⏰ デバウンスタイマー設定 (${this.config.debounceDelay}ms):`, operation.type, new Date().toLocaleTimeString());
    }

    const timer = setTimeout(async () => {
      if (import.meta.env.DEV) {
        console.log(`🚀 デバウンス実行:`, operation.type, new Date().toLocaleTimeString());
      }

      try {
        if (context.isOnline && context.hasUser && !context.isRemoteUpdateInProgress) {
          await this.syncToCloud(operation, plan, context);
        }

        this.operationQueue.delete(operation.id);
        this.debounceTimers.delete(operation.type);

        syncDebugUtils.log('save', {
          type: 'debounced_sync',
          operation: operation.type,
          timestamp: operation.timestamp,
          delay: this.config.debounceDelay,
          success: true
        });

      } catch (error) {
        await this.handleSyncError(operation, plan, context, error);
      }
    }, this.config.debounceDelay);

    this.debounceTimers.set(operation.type, timer);
  }

  /**
   * バッチ同期処理
   */
  private async processBatch(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): Promise<void> {
    // ローカル保存は即座実行
    try {
      await savePlanHybrid(plan, { mode: 'local' });
    } catch (error) {
      console.warn('ローカル保存失敗:', error);
    }

    // バッチ処理は後で実装
    // 現在は即座処理として代替
    if (context.isOnline && context.hasUser && !context.isRemoteUpdateInProgress) {
      await this.syncToCloud(operation, plan, context);
    }

    this.operationQueue.delete(operation.id);
  }

  /**
   * クラウド同期実行
   */
  private async syncToCloud(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): Promise<void> {
    const saveStartTimestamp = Date.now();

    if (import.meta.env.DEV) {
      console.log(`☁️ クラウド同期開始 [${operation.mode}]:`, {
        operation: operation.type,
        priority: operation.priority,
        timestamp: saveStartTimestamp
      });
    }

    // ユーザーIDをcontextから取得する必要があるため、
    // 実際の実装では追加の引数が必要
    // ここでは既存のsavePlanHybridを使用
    await savePlanHybrid(plan, { mode: 'cloud' });

    const saveEndTimestamp = Date.now();

    if (import.meta.env.DEV) {
      console.log(`☁️ クラウド同期完了 [${operation.mode}]:`, {
        operation: operation.type,
        timeDiff: saveEndTimestamp - saveStartTimestamp
      });
    }
  }

  /**
   * 同期エラーハンドリング
   */
  private async handleSyncError(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext,
    error: any
  ): Promise<void> {
    operation.retryCount = (operation.retryCount || 0) + 1;

    if (operation.retryCount < this.config.retryLimit) {
      // リトライ
      setTimeout(() => {
        this.processOperation(operation, plan, context);
      }, 1000 * operation.retryCount);

      console.warn(`同期リトライ ${operation.retryCount}/${this.config.retryLimit}:`, error);
    } else {
      // 最大リトライ回数に達した場合は操作を削除
      this.operationQueue.delete(operation.id);
      console.error('同期失敗（最大リトライ回数到達）:', error);
    }

    syncDebugUtils.log('save', {
      type: 'sync_error',
      operation: operation.type,
      error: error.message,
      retryCount: operation.retryCount,
      timestamp: Date.now()
    });
  }

  /**
   * 待機中の操作をクリア
   */
  clearPendingOperations(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.operationQueue.clear();
  }

  /**
   * 同期状況の取得
   */
  getSyncStatus() {
    return {
      queueSize: this.operationQueue.size,
      pendingDebounces: this.debounceTimers.size,
      isProcessing: this.isProcessing
    };
  }
}