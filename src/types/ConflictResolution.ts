import { TravelPlan } from './index';

export interface ChangeMetadata {
  timestamp: number;
  userId: string;
  sessionId: string;
  operationType: 'add' | 'update' | 'delete';
  changeId: string;
}

export interface VersionedPlan extends TravelPlan {
  version: number;
  lastChange: ChangeMetadata;
  changeHistory: ChangeMetadata[];
}

export interface ConflictInfo {
  type: 'place' | 'label' | 'metadata';
  itemId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  localChange: ChangeMetadata;
  remoteChange: ChangeMetadata;
  resolutionStrategy?: 'accept-local' | 'accept-remote' | 'merge';
  severity: 'low' | 'medium' | 'high';
}

export interface ResolutionLog {
  reason: 'self-change' | 'no-conflicts' | 'conflicts-resolved' | 'merge-applied';
  conflicts?: number;
  strategy?: ConflictResolutionStrategy;
  timestamp: number;
  details?: string;
  conflictItems?: string[];
}

export interface ConflictResolutionResult {
  resolved: VersionedPlan;
  hadConflicts: boolean;
  resolutionLog: ResolutionLog;
  appliedChanges: ChangeMetadata[];
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'merge-non-conflicting' | 'user-choice';
export type OperationType = 'add' | 'update' | 'delete';