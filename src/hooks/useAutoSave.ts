import { useEffect, useRef, useState } from 'react';
import { TravelPlan } from '../types';
import { savePlanHybrid } from '../services/storageService';
import { useAuthStore } from './useAuth';
import { syncDebugUtils } from '../utils/syncDebugUtils';

/**
 * TravelPlanの変更を監視して3秒後に自動保存するカスタムフック
 * 戻り値として保存状態（saving/idle）を返す
 */
export function useAutoSave(plan: TravelPlan | null, onSave?: (timestamp: number) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isRemoteUpdateInProgress, setIsRemoteUpdateInProgress] = useState(false);
  const lastSavedTimestampRef = useRef<number>(0); // 最後に保存したタイムスタンプ
  const user = useAuthStore((s) => s.user);

  // beforeunload / pagehide でフラッシュ保存（同期処理のみ実行可能）
  useEffect(() => {
    const handleUnload = () => {
      if (!plan) return;
      // タイマーが残っている場合はクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      try {
        // localStorage は同期的に書き込まれるため確実に保存可能
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
    
    // 変更が検知されたらタイマーをリセット
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      (async () => {
        setIsSaving(true);
        try {
          // 保存タイムスタンプを記録
          const saveTimestamp = Date.now();
          lastSavedTimestampRef.current = saveTimestamp;
          
          console.log('💾 自動保存開始:', { timestamp: saveTimestamp });
          
          // デバッグログを記録
          syncDebugUtils.log('save', {
            timestamp: saveTimestamp,
            places: plan.places.length,
            labels: plan.labels.length,
            totalCost: plan.totalCost
          });
          
          // オンラインかつログイン済みなら Cloud + Local の二重保存
          if (navigator.onLine && user) {
            try {
              await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
              setIsSynced(true);
              console.log('💾 クラウド保存成功:', { timestamp: saveTimestamp });
              // 保存完了を通知
              onSave?.(saveTimestamp);
            } catch (err) {
              console.warn('Cloud save failed, falling back to local save', err);
              setIsSynced(false);
            }
            // Cloud 成功/失敗に関わらずローカルにも保存しておく
            await savePlanHybrid(plan, { mode: 'local' });
          } else {
            // オフライン、または未ログイン時はローカル保存のみ
            await savePlanHybrid(plan, { mode: 'local' });
            setIsSynced(false);
            // 保存完了を通知
            onSave?.(saveTimestamp);
          }
        } finally {
          setIsSaving(false);
        }
      })();
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [plan, isRemoteUpdateInProgress]);

  return {
    isSaving,
    isSynced,
    isRemoteUpdateInProgress,
    setIsRemoteUpdateInProgress,
    lastSavedTimestamp: lastSavedTimestampRef.current,
  };
} 