import { useEffect, useRef, useState } from 'react';
import { TravelPlan } from '../types';
import { savePlan } from '../services/storageService';

/**
 * TravelPlanの変更を監視して3秒後に自動保存するカスタムフック
 * 戻り値として保存状態（saving/idle）を返す
 */
export function useAutoSave(plan: TravelPlan | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!plan) return;
    // 変更が検知されたらタイマーをリセット
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsSaving(true);
      savePlan(plan);
      setIsSaving(false);
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [plan]);

  return {
    isSaving,
  };
} 