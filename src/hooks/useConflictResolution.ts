import { useState, useRef, useCallback, useEffect } from 'react';
import { TravelPlan } from '../types';
import { ConflictResolutionResult, ConflictResolutionStrategy } from '../types/ConflictResolution';
import { ConflictCoordinator } from '../services/conflict/ConflictCoordinator';
import { ConflictDetector } from '../services/conflict/ConflictDetector';
import { ConflictResolver } from '../services/conflict/ConflictResolver';
import { SessionManager } from '../services/conflict/SessionManager';

export function useConflictResolution(userId: string | null) {
  const [isInitialized, setIsInitialized] = useState(false);
  const coordinatorRef = useRef<ConflictCoordinator>();
  
  useEffect(() => {
    if (!userId) {
      setIsInitialized(false);
      coordinatorRef.current = undefined;
      return;
    }
    
    const sessionManager = new SessionManager(userId);
    const detector = new ConflictDetector();
    const resolver = new ConflictResolver('merge-non-conflicting');
    
    coordinatorRef.current = new ConflictCoordinator(detector, resolver, sessionManager);
    setIsInitialized(true);
    
    console.log('[useConflictResolution] Conflict resolution system initialized for user:', userId);
  }, [userId]);

  const handleRemoteChange = useCallback((local: TravelPlan, remote: TravelPlan): ConflictResolutionResult | null => {
    if (!coordinatorRef.current || !isInitialized) {
      console.warn('[useConflictResolution] Coordinator not initialized');
      return null;
    }

    try {
      // 通常のTravelPlanをVersionedPlanに変換
      const versionedLocal = coordinatorRef.current.convertToVersionedPlan(local);
      const versionedRemote = coordinatorRef.current.convertToVersionedPlan(remote);
      
      // 競合解決を実行
      const result = coordinatorRef.current.handleRemoteChange(versionedLocal, versionedRemote);
      
      // 結果をTravelPlan形式に戻す
      const resolvedTravelPlan = coordinatorRef.current.convertToTravelPlan(result.resolved);
      
      return {
        ...result,
        resolved: resolvedTravelPlan as any // VersionedPlanからTravelPlanに変換
      };
    } catch (error) {
      console.error('[useConflictResolution] Error handling remote change:', error);
      return null;
    }
  }, [isInitialized]);

  const setStrategy = useCallback((strategy: ConflictResolutionStrategy) => {
    if (coordinatorRef.current) {
      coordinatorRef.current.setResolutionStrategy(strategy);
      console.log(`[useConflictResolution] Strategy changed to: ${strategy}`);
    }
  }, []);

  const getSessionInfo = useCallback(() => {
    return coordinatorRef.current?.getSessionInfo() || null;
  }, []);

  const refreshSession = useCallback(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.refreshSession();
      console.log('[useConflictResolution] Session refreshed');
    }
  }, []);

  return {
    isInitialized,
    handleRemoteChange,
    setStrategy,
    getSessionInfo,
    refreshSession
  };
}