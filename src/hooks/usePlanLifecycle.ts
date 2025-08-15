import { useState, useRef, useCallback, useEffect } from 'react';
import { PlanLifecycleContext } from '../types/PlanLifecycle';
import { PlanLifecycleManager } from '../services/lifecycle/PlanLifecycleManager';
import { PlanLoader } from '../services/lifecycle/PlanLoader';
import { PlanWatcher } from '../services/lifecycle/PlanWatcher';
import { StateManager } from '../services/lifecycle/StateManager';

export function usePlanLifecycle(user: any) {
  const [lifecycleContext, setLifecycleContext] = useState<PlanLifecycleContext>({
    state: 'uninitialized',
    currentPlan: null,
    error: null,
    lastTransition: new Date(),
    userId: ''
  });
  
  const lifecycleManagerRef = useRef<PlanLifecycleManager>();
  
  // 初期化
  useEffect(() => {
    if (!user) {
      // ユーザーがログアウトした場合
      if (lifecycleManagerRef.current) {
        lifecycleManagerRef.current.cleanup();
        lifecycleManagerRef.current = undefined;
      }
      setLifecycleContext({
        state: 'uninitialized',
        currentPlan: null,
        error: null,
        lastTransition: new Date(),
        userId: ''
      });
      return;
    }
    
    const initializeLifecycle = async () => {
      try {
        if (!lifecycleManagerRef.current) {
          const planLoader = new PlanLoader();
          const planWatcher = new PlanWatcher();
          const stateManager = new StateManager(setLifecycleContext);
          
          lifecycleManagerRef.current = new PlanLifecycleManager(
            planLoader,
            planWatcher,
            stateManager
          );
        }
        
        await lifecycleManagerRef.current.initialize(user.uid);
        
      } catch (error) {
        console.error('Plan lifecycle initialization failed:', error);
        setLifecycleContext(prev => ({
          ...prev,
          state: 'error',
          error: error as Error
        }));
      }
    };
    
    initializeLifecycle();
    
    // クリーンアップ
    return () => {
      if (lifecycleManagerRef.current) {
        lifecycleManagerRef.current.cleanup();
      }
    };
  }, [user]);
  
  // プラン切り替え
  const switchPlan = useCallback(async (planId: string) => {
    if (!lifecycleManagerRef.current) return false;
    
    try {
      await lifecycleManagerRef.current.switchPlan(planId);
      return true;
    } catch (error) {
      console.error('Plan switch failed:', error);
      setLifecycleContext(prev => ({
        ...prev,
        state: 'error',
        error: error as Error
      }));
      return false;
    }
  }, []);
  
  // デバッグ用
  const getTransitionHistory = useCallback(() => {
    return lifecycleManagerRef.current?.getTransitionHistory() || [];
  }, []);
  
  return {
    ...lifecycleContext,
    switchPlan,
    getTransitionHistory,
    isReady: lifecycleContext.state === 'active',
    isLoading: ['initializing', 'loading', 'switching'].includes(lifecycleContext.state),
    hasError: lifecycleContext.state === 'error'
  };
}