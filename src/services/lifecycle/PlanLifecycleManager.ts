import { TravelPlan } from '../../types';
import { PlanLifecycleState, PlanLifecycleContext, LifecycleTransition } from '../../types/PlanLifecycle';
import { PlanLoader } from './PlanLoader';
import { PlanWatcher } from './PlanWatcher';
import { StateManager } from './StateManager';
import { usePlanListStore } from '../../store/planListStore';
import { setActivePlan } from '../storageService';

export class PlanLifecycleManager {
  private state: PlanLifecycleState = 'uninitialized';
  private context: PlanLifecycleContext;
  private transitions: LifecycleTransition[] = [];
  private cleanupFunctions: (() => void)[] = [];
  
  constructor(
    private planLoader: PlanLoader,
    private planWatcher: PlanWatcher,
    private stateManager: StateManager
  ) {
    this.context = {
      state: 'uninitialized',
      currentPlan: null,
      error: null,
      lastTransition: new Date(),
      userId: ''
    };
  }
  
  async initialize(userId: string): Promise<void> {
    this.transition('uninitialized', 'initializing', 'User login detected');
    
    try {
      this.context.userId = userId;
      
      // プランリストを先に初期化
      console.log('[PlanLifecycleManager] Refreshing plan list...');
      await usePlanListStore.getState().refreshPlans();
      
      // 少し待機して確実にストアが更新されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await this.loadInitialPlan(userId);
      
    } catch (error) {
      this.transition('initializing', 'error', 'Initialization failed', error);
      this.stateManager.setErrorState(error as Error);
      throw error;
    }
  }
  
  private async loadInitialPlan(userId: string): Promise<void> {
    this.transition('initializing', 'loading', 'Starting plan load');
    this.stateManager.setLoadingState();
    
    try {
      // URL からのプラン読み込みを優先
      const urlPlan = await this.planLoader.loadFromUrl();
      if (urlPlan) {
        await this.activatePlan(urlPlan);
        return;
      }
      
      // アクティブプランの読み込み
      const activePlan = await this.planLoader.loadActivePlan(userId);
      const { plans } = usePlanListStore.getState();
      
      if (activePlan && plans.some(p => p.id === activePlan.id)) {
        await this.activatePlan(activePlan);
        return;
      }
      
      // プランリストから最初のプランを選択
      const firstPlan = await this.planLoader.loadFirstAvailablePlan(userId);
      if (firstPlan) {
        // アクティブプランIDを更新
        setActivePlan(firstPlan.id);
        await this.activatePlan(firstPlan);
        return;
      }
      
      // プランがない場合は空の状態でアクティブ化
      this.transition('loading', 'active', 'No plans available - empty state');
      this.stateManager.setEmptyState();
      
    } catch (error) {
      this.transition('loading', 'error', 'Plan loading failed', error);
      this.stateManager.setErrorState(error as Error);
      throw error;
    }
  }
  
  private async activatePlan(plan: TravelPlan): Promise<void> {
    try {
      // ストアの状態を更新
      this.stateManager.setPlan(plan);
      
      // リアルタイム監視を開始
      const unsubscribe = this.planWatcher.watch(plan.id, (updatedPlan) => {
        this.handlePlanUpdate(updatedPlan);
      });
      this.cleanupFunctions.push(unsubscribe);
      
      // アクティブ状態に移行
      this.transition('loading', 'active', 'Plan activated', { planId: plan.id });
      this.context.currentPlan = plan;
      
    } catch (error) {
      this.transition('loading', 'error', 'Plan activation failed', error);
      this.stateManager.setErrorState(error as Error);
      throw error;
    }
  }
  
  async switchPlan(newPlanId: string): Promise<void> {
    if (this.state !== 'active') {
      throw new Error(`Cannot switch plan from state: ${this.state}`);
    }
    
    this.transition('active', 'switching', 'Plan switch requested', { newPlanId });
    this.stateManager.setLoadingState();
    
    try {
      // 現在の監視を停止
      this.stopWatching();
      
      // プラン切り替え時にオーバーレイを一時的にクリア
      this.stateManager.setEmptyState();
      
      // 新しいプランを読み込み
      const newPlan = await this.planLoader.loadPlan(newPlanId, this.context.userId);
      if (!newPlan) {
        throw new Error('Plan not found');
      }
      
      // アクティブプランIDを更新
      setActivePlan(newPlanId);
      
      // 新しいプランをアクティブ化
      await this.activatePlan(newPlan);
      
    } catch (error) {
      this.transition('switching', 'error', 'Plan switch failed', error);
      this.stateManager.setErrorState(error as Error);
      throw error;
    }
  }
  
  private handlePlanUpdate(updatedPlan: TravelPlan | null): void {
    if (!updatedPlan) {
      // プランが削除された場合
      this.transition('active', 'cleanup', 'Plan deleted remotely');
      this.cleanup();
      return;
    }
    
    // プランを更新
    this.stateManager.updatePlan(updatedPlan);
    this.context.currentPlan = updatedPlan;
  }
  
  cleanup(): void {
    this.transition(this.state, 'cleanup', 'Cleanup requested');
    
    this.stopWatching();
    
    // 状態をリセット
    this.state = 'uninitialized';
    this.context = {
      state: 'uninitialized',
      currentPlan: null,
      error: null,
      lastTransition: new Date(),
      userId: ''
    };
  }
  
  private stopWatching(): void {
    // すべてのクリーンアップ関数を実行
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions = [];
  }
  
  private transition(
    from: PlanLifecycleState, 
    to: PlanLifecycleState, 
    reason: string, 
    data?: any
  ): void {
    const transition: LifecycleTransition = {
      from,
      to,
      timestamp: new Date(),
      reason,
      data
    };
    
    this.transitions.push(transition);
    this.state = to;
    this.context.state = to;
    this.context.lastTransition = transition.timestamp;
    
    // デバッグログ
    if (import.meta.env.DEV) {
      console.log(`[PlanLifecycle] ${from} → ${to}: ${reason}`, data);
    }
    
    // 状態変更を通知
    this.stateManager.notifyStateChange(this.context);
  }
  
  // デバッグ用
  getTransitionHistory(): LifecycleTransition[] {
    return [...this.transitions];
  }
  
  getCurrentContext(): PlanLifecycleContext {
    return { ...this.context };
  }
}