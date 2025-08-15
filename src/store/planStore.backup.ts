import { create } from 'zustand';
import { TravelPlan } from '../types';

interface PlanState {
  plan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;
  
  // プラン更新リスナー
  onPlanUpdated?: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;
  
  // 互換性のための一時的なメソッド（将来的に削除予定）
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
  updateLastActionPosition: (position: google.maps.LatLngLiteral, actionType: 'place' | 'label') => Promise<void>;
  setActivePlanId: (planId: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  isLoading: true,
  error: null,
  
  // プラン更新リスナー
  onPlanUpdated: undefined,
  setOnPlanUpdated: (callback) => set({ onPlanUpdated: callback }),
  
  // 互換性のための一時的なメソッド実装
  setPlan: (plan) => set({ plan }),
  updatePlan: (update) => set((state) => {
    if (state.plan) {
      const updatedPlan = { ...state.plan, ...update };
      
      // 更新後のコールバックを実行
      if (state.onPlanUpdated) {
        state.onPlanUpdated(updatedPlan);
      }
      
      return { plan: updatedPlan };
    }
    return state;
  }),
  listenToPlan: () => {
    console.warn('[planStore] listenToPlan is deprecated. Use PlanCoordinator instead.');
  },
  unsubscribeFromPlan: () => {
    console.warn('[planStore] unsubscribeFromPlan is deprecated. Use PlanCoordinator instead.');
  },
  updateLastActionPosition: async () => {
    console.warn('[planStore] updateLastActionPosition is deprecated. Use PlanService instead.');
  },
  setActivePlanId: async () => {
    console.warn('[planStore] setActivePlanId is deprecated. Use ActivePlanService instead.');
  }
})); 