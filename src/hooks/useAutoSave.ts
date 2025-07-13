import { useEffect, useRef, useState, useCallback } from 'react';
import { TravelPlan } from '../types';
import { savePlanHybrid } from '../services/storageService';
import { useAuthStore } from './useAuth';
import { syncDebugUtils } from '../utils/syncDebugUtils';

/**
 * TravelPlanの変更を監視するカスタムフック
 * 即座保存 + バッチ同期方式を採用
 */
export function useAutoSave(plan: TravelPlan | null, onSave?: (timestamp: number) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isRemoteUpdateInProgress, setIsRemoteUpdateInProgress] = useState(false);
  const lastSavedTimestampRef = useRef<number>(0); // 最後に保存したタイムスタンプ
  const lastPlanHashRef = useRef<string>(''); // 最後に保存したプランのハッシュ
  const changeCountRef = useRef<number>(0); // 変更回数のカウンター
  const lastLocalSaveRef = useRef<number>(0); // 最後のローカル保存時刻
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

  // バッチクラウド同期関数
  const batchCloudSync = useCallback(async (plan: TravelPlan) => {
    if (!navigator.onLine || !user) return;
    
    setIsSaving(true);
    try {
      const saveTimestamp = Date.now();
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
      setIsSynced(true);
      
      if (import.meta.env.DEV) {
        console.log('☁️ バッチクラウド同期成功:', { timestamp: saveTimestamp });
      }
      
      onSave?.(saveTimestamp);
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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
    
    // 変更が検知されたらバッチ同期タイマーをリセット
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // バッチクラウド同期を3秒後に実行
    timerRef.current = setTimeout(() => {
      const currentHash = calculatePlanHash(plan);
      if (currentHash === lastPlanHashRef.current && changeCountRef.current === 0) {
        return;
      }
      
      lastPlanHashRef.current = currentHash;
      changeCountRef.current = 0;
      
      batchCloudSync(plan);
    }, 3000); // 3秒後にバッチ同期

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [plan, isRemoteUpdateInProgress, calculatePlanHash, saveImmediately, batchCloudSync]);

  return {
    isSaving,
    isSynced,
    isRemoteUpdateInProgress,
    setIsRemoteUpdateInProgress,
    lastSavedTimestamp: lastSavedTimestampRef.current,
    saveImmediately, // 外部から即座保存を呼び出せるように公開
  };
} 