import { create } from 'zustand';
import { TravelPlan } from '../types';

interface PlanState {
  // 新しい責任範囲：プランメタデータのみ
  plan: TravelPlan | null;
  isLoading: boolean;
  error: string | null;
  
  // 基本操作
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPlan: () => void;
  
  // 互換性のための非推奨メソッド（段階的に削除予定）
  onPlanUpdated?: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
  updateLastActionPosition: (position: google.maps.LatLngLiteral, actionType: 'place' | 'label') => Promise<void>;
  setActivePlanId: (planId: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  isLoading: false,
  error: null,
  
  // 基本操作
  setPlan: (plan) => set({ plan, error: null }),
  updatePlan: (update) => set((state) => {
    if (state.plan) {
      const updatedPlan = { ...state.plan, ...update, updatedAt: new Date() };
      
      // 既存のコールバック互換性のため
      if (state.onPlanUpdated) {
        state.onPlanUpdated(updatedPlan);
      }
      
      return { plan: updatedPlan };
    }
    return state;
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearPlan: () => set({ plan: null, error: null, isLoading: false }),
  
  // 互換性のための非推奨メソッド
  onPlanUpdated: undefined,
  setOnPlanUpdated: (callback) => set({ onPlanUpdated: callback }),
  listenToPlan: () => {
    console.warn('[planStore] listenToPlan is deprecated. Use UnifiedPlanService or PlanLifecycleManager instead.');
  },
  unsubscribeFromPlan: () => {
    console.warn('[planStore] unsubscribeFromPlan is deprecated. Use UnifiedPlanService or PlanLifecycleManager instead.');
  },
  updateLastActionPosition: async () => {
    console.warn('[planStore] updateLastActionPosition is deprecated. Use UnifiedPlanService instead.');
  },
  setActivePlanId: async () => {
    console.warn('[planStore] setActivePlanId is deprecated. Use UnifiedPlanService instead.');
  }
})); 