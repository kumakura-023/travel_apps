import { useEffect } from 'react';
import { loadPlanFromUrl } from '../utils/shareUtils';
import { usePlanStore } from '../store/planStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanListStore } from '../store/planListStore';
import { getActivePlan, setActivePlan, loadActivePlanHybrid, loadPlan } from '../services/storageService';
import { TravelPlan } from '../types';

export function usePlanLoad(user: any, isInitializing: boolean) {
  useEffect(() => {
    if (isInitializing) return;
    (async () => {
      const planFromUrl = loadPlanFromUrl();
      if (planFromUrl) {
        useSavedPlacesStore.setState({ places: planFromUrl.places });
        useLabelsStore.setState({ labels: planFromUrl.labels });
        usePlanStore.getState().setPlan(planFromUrl);
        return;
      }

      const current = usePlanStore.getState().plan;
      if (current) return;

      let loaded: TravelPlan | null = null;
      if (navigator.onLine && user) {
        loaded = await loadActivePlanHybrid({ mode: 'cloud', uid: user.uid });
      }
      if (!loaded) {
        loaded = getActivePlan();  // createEmptyPlan()を削除
      }

      // プランリストを取得して確認
      const { plans } = usePlanListStore.getState();

      if (loaded && plans.some(p => p.id === loaded.id)) {
        // ロードしたプランが存在する場合
        console.log('[usePlanLoad] Starting to listen to loaded plan:', loaded.id);
        usePlanStore.getState().listenToPlan(loaded.id);
        useSavedPlacesStore.setState({ places: loaded.places || [] });
        useLabelsStore.setState({ labels: loaded.labels || [] });
      } else if (plans.length > 0) {
        // ロードしたプランが存在しないが、他のプランがある場合
        const firstPlan = plans[0];
        console.log('[usePlanLoad] Loaded plan not found, using first available plan:', firstPlan.id);
        
        // Firestoreとローカルストレージの両方を更新
        await usePlanStore.getState().setActivePlanId(firstPlan.id);
        setActivePlan(firstPlan.id);
        
        // リアルタイム監視を開始
        usePlanStore.getState().listenToPlan(firstPlan.id);
        
        // 初期データを設定（ローカルストレージから読み込み）
        const localPlan = loadPlan(firstPlan.id);
        if (localPlan) {
          useSavedPlacesStore.setState({ places: localPlan.places || [] });
          useLabelsStore.setState({ labels: localPlan.labels || [] });
        }
      } else {
        // プランが一つもない場合
        console.log('[usePlanLoad] No plans available');
        usePlanStore.getState().setPlan(null);
        useSavedPlacesStore.setState({ places: [] });
        useLabelsStore.setState({ labels: [] });
        
        // アクティブプランIDをクリア
        await usePlanStore.getState().setActivePlanId('');
        setActivePlan('');
      }
    })();
  }, [user, isInitializing]);
}
