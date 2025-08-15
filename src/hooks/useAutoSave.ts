import { useEffect, useRef, useState, useCallback } from 'react';
import { TravelPlan } from '../types';
import { savePlanHybrid } from '../services/storageService';
import { useAuthStore } from './useAuth';
import { syncDebugUtils } from '../utils/syncDebugUtils';
import { SyncManager } from '../services/SyncManager';
import { SyncContext } from '../types/SyncTypes';

/**
 * TravelPlanの変更を監視するカスタムフック
 * 階層化された同期システムを採用
 */
export function useAutoSave(plan: TravelPlan | null, onSave?: (timestamp: number) => void) {
  const syncManagerRef = useRef<SyncManager>(new SyncManager());
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isRemoteUpdateInProgress, setIsRemoteUpdateInProgress] = useState(false);
  const lastSavedTimestampRef = useRef<number>(0); // 最後に保存したタイムスタンプ
  const lastPlanHashRef = useRef<string>(''); // 最後に保存したプランのハッシュ
  const changeCountRef = useRef<number>(0); // 変更回数のカウンター
  const lastLocalSaveRef = useRef<number>(0); // 最後のローカル保存時刻
  const lastCloudSaveRef = useRef<number>(0); // 最後のクラウド保存時刻
  const cloudSaveTimestampRef = useRef<number>(0); // クラウド保存タイムスタンプ（独立管理）
  const isWritingToCloudRef = useRef<boolean>(false); // クラウド書き込み中フラグ
  const lastWriteCompletedRef = useRef<number>(0); // 最後の書き込み完了時刻
  const user = useAuthStore((s) => s.user);

  // プランのハッシュを計算（変更検知用）- 最適化版
  const calculatePlanHash = useCallback((plan: TravelPlan): string => {
    // 軽量なハッシュ計算（IDのみ、updatedAtは除外して無限ループを防ぐ）
    const placeIds = plan.places.map(p => p.id).sort().join(',');
    const labelIds = plan.labels.map(l => l.id).sort().join(',');
    const placeCount = plan.places.length;
    const labelCount = plan.labels.length;
    
    return `${placeCount}:${labelCount}:${placeIds}:${labelIds}`;
  }, []);

  // 同期コンテキストを取得
  const getSyncContext = useCallback((): SyncContext => ({
    isOnline: navigator.onLine,
    hasUser: !!user,
    isRemoteUpdateInProgress,
    lastSyncTimestamp: lastSavedTimestampRef.current,
    uid: user?.uid
  }), [user, isRemoteUpdateInProgress]);
  
  // 自己更新フラグを取得するコールバック（改善版）
  const getSelfUpdateFlag = useCallback((): boolean => {
    // 現在書き込み中、または最近書き込みが完了した場合は自己更新として扱う
    const now = Date.now();
    // Firebaseの更新通知は遅延することがあるため、より長い期間を設定
    const recentlyCompleted = lastWriteCompletedRef.current > 0 && 
                             (now - lastWriteCompletedRef.current) < 3000; // 3秒以内に延長
    
    // クラウド保存タイムスタンプとの差も確認（より厳密な判定）
    const recentCloudSave = cloudSaveTimestampRef.current > 0 && 
                           (now - cloudSaveTimestampRef.current) < 3000; // 3秒以内
    
    
    return isWritingToCloudRef.current || recentlyCompleted || recentCloudSave;
  }, []);

  // 即座ローカル保存関数（互換性のため保持）
  const saveImmediately = useCallback(async (plan: TravelPlan) => {
    try {
      await savePlanHybrid(plan, { mode: 'local' });
      lastLocalSaveRef.current = Date.now();
    } catch (error) {
      console.error('即座ローカル保存失敗:', error);
    }
  }, []);

  // 新しい同期システム経由の保存関数
  const saveWithSyncManager = useCallback(async (plan: TravelPlan, operationType: 'place_added' | 'place_deleted' | 'place_updated' | 'memo_updated' | 'plan_updated' | 'label_added' | 'label_updated' | 'label_deleted' = 'place_updated') => {
    const context = getSyncContext();
    await syncManagerRef.current.queueOperationLegacy(operationType, plan, context);
  }, [getSyncContext]);

  // 即座クラウド同期関数（イベントベース）
  const saveImmediatelyCloud = useCallback(async (plan: TravelPlan) => {
    if (!navigator.onLine || !user) return;
    
    // SyncManagerの緊急停止フラグをチェック
    const syncStatus = syncManagerRef.current.getSyncStatus();
    if (syncStatus.emergencyStopFlag) {
      return;
    }
    
    setIsSaving(true);
    isWritingToCloudRef.current = true; // 書き込み開始フラグをセット
    
    try {
      const saveStartTimestamp = Date.now();
      lastCloudSaveRef.current = saveStartTimestamp;
      lastSavedTimestampRef.current = saveStartTimestamp;
      
      // 保存開始時にタイムスタンプを設定（即座に利用可能にする）
      cloudSaveTimestampRef.current = saveStartTimestamp;
      
      
      syncDebugUtils.log('save', {
        timestamp: saveStartTimestamp,
        places: plan.places.length,
        labels: plan.labels.length,
        totalCost: plan.totalCost,
        type: 'immediate_cloud_sync',
        planHash: calculatePlanHash(plan)
      });
      
      await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
      
      // クラウド保存完了後にタイムスタンプを更新
      const saveEndTimestamp = Date.now();
      cloudSaveTimestampRef.current = saveEndTimestamp;
      setIsSynced(true);
      
      
      onSave?.(saveEndTimestamp);
    } catch (err: any) {
      console.warn('即座クラウド同期失敗:', err);
      
      // FirebaseエラーをSyncManagerに通知
      const errorMessage = err?.message || err?.toString() || '';
      const isQuotaError = errorMessage.includes('quota') || 
                          errorMessage.includes('limit') ||
                          errorMessage.includes('too many requests');
      
      if (isQuotaError) {
        // SyncManagerにエラーを通知して緊急停止をトリガー
        // ここではhandleFirebaseErrorを直接呼べないので、ダミーの同期操作でエラーを発生させる
        try {
          const context = getSyncContext();
          await syncManagerRef.current.queueOperationLegacy('memo_updated', plan, context);
        } catch {
          // 無視 - 既にSyncManager側でエラーハンドリングが動作する
        }
      }
      
      setIsSynced(false);
    } finally {
      setIsSaving(false);
      lastWriteCompletedRef.current = Date.now(); // 書き込み完了時刻を記録
      isWritingToCloudRef.current = false; // 書き込み終了フラグをリセット
    }
  }, [user, onSave, calculatePlanHash, getSyncContext]);

  // バッチクラウド同期関数（フォールバック用）
  const batchCloudSync = useCallback(async (plan: TravelPlan) => {
    if (!navigator.onLine || !user) return;
    
    // SyncManagerの緊急停止フラグをチェック
    const syncStatus = syncManagerRef.current.getSyncStatus();
    if (syncStatus.emergencyStopFlag) {
      if (import.meta.env.DEV) {
        console.log('🚨 緊急停止中のためバッチ同期をスキップ');
      }
      return;
    }
    
    setIsSaving(true);
    isWritingToCloudRef.current = true; // 書き込み開始フラグをセット
    
    try {
      const saveStartTimestamp = Date.now();
      lastCloudSaveRef.current = saveStartTimestamp;
      lastSavedTimestampRef.current = saveStartTimestamp;
      
      // 保存開始時にタイムスタンプを設定（即座に利用可能にする）
      cloudSaveTimestampRef.current = saveStartTimestamp;
      
      
      syncDebugUtils.log('save', {
        timestamp: saveStartTimestamp,
        places: plan.places.length,
        labels: plan.labels.length,
        totalCost: plan.totalCost,
        type: 'batch_sync'
      });
      
      await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
      
      // クラウド保存完了後にタイムスタンプを更新
      const saveEndTimestamp = Date.now();
      cloudSaveTimestampRef.current = saveEndTimestamp;
      setIsSynced(true);
      
      
      onSave?.(saveEndTimestamp);
    } catch (err: any) {
      console.warn('バッチクラウド同期失敗:', err);
      
      // FirebaseエラーをSyncManagerに通知
      const errorMessage = err?.message || err?.toString() || '';
      const isQuotaError = errorMessage.includes('quota') || 
                          errorMessage.includes('limit') ||
                          errorMessage.includes('too many requests');
      
      if (isQuotaError) {
      }
      
      setIsSynced(false);
    } finally {
      setIsSaving(false);
      lastWriteCompletedRef.current = Date.now(); // 書き込み完了時刻を記録
      isWritingToCloudRef.current = false; // 書き込み終了フラグをリセット
    }
  }, [user, onSave]);

  // beforeunload / pagehide でフラッシュ保存
  useEffect(() => {
    const handleUnload = () => {
      if (!plan) return;
      try {
        savePlanHybrid(plan, { mode: 'local' });
      } catch (_) {
        /* ignore */
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    
    // リモート更新中は自動保存を一時停止
    if (isRemoteUpdateInProgress) {
      return;
    }
    
    // 書き込みが最近完了した場合はスキップ（自己更新ループ防止）
    const now = Date.now();
    if (lastWriteCompletedRef.current > 0 && (now - lastWriteCompletedRef.current) < 500) {
      return;
    }
    
    // プランのハッシュを計算して実際に変更があるか確認
    const currentHash = calculatePlanHash(plan);
    if (currentHash === lastPlanHashRef.current) {
      return; // 変更がない場合はスキップ
    }
    lastPlanHashRef.current = currentHash;
    
    // 変更回数をカウント
    changeCountRef.current++;
    
    // 即座にローカル保存を実行
    saveImmediately(plan);
    

  }, [plan, isRemoteUpdateInProgress, saveImmediately, calculatePlanHash]);

  return {
    isSaving,
    isSynced,
    isRemoteUpdateInProgress,
    setIsRemoteUpdateInProgress,
    lastSavedTimestamp: lastSavedTimestampRef.current,
    lastCloudSaveTimestamp: cloudSaveTimestampRef.current, // 独立管理されたクラウド保存タイムスタンプを返す
    saveImmediately, // 外部から即座保存を呼び出せるように公開
    saveImmediatelyCloud, // 外部から即座クラウド同期を呼び出せるように公開
    saveWithSyncManager, // 新しい同期システム経由の保存
    syncManager: syncManagerRef.current, // 同期マネージャーへのアクセス
    getSelfUpdateFlag, // 自己更新フラグを取得するコールバック
  };
} 