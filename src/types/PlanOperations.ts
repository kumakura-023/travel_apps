import { TravelPlan } from './index';
import { ConflictResolutionStrategy } from './ConflictResolution';

export interface PlanOperationResult {
  success: boolean;
  plan?: TravelPlan;
  error?: Error;
  message: string;
}

export interface PlanServiceConfig {
  autoSyncEnabled: boolean;
  conflictResolutionStrategy: ConflictResolutionStrategy;
  offlineMode: boolean;
}

export interface PlanUpdateOptions {
  skipOptimisticUpdate?: boolean;
  forceSync?: boolean;
  notifyUsers?: boolean;
}