import { create } from 'zustand';
import { TravelPlan } from '../types';

interface PlanState {
  plan: TravelPlan | null;
  setPlan: (plan: TravelPlan) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  updatePlan: (update) =>
    set((state) =>
      state.plan ? { plan: { ...state.plan, ...update, updatedAt: new Date() } } : {}
    ),
})); 