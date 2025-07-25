/**
 * 同期関連の型定義
 */

export type SyncMode = 'immediate' | 'debounced' | 'batch';

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

export type SyncOperationType = 
  | 'place_added'
  | 'place_deleted' 
  | 'place_updated'
  | 'memo_updated'
  | 'label_added'
  | 'label_updated'
  | 'label_deleted'
  | 'plan_updated';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  mode: SyncMode;
  priority: SyncPriority;
  timestamp: number;
  data?: any;
  retryCount?: number;
}

export interface SyncConfig {
  debounceDelay: number;
  batchSize: number;
  retryLimit: number;
  criticalOperations: SyncOperationType[];
  debouncedOperations: SyncOperationType[];
  operationDebounceDelays?: Partial<Record<SyncOperationType, number>>;
}

export interface SyncContext {
  isOnline: boolean;
  hasUser: boolean;
  isRemoteUpdateInProgress: boolean;
  lastSyncTimestamp: number;
  uid?: string;
}