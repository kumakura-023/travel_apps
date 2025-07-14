import { useEffect, useRef, useState, useCallback } from 'react';
import { TravelPlan } from '../types';
import { savePlanHybrid } from '../services/storageService';
import { useAuthStore } from './useAuth';
import { syncDebugUtils } from '../utils/syncDebugUtils';

/**
 * TravelPlanの変更を監視するカスタムフック
 * イベントベース同期方式を採用
 */
export function useAutoSave(plan: TravelPlan | null, onSave?: (timestamp: number) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isRemoteUpdateInProgress, setIsRemoteUpdateInProgress] = useState(false);
  const lastSavedTimestampRef = useRef<number>(0); // 最後に保存したタイムスタンプ
  const lastPlanHashRef = useRef<string>(''); // 最後に保存したプランのハッシュ
  const changeCountRef = useRef<number>(0); // 変更回数のカウンター
  const lastLocalSaveRef = useRef<number>(0); // 最後のローカル保存時刻
  const lastCloudSaveRef = useRef<number>(0); // 最後のクラウド保存時刻
  const cloudSaveTimestampRef = useRef<number>(0); // クラウド保存タイムスタンプ（独立管理）
  const user = useAuthStore((s) => s.user);

  // プランのハッシュを計算（変更検知用）- 最適化版
  const calculatePlanHash = useCallback((plan: TravelPlan): string => {
    // 軽量なハッシュ計算（IDとタイムスタンプのみ）
    const placeIds = plan.places.map(p => p.id).sort().join(',');
    const labelIds = plan.labels.map(l => l.id).sort().join(',');
    const placeCount = plan.places.length;
    const labelCount = plan.labels.length;
    const lastUpdate = plan.updatedAt.getTime();
    
    return `${placeCount}:${labelCount}:${lastUpdate}:${placeIds}:${labelIds}`;
  }, []);

  // 即座ローカル保存関数
  const saveImmediately = useCallback(async (plan: TravelPlan) => {
    try {
      await savePlanHybrid(plan, { mode: 'local' });
      lastLocalSaveRef.current = Date.now();
      if (import.meta.env.DEV) {
        console.log('💾 即座ローカル保存完了');
      }
    } catch (error) {
      console.error('即座ローカル保存失敗:', error);
    }
  }, []);

  // 即座クラウド同期関数（イベントベース）
  const saveImmediatelyCloud = useCallback(async (plan: TravelPlan) => {
    if (!navigator.onLine || !user) return;
    
    setIsSaving(true);
    try {
      const saveTimestamp = Date.now();
      lastCloudSaveRef.current = saveTimestamp;
      lastSavedTimestampRef.current = saveTimestamp;
      
      if (import.meta.env.DEV) {
        console.log('☁️ 即座クラウド同期開始:', { 
          timestamp: saveTimestamp,
          places: plan.places.length,
          labels: plan.labels.length,
          planHash: calculatePlanHash(plan)
        });
      }
      
      syncDebugUtils.log('save', {
        timestamp: saveTimestamp,
        places: plan.places.length,
        labels: plan.labels.length,
        totalCost: plan.totalCost,
        type: 'immediate_cloud_sync',
        planHash: calculatePlanHash(plan)
      });
      
      await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
      
      // クラウド保存完了後にタイムスタンプを更新
      const cloudSaveTimestamp = Date.now();
      cloudSaveTimestampRef.current = cloudSaveTimestamp;
      setIsSynced(true);
      
      if (import.meta.env.DEV) {
        console.log('☁️ 即座クラウド同期成功:', { 
          saveTimestamp,
          cloudSaveTimestamp,
          timeDiff: cloudSaveTimestamp - saveTimestamp
        });
      }
      
      onSave?.(cloudSaveTimestamp);
    } catch (err) {
      console.warn('即座クラウド同期失敗:', err);
      setIsSynced(false);
    } finally {
      setIsSaving(false);
    }
  }, [user, onSave, calculatePlanHash]);

  // バッチクラウド同期関数（フォールバック用）
  const batchCloudSync = useCallback(async (plan: TravelPlan) => {
    if (!navigator.onLine || !user) return;
    
    setIsSaving(true);
    try {
      const saveTimestamp = Date.now();
      lastCloudSaveRef.current = saveTimestamp;
      lastSavedTimestampRef.current = saveTimestamp;
      
      if (import.meta.env.DEV) {
        console.log('☁️ バッチクラウド同期開始:', { 
          timestamp: saveTimestamp,
          places: plan.places.length,
          labels: plan.labels.length
        });
      }
      
      syncDebugUtils.log('save', {
        timestamp: saveTimestamp,
        places: plan.places.length,
        labels: plan.labels.length,
        totalCost: plan.totalCost,
        type: 'batch_sync'
      });
      
      await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
      
      // クラウド保存完了後にタイムスタンプを更新
      const cloudSaveTimestamp = Date.now();
      cloudSaveTimestampRef.current = cloudSaveTimestamp;
      setIsSynced(true);
      
      if (import.meta.env.DEV) {
        console.log('☁️ バッチクラウド同期成功:', { 
          saveTimestamp,
          cloudSaveTimestamp,
          timeDiff: cloudSaveTimestamp - saveTimestamp
        });
      }
      
      onSave?.(cloudSaveTimestamp);
    } catch (err) {
      console.warn('バッチクラウド同期失敗:', err);
      setIsSynced(false);
    } finally {
      setIsSaving(false);
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
    
    // 変更回数をカウント
    changeCountRef.current++;
    
    // 即座にローカル保存を実行
    saveImmediately(plan);
    
    // 開発時のみ詳細ログ
    if (import.meta.env.DEV) {
      console.log('🔄 プラン変更検知:', {
        places: plan.places.length,
        labels: plan.labels.length,
        changeCount: changeCountRef.current
      });
    }

  }, [plan, isRemoteUpdateInProgress, saveImmediately]);

  return {
    isSaving,
    isSynced,
    isRemoteUpdateInProgress,
    setIsRemoteUpdateInProgress,
    lastSavedTimestamp: lastSavedTimestampRef.current,
    lastCloudSaveTimestamp: cloudSaveTimestampRef.current, // 独立管理されたクラウド保存タイムスタンプを返す
    saveImmediately, // 外部から即座保存を呼び出せるように公開
    saveImmediatelyCloud, // 外部から即座クラウド同期を呼び出せるように公開
  };
} 