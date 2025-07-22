import { create } from 'zustand';
import { TravelPlan } from '../types';
import { listenPlan } from '../services/planCloudService';
import { Unsubscribe } from 'firebase/firestore';

interface PlanState {
  plan: TravelPlan | null;
  activePlanId: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribe: Unsubscribe | null;
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  activePlanId: null,
  isLoading: true,
  error: null,
  unsubscribe: null,

  setPlan: (plan) => set({ plan, isLoading: false, error: null }),

  updatePlan: (update) =>
    set((state) => {
      if (state.plan) {
        const updatedPlan = { ...state.plan, ...update, updatedAt: new Date() };
        // Note: The actual save to the cloud should be handled by a separate mechanism,
        // like a useAutoSave hook, to prevent Zustand from having side effects.
        return { plan: updatedPlan };
      }
      return {};
    }),

  listenToPlan: (planId) => {
    const { unsubscribe, activePlanId } = get();
    if (unsubscribe && activePlanId === planId) {
      // Already listening to this plan
      return;
    }

    // If listening to another plan, unsubscribe first
    if (unsubscribe) {
      unsubscribe();
    }

    set({ isLoading: true, activePlanId: planId });

    const newUnsubscribe = listenPlan(planId, (plan) => {
      if (plan) {
        set({ plan, isLoading: false, error: null });
      } else {
        set({ plan: null, isLoading: false, error: `Plan with ID ${planId} not found or permission denied.` });
      }
    });

    set({ unsubscribe: newUnsubscribe });
  },

  unsubscribeFromPlan: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({ plan: null, activePlanId: null, unsubscribe: null });
  },
})); 