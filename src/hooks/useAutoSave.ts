import { useEffect, useRef, useState } from 'react';
import { TravelPlan } from '../types';
import { savePlanHybrid } from '../services/storageService';
import { useAuthStore } from './useAuth';

/**
 * TravelPlanの変更を監視して3秒後に自動保存するカスタムフック
 * 戻り値として保存状態（saving/idle）を返す
 */
export function useAutoSave(plan: TravelPlan | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!plan) return;
    // 変更が検知されたらタイマーをリセット
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      (async () => {
        setIsSaving(true);
        try {
          // オンラインかつログイン済みなら Cloud + Local の二重保存
          if (navigator.onLine && user) {
            try {
              await savePlanHybrid(plan, { mode: 'cloud', uid: user.uid });
              setIsSynced(true);
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
  }, [plan]);

  return {
    isSaving,
    isSynced,
  };
} 