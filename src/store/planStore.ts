import { create } from 'zustand';
import { TravelPlan } from '../types';

interface PlanState {
  plan: TravelPlan | null;
  setPlan: (plan: TravelPlan) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  onPlanUpdated: (plan: TravelPlan) => void;
  setOnPlanUpdated: (callback: (plan: TravelPlan) => void) => void;
}

let onPlanUpdatedCallback: (plan: TravelPlan) => void = () => {};

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  updatePlan: (update) =>
    set((state) => {
      if (state.plan) {
        const updatedPlan = { ...state.plan, ...update, updatedAt: new Date() };
        onPlanUpdatedCallback(updatedPlan);
        return { plan: updatedPlan };
      }
      return {};
    }),
  onPlanUpdated: (plan) => {
    onPlanUpdatedCallback(plan);
  },
  setOnPlanUpdated: (callback) => {
    onPlanUpdatedCallback = callback;
  },
})); 