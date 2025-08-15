import { TravelPlan } from './index';

export type PlanLifecycleState = 
  | 'uninitialized'
  | 'initializing'
  | 'loading'
  | 'active'
  | 'switching'
  | 'error'
  | 'cleanup';

export interface PlanLifecycleContext {
  state: PlanLifecycleState;
  currentPlan: TravelPlan | null;
  error: Error | null;
  lastTransition: Date;
  userId: string;
}

export interface LifecycleTransition {
  from: PlanLifecycleState;
  to: PlanLifecycleState;
  timestamp: Date;
  reason: string;
  data?: any;
}