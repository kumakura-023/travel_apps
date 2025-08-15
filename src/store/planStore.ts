import { create } from 'zustand';
import { TravelPlan } from '../types';
import { storeEventBus } from '../events/StoreEvents';

interface PlanMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanState {
  currentPlan: PlanMetadata | null;
  isLoading: boolean;
  error: string | null;
  
  // 基本操作
  getCurrentPlan: () => PlanMetadata | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPlan: () => void;
  
  // 互換性のための非推奨メソッド（段階的に削除予定）
  plan: TravelPlan | null;
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  onPlanUpdated?: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
  updateLastActionPosition: (position: google.maps.LatLngLiteral, actionType: 'place' | 'label') => Promise<void>;
  setActivePlanId: (planId: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => {
  // イベントリスナーの設定
  const unsubscribePlanLoaded = storeEventBus.on('PLAN_LOADED', (event) => {
    if (event.type === 'PLAN_LOADED') {
      const planMeta: PlanMetadata = {
        id: event.plan.id,
        name: event.plan.name,
        description: event.plan.description,
        createdAt: event.plan.createdAt,
        updatedAt: event.plan.updatedAt
      };
      
      set((state) => ({
        currentPlan: planMeta,
        plan: event.plan, // 互換性のため
        isLoading: false,
        error: null
      }));
    }
  });

  const unsubscribePlanUpdated = storeEventBus.on('PLAN_UPDATED', (event) => {
    if (event.type === 'PLAN_UPDATED') {
      set((state) => {
        if (state.currentPlan && state.currentPlan.id === event.planId) {
          const updatedMeta = { ...state.currentPlan, ...event.changes };
          return {
            currentPlan: updatedMeta,
            plan: state.plan ? { ...state.plan, ...event.changes } : null // 互換性のため
          };
        }
        return state;
      });
    }
  });

  const unsubscribePlanDeleted = storeEventBus.on('PLAN_DELETED', (event) => {
    if (event.type === 'PLAN_DELETED') {
      set((state) => {
        if (state.currentPlan?.id === event.planId) {
          return {
            currentPlan: null,
            plan: null, // 互換性のため
            isLoading: false,
            error: null
          };
        }
        return state;
      });
    }
  });

  return {
    currentPlan: null,
    isLoading: false,
    error: null,
    
    // 新しいAPI
    getCurrentPlan: () => get().currentPlan,
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearPlan: () => set({ currentPlan: null, plan: null, error: null, isLoading: false }),
    
    // 互換性のための非推奨メソッド
    plan: null,
    setPlan: (plan) => {
      console.warn('[planStore] setPlan is deprecated. Use events instead.');
      set({ plan, error: null });
    },
    updatePlan: (update) => {
      console.warn('[planStore] updatePlan is deprecated. Use events instead.');
      set((state) => {
        if (state.plan) {
          const updatedPlan = { ...state.plan, ...update, updatedAt: new Date() };
          
          // 既存のコールバック互換性のため
          if (state.onPlanUpdated) {
            state.onPlanUpdated(updatedPlan);
          }
          
          return { plan: updatedPlan };
        }
        return state;
      });
    },
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
  };
}); 