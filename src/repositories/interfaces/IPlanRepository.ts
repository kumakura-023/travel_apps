import { TravelPlan } from '../../types';

export interface IPlanRepository {
  savePlan(plan: TravelPlan): Promise<void>;
  loadPlan(planId: string): Promise<TravelPlan | null>;
  deletePlan(planId: string): Promise<void>;
  
  getAllPlans(): Promise<TravelPlan[]>;
  
  listenToPlan(planId: string, callback: (plan: TravelPlan | null) => void): () => void;
}