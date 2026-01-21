/**
 * Contract for coordinating plan lifecycle interactions across services and UI hooks.
 */
export interface IPlanCoordinator {
  initialize(userId: string): Promise<void>;
  switchPlan(userId: string, planId: string): Promise<void>;
  deletePlan(userId: string, planId: string): Promise<void>;
  createNewPlan(userId: string, name: string): Promise<void>;
  cleanup(): void;
}
