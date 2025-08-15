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
  resolutionStrategy?: 'accept-local' | 'accept-remote' | 'merge';
}

export interface ResolutionLog {
  reason: 'self-change' | 'no-conflicts' | 'conflicts-resolved';
  conflicts?: number;
  strategy?: string;
  timestamp: number;
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'merge-non-conflicting' | 'user-choice';
export type OperationType = 'add' | 'update' | 'delete';