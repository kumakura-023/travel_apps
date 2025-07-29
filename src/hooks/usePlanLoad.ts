import { useEffect } from 'react';
import { loadPlanFromUrl } from '../utils/shareUtils';
import { usePlanStore } from '../store/planStore';
import { usePlacesStore } from '../store/placesStore';
import { useLabelsStore } from '../store/labelsStore';
import { getActivePlan, createEmptyPlan, setActivePlan, loadActivePlanHybrid } from '../services/storageService';
import { TravelPlan } from '../types';

export function usePlanLoad(user: any, isInitializing: boolean) {
  useEffect(() => {
    if (isInitializing) return;
    (async () => {
      const planFromUrl = loadPlanFromUrl();
      if (planFromUrl) {
        usePlacesStore.setState({ places: planFromUrl.places });
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
        loaded = getActivePlan() || createEmptyPlan();
      }

      if (loaded) {
        // 重要: setPlanではなくlistenToPlanを使ってFirestoreのリアルタイム監視を開始
        console.log('[usePlanLoad] Starting to listen to plan:', loaded.id);
        usePlanStore.getState().listenToPlan(loaded.id);
        
        // 初期データも設定（listenToPlanの結果が来るまでの間）
        usePlacesStore.setState({ places: loaded.places });
        useLabelsStore.setState({ labels: loaded.labels });
        setActivePlan(loaded.id);
      }
    })();
  }, [user, isInitializing]);
}
