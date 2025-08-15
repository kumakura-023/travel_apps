import { useRef, useEffect, useCallback } from 'react';
import { TravelPlan } from '../types';
import { VersionedPlan, ChangeMetadata } from '../types/ConflictResolution';
import { ConflictCoordinator } from '../services/conflict/ConflictCoordinator';
import { ConflictDetector } from '../services/conflict/ConflictDetector';
import { ConflictResolver } from '../services/sync/ConflictResolver';
import { SessionManager } from '../services/conflict/SessionManager';

export function useConflictResolution(userId: string) {
  const coordinatorRef = useRef<ConflictCoordinator>();

  useEffect(() => {
    if (!userId) return;

    const sessionManager = new SessionManager(userId);
    const detector = new ConflictDetector();
    const resolver = new ConflictResolver('merge-non-conflicting');

    coordinatorRef.current = new ConflictCoordinator(detector, resolver, sessionManager);
  }, [userId]);

  const handleRemoteChange = useCallback((local: TravelPlan, remote: TravelPlan) => {
    if (!coordinatorRef.current) {
      return { resolved: remote, hadConflicts: false };
    }

    const versionedLocal = addVersionInfo(local);
    const versionedRemote = addVersionInfo(remote);

    return coordinatorRef.current.handleRemoteChange(versionedLocal, versionedRemote);
  }, []);

  return { handleRemoteChange };
}

function addVersionInfo(plan: TravelPlan): VersionedPlan {
  const metadata: ChangeMetadata = {
    timestamp: plan.updatedAt.getTime(),
    userId: 'unknown',
    sessionId: 'unknown',
    operationType: 'update',
    changeId: `change_${Date.now()}`
  };

  return {
    ...plan,
    version: 1,
    lastChange: metadata,
    changeHistory: [metadata]
  };
}