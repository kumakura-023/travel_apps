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
  
  // 書き込み頻度制限機能
  private writeHistory: number[] = [];
  private maxWritesPerMinute: number = 20; // 10から20に増加
  private writeIntervalMs: number = 60000; // 1分
  private pendingWriteQueue: Array<{
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext,
    timestamp: number
  }> = [];
  private emergencyStopFlag = false;
  private consecutiveErrorCount = 0;
  private maxConsecutiveErrors = 3;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      debounceDelay: 1000,
      batchSize: 10,
      retryLimit: 3,
      criticalOperations: ['place_added', 'place_deleted'],
      debouncedOperations: ['memo_updated', 'place_updated'],
      operationDebounceDelays: {
        memo_updated: 30000, // メモ更新は30秒のデバウンス
        place_updated: 1000,
        label_updated: 1000,
        plan_updated: 1000
      },
      ...config
    };
    
    // 定期的に書き込み履歴をクリーンアップ
    setInterval(() => {
      this.cleanupWriteHistory();
      this.processPendingWrites();
    }, 10000); // 10秒ごと
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
    // 緊急停止フラグがセットされている場合は処理を停止
    if (this.emergencyStopFlag) {
      return;
    }
    
    // リモート更新中は同期を停止
    if (context.isRemoteUpdateInProgress) {
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


    // 書き込み頻度制限チェック
    if (!this.canWriteNow()) {
      this.queuePendingWrite(operation, plan, context);
      return;
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
      if (context.isOnline && context.hasUser && context.uid && !context.isRemoteUpdateInProgress) {
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
    }

    // ローカル保存は即座実行
    try {
      await savePlanHybrid(plan, { mode: 'local' });
    } catch (error) {
      console.warn('ローカル保存失敗:', error);
    }

    // 操作タイプ別のデバウンス時間を取得
    const debounceDelay = this.config.operationDebounceDelays?.[operation.type] || this.config.debounceDelay;
    
    // デバウンスタイマーを設定
    
    // 既存の操作と統合（重複回避）
    const existingOps = Array.from(this.operationQueue.values()).filter(
      op => op.type === operation.type && op.mode === 'debounced'
    );
    existingOps.forEach(op => this.operationQueue.delete(op.id));

    const timer = setTimeout(async () => {

      try {
        if (context.isOnline && context.hasUser && context.uid && !context.isRemoteUpdateInProgress) {
          await this.syncToCloud(operation, plan, context);
        }

        this.operationQueue.delete(operation.id);
        this.debounceTimers.delete(operation.type);

        syncDebugUtils.log('save', {
          type: 'debounced_sync',
          operation: operation.type,
          timestamp: operation.timestamp,
          delay: debounceDelay,
          success: true
        });

      } catch (error) {
        await this.handleSyncError(operation, plan, context, error);
      }
    }, debounceDelay);

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
    if (context.isOnline && context.hasUser && context.uid && !context.isRemoteUpdateInProgress) {
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
    
    // 書き込み履歴に追加
    this.recordWrite(saveStartTimestamp);


    try {
      // contextからuidを取得してクラウド保存
      if (!context.uid) {
        throw new Error('uid is required for cloud save');
      }
      
      await savePlanHybrid(plan, { mode: 'cloud', uid: context.uid });
      
      // 成功時はエラーカウンターをリセット
      this.consecutiveErrorCount = 0;

      const saveEndTimestamp = Date.now();

    } catch (error: any) {
      this.handleFirebaseError(error);
      throw error; // エラーを再スローして上位のエラーハンドリングに任せる
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
   * 書き込み可能かチェック
   */
  private canWriteNow(): boolean {
    this.cleanupWriteHistory();
    return this.writeHistory.length < this.maxWritesPerMinute && !this.emergencyStopFlag;
  }
  
  /**
   * 書き込み履歴を記録
   */
  private recordWrite(timestamp: number): void {
    this.writeHistory.push(timestamp);
    this.cleanupWriteHistory();
  }
  
  /**
   * 古い書き込み履歴をクリーンアップ
   */
  private cleanupWriteHistory(): void {
    const now = Date.now();
    this.writeHistory = this.writeHistory.filter(timestamp => 
      now - timestamp < this.writeIntervalMs
    );
  }
  
  /**
   * 制限超過時のキューへの追加
   */
  private queuePendingWrite(
    operation: SyncOperation,
    plan: TravelPlan,
    context: SyncContext
  ): void {
    const queueItem = {
      operation,
      plan,
      context,
      timestamp: Date.now()
    };
    
    this.pendingWriteQueue.push(queueItem);
    
  }
  
  /**
   * キューに保存された書き込みを処理
   */
  private async processPendingWrites(): Promise<void> {
    if (this.emergencyStopFlag || this.pendingWriteQueue.length === 0) {
      return;
    }
    
    const processableCount = Math.min(
      this.maxWritesPerMinute - this.writeHistory.length,
      this.pendingWriteQueue.length
    );
    
    if (processableCount <= 0) {
      return;
    }
    
    const itemsToProcess = this.pendingWriteQueue.splice(0, processableCount);
    
    
    for (const item of itemsToProcess) {
      try {
        await this.processOperation(item.operation, item.plan, item.context);
      } catch (error) {
        console.error('キューからの書き込み処理失敗:', error);
      }
    }
  }
  
  /**
   * Firebaseエラーのハンドリング
   */
  private handleFirebaseError(error: any): void {
    this.consecutiveErrorCount++;
    
    const errorMessage = error?.message || error?.toString() || '';
    const isQuotaError = errorMessage.includes('quota') || 
                        errorMessage.includes('limit') ||
                        errorMessage.includes('too many requests') ||
                        errorMessage.includes('resource-exhausted') ||
                        errorMessage.includes('Write stream exhausted');
    
    
    // クォータエラーまたは連続エラーが多い場合は緊急停止
    if (isQuotaError || this.consecutiveErrorCount >= this.maxConsecutiveErrors) {
      this.activateEmergencyStop();
    }
  }
  
  /**
   * 緊急停止モードを有効化
   */
  private activateEmergencyStop(): void {
    this.emergencyStopFlag = true;
    
    
    // 1分後に自動で停止モードを解除（エラー回復を早める）
    setTimeout(() => {
      this.deactivateEmergencyStop();
    }, 60 * 1000);
  }
  
  /**
   * 緊急停止モードを解除
   */
  private deactivateEmergencyStop(): void {
    this.emergencyStopFlag = false;
    this.consecutiveErrorCount = 0;
    
  }
  
  /**
   * 緊急停止モードを手動で解除（デバッグ用）
   */
  public resetEmergencyStop(): void {
    this.deactivateEmergencyStop();
  }

  /**
   * 同期状況の取得
   */
  getSyncStatus() {
    return {
      queueSize: this.operationQueue.size,
      pendingDebounces: this.debounceTimers.size,
      isProcessing: this.isProcessing,
      writeHistory: this.writeHistory.length,
      pendingWriteQueue: this.pendingWriteQueue.length,
      emergencyStopFlag: this.emergencyStopFlag,
      consecutiveErrorCount: this.consecutiveErrorCount
    };
  }
}