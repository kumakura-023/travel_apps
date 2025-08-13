import { PlanService } from '../services/plan/PlanService';
import { ActivePlanService } from '../services/plan/ActivePlanService';
import { usePlanStore } from '../store/planStore';
import { useSavedPlacesStore } from '../store/savedPlacesStore';
import { useLabelsStore } from '../store/labelsStore';
import { usePlanListStore } from '../store/planListStore';
import { TravelPlan } from '../types';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../hooks/useAuth';

export class PlanCoordinator {
  private currentPlanUnsubscribe?: () => void;
  
  constructor(
    private readonly planService: PlanService,
    private readonly activePlanService: ActivePlanService
  ) {}

  async initialize(userId: string): Promise<void> {
    console.log('[PlanCoordinator] Starting initialization for user:', userId);
    try {
      // プランリストを先に初期化して完了を待つ
      console.log('[PlanCoordinator] Refreshing plan list...');
      await usePlanListStore.getState().refreshPlans();
      
      // 少し待機して確実にストアが更新されるのを待つ（重要）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activePlanId = await this.activePlanService.getActivePlanId(userId);
      console.log('[PlanCoordinator] Retrieved active plan ID:', activePlanId);
      
      // プランリストを再度取得（重要）
      const { plans } = usePlanListStore.getState();
      console.log('[PlanCoordinator] Available plans:', plans.length);
      
      if (activePlanId && plans.some(p => p.id === activePlanId)) {
        console.log('[PlanCoordinator] Loading and listening to plan:', activePlanId);
        await this.loadAndListenToPlan(activePlanId);
      } else if (plans.length > 0) {
        // アクティブプランがない、または無効な場合は最初のプランを選択
        console.log('[PlanCoordinator] Active plan not found, selecting first plan:', plans[0].id);
        await this.switchPlan(userId, plans[0].id);
      } else {
        console.log('[PlanCoordinator] No plans available, keeping empty state');
        this.setEmptyState();
      }
      
      console.log('[PlanCoordinator] Initialization completed');
    } catch (error) {
      console.error('[PlanCoordinator] Failed to initialize:', error);
      this.setErrorState(error);
    }
  }

  async switchPlan(userId: string, planId: string): Promise<void> {
    try {
      this.stopListening();
      
      await this.activePlanService.setActivePlanId(userId, planId);
      
      await this.loadAndListenToPlan(planId);
    } catch (error) {
      console.error('[PlanCoordinator] Failed to switch plan:', error);
      this.setErrorState(error);
    }
  }

  async deletePlan(userId: string, planId: string): Promise<void> {
    try {
      await this.planService.deletePlanLegacy(userId, planId);
      
      // TODO: 次のプランIDを取得する処理を実装
      const nextPlanId: string | null = null;
      
      if (nextPlanId) {
        await this.switchPlan(userId, nextPlanId);
      } else {
        await this.activePlanService.setActivePlanId(userId, '');
        this.setEmptyState();
      }
    } catch (error) {
      console.error('[PlanCoordinator] Failed to delete plan:', error);
      this.setErrorState(error);
    }
  }

  async createNewPlan(userId: string, name: string): Promise<void> {
    try {
      console.log('[PlanCoordinator] Creating new plan:', name);
      
      // 新しいプランを作成
      const newPlan = await this.planService.createPlanLegacy(userId, name);
      console.log('[PlanCoordinator] New plan created:', newPlan.id);
      
      // プランリストを更新
      await usePlanListStore.getState().refreshPlans();
      
      // 新しいプランに切り替え
      await this.switchPlan(userId, newPlan.id);
      
      console.log('[PlanCoordinator] New plan creation completed');
    } catch (error) {
      console.error('[PlanCoordinator] Failed to create new plan:', error);
      this.setErrorState(error);
      throw error; // 呼び出し元でエラーハンドリングできるように
    }
  }

  cleanup(): void {
    this.stopListening();
  }

  private async loadAndListenToPlan(planId: string): Promise<void> {
    console.log('[PlanCoordinator] loadAndListenToPlan called for:', planId);
    
    usePlanStore.setState({ isLoading: true });
    
    const plan = await this.planService.loadPlan(planId);
    console.log('[PlanCoordinator] Plan loaded:', plan?.id, plan?.name);
    
    if (plan) {
      this.updateStores(plan);
      
      this.currentPlanUnsubscribe = this.planService.listenToPlan(
        planId,
        (updatedPlan) => {
          console.log('[PlanCoordinator] Plan updated via listener:', updatedPlan?.id);
          if (updatedPlan) {
            this.updateStores(updatedPlan);
          } else {
            console.log('[PlanCoordinator] Plan deleted, setting empty state');
            this.setEmptyState();
          }
        }
      );
    } else {
      console.log('[PlanCoordinator] Plan not found, setting empty state');
      this.setEmptyState();
    }
  }

  private updateStores(plan: TravelPlan): void {
    const currentPlaces = useSavedPlacesStore.getState().places;
    const newPlaces = plan.places || [];
    const { user } = useAuthStore.getState();
    
    // 他のユーザーが追加した新しい場所を検出
    if (user && currentPlaces.length > 0) {
      const currentPlaceIds = new Set(currentPlaces.map(p => p.id));
      const newAddedPlaces = newPlaces.filter(p => !currentPlaceIds.has(p.id));
      
      console.log('[PlanCoordinator] 場所の変更を検出:', {
        現在の場所数: currentPlaces.length,
        新しい場所数: newPlaces.length,
        追加された場所数: newAddedPlaces.length
      });
      
      // 他のユーザーが追加した場所の通知を作成
      newAddedPlaces.forEach(place => {
        // 自分が追加した場所でない場合（addedByが存在し、自分と異なる）
        if (place.addedBy?.uid && place.addedBy.uid !== user.uid) {
          console.log('[PlanCoordinator] 他のユーザーが追加した場所を検出:', {
            placeId: place.id,
            placeName: place.name,
            addedByUid: place.addedBy.uid,
            addedByName: place.addedBy.displayName,
            currentUserId: user.uid
          });
          
          const notificationStore = useNotificationStore.getState();
          notificationStore.addNotification({
            placeId: place.id,
            placeName: place.name,
            placeCategory: place.category,
            addedBy: {
              uid: place.addedBy.uid,
              displayName: place.addedBy.displayName || 'ユーザー'
            },
            planId: plan.id,
            position: place.coordinates
          });
          
          console.log('[PlanCoordinator] 他のユーザーの場所追加通知を作成しました');
        }
      });
    }
    
    usePlanStore.setState({ 
      plan, 
      isLoading: false, 
      error: null 
    });
    useSavedPlacesStore.setState({ places: newPlaces });
    useLabelsStore.setState({ labels: plan.labels || [] });
  }

  private setEmptyState(): void {
    usePlanStore.setState({ 
      plan: null, 
      isLoading: false, 
      error: null 
    });
    useSavedPlacesStore.setState({ places: [] });
    useLabelsStore.setState({ labels: [] });
  }

  private setErrorState(error: any): void {
    usePlanStore.setState({ 
      plan: null, 
      isLoading: false, 
      error: error.message || 'Unknown error' 
    });
  }

  private stopListening(): void {
    if (this.currentPlanUnsubscribe) {
      this.currentPlanUnsubscribe();
      this.currentPlanUnsubscribe = undefined;
    }
  }

  // ServiceContainerから移行した機能のためのアクセサ
  getPlanService(): PlanService {
    return this.planService;
  }
}