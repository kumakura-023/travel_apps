import { TravelPlan } from '../../types';
import { PlanOperationResult } from '../../types/PlanOperations';
import { usePlanStore } from '../../store/planStore';
import { useSavedPlacesStore } from '../../store/savedPlacesStore';
import { useLabelsStore } from '../../store/labelsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../hooks/useAuth';
import { createEmptyPlan } from '../storageService';
import { IPlanRepository } from '../../repositories/interfaces/IPlanRepository';

export class UnifiedPlanService {
  constructor(
    private planRepository: IPlanRepository
  ) {}

  async createPlan(userId: string, name: string): Promise<PlanOperationResult> {
    try {
      const newPlan = createEmptyPlan(name);
      newPlan.ownerId = userId;

      await this.planRepository.savePlan(newPlan);
      
      this.updateStoresOptimized(newPlan);
      
      return {
        success: true,
        plan: newPlan,
        message: 'プランが作成されました'
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'プランの作成に失敗しました'
      };
    }
  }

  async switchPlan(planId: string, userId: string): Promise<PlanOperationResult> {
    try {
      const plan = await this.planRepository.loadPlan(planId);
      
      if (!plan) {
        throw new Error('プランが見つかりません');
      }

      this.updateStoresOptimized(plan);
      
      return {
        success: true,
        plan,
        message: 'プランを切り替えました'
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'プランの切り替えに失敗しました'
      };
    }
  }

  async deletePlan(userId: string, planId: string): Promise<PlanOperationResult> {
    try {
      await this.planRepository.deletePlan(planId);
      
      this.clearAllStores();
      
      return {
        success: true,
        message: 'プランが削除されました'
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'プランの削除に失敗しました'
      };
    }
  }

  async duplicatePlan(userId: string, planId: string): Promise<PlanOperationResult> {
    try {
      const originalPlan = await this.planRepository.loadPlan(planId);
      
      if (!originalPlan) {
        throw new Error('複製元のプランが見つかりません');
      }

      const duplicatedPlan: TravelPlan = {
        ...originalPlan,
        id: crypto.randomUUID(),
        name: `${originalPlan.name}_コピー`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: userId
      };

      await this.planRepository.savePlan(duplicatedPlan);
      this.updateStoresOptimized(duplicatedPlan);
      
      return {
        success: true,
        plan: duplicatedPlan,
        message: 'プランが複製されました'
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'プランの複製に失敗しました'
      };
    }
  }

  async updatePlanName(userId: string, planId: string, newName: string): Promise<PlanOperationResult> {
    try {
      const currentPlan = usePlanStore.getState().plan;
      if (!currentPlan || currentPlan.id !== planId) {
        throw new Error('プランが見つかりません');
      }

      const updatedPlan = {
        ...currentPlan,
        name: newName,
        updatedAt: new Date()
      };

      await this.planRepository.savePlan(updatedPlan);
      this.updateStoresOptimized(updatedPlan);
      
      return {
        success: true,
        plan: updatedPlan,
        message: 'プラン名が更新されました'
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'プラン名の更新に失敗しました'
      };
    }
  }

  /**
   * PlanCoordinatorの最適化ロジックを継承した効率的なストア更新
   * 実際に変更された場合のみストアを更新し、不要な再レンダリングを防ぐ
   */
  private updateStoresOptimized(plan: TravelPlan): void {
    const currentPlan = usePlanStore.getState().plan;
    const currentPlaces = useSavedPlacesStore.getState().places;
    const currentLabels = useLabelsStore.getState().labels;
    const newPlaces = plan.places || [];
    const newLabels = plan.labels || [];
    const { user } = useAuthStore.getState();

    // 他のユーザーが追加した新しい場所を検出（通知機能）
    if (user && currentPlaces.length > 0) {
      const currentPlaceIds = new Set(currentPlaces.map(p => p.id));
      const newAddedPlaces = newPlaces.filter(p => !currentPlaceIds.has(p.id));

      if (newAddedPlaces.length > 0) {
        console.log('[UnifiedPlanService] 場所の変更を検出:', {
          現在の場所数: currentPlaces.length,
          新しい場所数: newPlaces.length,
          追加された場所数: newAddedPlaces.length
        });
      }

      // 他のユーザーが追加した場所の通知を作成
      newAddedPlaces.forEach(place => {
        if (place.addedBy?.uid && place.addedBy.uid !== user.uid) {
          console.log('[UnifiedPlanService] 他のユーザーが追加した場所を検出:', {
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

          console.log('[UnifiedPlanService] 他のユーザーの場所追加通知を作成しました');
        }
      });
    }

    // プランが実際に変更された場合のみ更新（深い比較で無限ループを防ぐ）
    if (!currentPlan || currentPlan.id !== plan.id || JSON.stringify(currentPlan) !== JSON.stringify(plan)) {
      usePlanStore.setState({ 
        plan, 
        isLoading: false, 
        error: null 
      });
    }

    // 場所が実際に変更された場合のみ更新
    if (JSON.stringify(currentPlaces) !== JSON.stringify(newPlaces)) {
      useSavedPlacesStore.setState({ places: newPlaces });
    }

    // ラベルが実際に変更された場合のみ更新
    if (JSON.stringify(currentLabels) !== JSON.stringify(newLabels)) {
      useLabelsStore.setState({ labels: newLabels });
    }
  }

  private clearAllStores(): void {
    usePlanStore.setState({ 
      plan: null, 
      isLoading: false, 
      error: null 
    });
    useSavedPlacesStore.setState({ places: [] });
    useLabelsStore.setState({ labels: [] });
  }

  /**
   * データの整合性チェック
   */
  validateDataConsistency(): boolean {
    const currentPlan = usePlanStore.getState().plan;
    const places = useSavedPlacesStore.getState().places;
    const labels = useLabelsStore.getState().labels;

    if (!currentPlan) {
      return places.length === 0 && labels.length === 0;
    }

    // プランとストアのデータ数の整合性チェック
    const planPlaces = currentPlan.places || [];
    const planLabels = currentPlan.labels || [];

    if (planPlaces.length !== places.length) {
      console.warn('[UnifiedPlanService] Places count mismatch:', { 
        planPlaces: planPlaces.length, 
        storePlaces: places.length 
      });
      return false;
    }

    if (planLabels.length !== labels.length) {
      console.warn('[UnifiedPlanService] Labels count mismatch:', { 
        planLabels: planLabels.length, 
        storeLabels: labels.length 
      });
      return false;
    }

    // IDの整合性チェック
    const planPlaceIds = new Set(planPlaces.map(p => p.id));
    const storePlaceIds = new Set(places.map(p => p.id));
    const planLabelIds = new Set(planLabels.map(l => l.id));
    const storeLabelIds = new Set(labels.map(l => l.id));

    const placesMatch = planPlaceIds.size === storePlaceIds.size && 
      [...planPlaceIds].every(id => storePlaceIds.has(id));
    const labelsMatch = planLabelIds.size === storeLabelIds.size && 
      [...planLabelIds].every(id => storeLabelIds.has(id));

    if (!placesMatch || !labelsMatch) {
      console.warn('[UnifiedPlanService] ID consistency error:', { 
        placesMatch, 
        labelsMatch,
        planPlaceIds: [...planPlaceIds],
        storePlaceIds: [...storePlaceIds],
        planLabelIds: [...planLabelIds],
        storeLabelIds: [...storeLabelIds]
      });
      return false;
    }

    return true;
  }
}