import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './useAuth';
import { DIContainer } from '../di/DIContainer';
import { PlanCoordinator } from '../coordinators/PlanCoordinator';

export function usePlanInitializer() {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const coordinatorRef = useRef<PlanCoordinator>();
  
  useEffect(() => {
    if (!user) {
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
        coordinatorRef.current = undefined;
      }
      setIsInitialized(false);
      return;
    }
    
    const initialize = async () => {
      try {
        const container = DIContainer.getInstance();
        const coordinator = container.getPlanCoordinator();
        coordinatorRef.current = coordinator;
        
        await coordinator.initialize(user.uid);
        setIsInitialized(true);
      } catch (error) {
        console.error('[usePlanInitializer] Failed to initialize:', error);
      }
    };
    
    initialize();
    
    return () => {
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
      }
    };
  }, [user]);
  
  return { isInitialized };
}