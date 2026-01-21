import { TravelPlan, Place, Label } from "../../types";
import { PlanOperationResult } from "../../types/PlanOperations";
import { usePlanStore } from "../../store/planStore";
import { useSavedPlacesStore } from "../../store/savedPlacesStore";
import { useLabelsStore } from "../../store/labelsStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuthStore } from "../../hooks/useAuth";
import { createEmptyPlan } from "../storageService";
import { IPlanRepository } from "../../repositories/interfaces/IPlanRepository";
import { PlanEventService } from "./PlanEventService";
import { storeEventBus } from "../../events/StoreEvents";
import { AppError, toAppError } from "../../errors/AppError";
import { PlanErrorCode, PlaceErrorCode } from "../../errors/ErrorCode";
import { ERROR_MESSAGES } from "../../errors/ErrorMessages";
import { measured } from "../../telemetry/decorators/measured";

export class UnifiedPlanService {
  private eventService: PlanEventService;

  constructor(private planRepository: IPlanRepository) {
    this.eventService = new PlanEventService(storeEventBus);
  }

  @measured({ operation: "plan.create", threshold: 1000 })
  async createPlan(userId: string, name: string): Promise<PlanOperationResult> {
    try {
      const newPlan = createEmptyPlan(name);
      newPlan.ownerId = userId;

      await this.planRepository.savePlan(newPlan);

      // 新しいイベント駆動型の更新
      this.eventService.planLoaded(newPlan);

      // 互換性のため既存の更新も実行
      this.updateStoresOptimized(newPlan);

      return {
        success: true,
        plan: newPlan,
        message: "プランが作成されました",
      };
    } catch (error) {
      const appError = toAppError(
        error,
        PlanErrorCode.PLAN_SAVE_FAILED,
        "error",
        {
          service: "UnifiedPlanService",
          operation: "createPlan",
          entityType: "plan",
          userId,
        },
      );
      console.error(
        "[UnifiedPlanService] createPlan failed:",
        appError.toJSON(),
      );
      return {
        success: false,
        error: appError,
        message:
          ERROR_MESSAGES[PlanErrorCode.PLAN_SAVE_FAILED] ||
          "プランの作成に失敗しました",
      };
    }
  }

  @measured({ operation: "plan.switch", threshold: 2000 })
  async switchPlan(
    planId: string,
    userId: string,
  ): Promise<PlanOperationResult> {
    try {
      const plan = await this.planRepository.loadPlan(planId);

      if (!plan) {
        throw new AppError(
          PlanErrorCode.PLAN_NOT_FOUND,
          ERROR_MESSAGES[PlanErrorCode.PLAN_NOT_FOUND] ||
            "プランが見つかりません",
          "warning",
          {
            service: "UnifiedPlanService",
            operation: "switchPlan",
            entityId: planId,
            entityType: "plan",
          },
        );
      }

      // 新しいイベント駆動型の更新
      this.eventService.planLoaded(plan);

      // 互換性のため既存の更新も実行
      this.updateStoresOptimized(plan);

      return {
        success: true,
        plan,
        message: "プランを切り替えました",
      };
    } catch (error) {
      const appError = toAppError(
        error,
        PlanErrorCode.PLAN_SWITCH_FAILED,
        "error",
        {
          service: "UnifiedPlanService",
          operation: "switchPlan",
          entityId: planId,
          entityType: "plan",
        },
      );
      console.error(
        "[UnifiedPlanService] switchPlan failed:",
        appError.toJSON(),
      );
      return {
        success: false,
        error: appError,
        message:
          ERROR_MESSAGES[PlanErrorCode.PLAN_SWITCH_FAILED] ||
          "プランの切り替えに失敗しました",
      };
    }
  }

  @measured({ operation: "plan.delete", threshold: 1000 })
  async deletePlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult> {
    try {
      await this.planRepository.deletePlan(planId);

      // 新しいイベント駆動型の削除
      this.eventService.planDeleted(planId);

      // 互換性のため既存のクリアも実行
      this.clearAllStores();

      return {
        success: true,
        message: "プランが削除されました",
      };
    } catch (error) {
      const appError = toAppError(
        error,
        PlanErrorCode.PLAN_DELETE_FAILED,
        "error",
        {
          service: "UnifiedPlanService",
          operation: "deletePlan",
          entityId: planId,
          entityType: "plan",
        },
      );
      console.error(
        "[UnifiedPlanService] deletePlan failed:",
        appError.toJSON(),
      );
      return {
        success: false,
        error: appError,
        message:
          ERROR_MESSAGES[PlanErrorCode.PLAN_DELETE_FAILED] ||
          "プランの削除に失敗しました",
      };
    }
  }

  @measured({ operation: "plan.duplicate", threshold: 1500 })
  async duplicatePlan(
    userId: string,
    planId: string,
  ): Promise<PlanOperationResult> {
    try {
      const originalPlan = await this.planRepository.loadPlan(planId);

      if (!originalPlan) {
        throw new AppError(
          PlanErrorCode.PLAN_NOT_FOUND,
          "複製元のプランが見つかりません",
          "warning",
          {
            service: "UnifiedPlanService",
            operation: "duplicatePlan",
            entityId: planId,
            entityType: "plan",
          },
        );
      }

      const duplicatedPlan: TravelPlan = {
        ...originalPlan,
        id: crypto.randomUUID(),
        name: `${originalPlan.name}_コピー`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: userId,
      };

      await this.planRepository.savePlan(duplicatedPlan);

      // 新しいイベント駆動型の更新
      this.eventService.planLoaded(duplicatedPlan);

      // 互換性のため既存の更新も実行
      this.updateStoresOptimized(duplicatedPlan);

      return {
        success: true,
        plan: duplicatedPlan,
        message: "プランが複製されました",
      };
    } catch (error) {
      const appError = toAppError(
        error,
        PlanErrorCode.PLAN_SAVE_FAILED,
        "error",
        {
          service: "UnifiedPlanService",
          operation: "duplicatePlan",
          entityId: planId,
          entityType: "plan",
        },
      );
      console.error(
        "[UnifiedPlanService] duplicatePlan failed:",
        appError.toJSON(),
      );
      return {
        success: false,
        error: appError,
        message: "プランの複製に失敗しました",
      };
    }
  }

  async updatePlanName(
    userId: string,
    planId: string,
    newName: string,
  ): Promise<PlanOperationResult> {
    try {
      const currentPlan = usePlanStore.getState().plan;
      if (!currentPlan || currentPlan.id !== planId) {
        throw new AppError(
          PlanErrorCode.PLAN_NOT_FOUND,
          "プランが見つかりません",
          "warning",
          {
            service: "UnifiedPlanService",
            operation: "updatePlanName",
            entityId: planId,
            entityType: "plan",
          },
        );
      }

      const updatedPlan = {
        ...currentPlan,
        name: newName,
        updatedAt: new Date(),
      };

      await this.planRepository.savePlan(updatedPlan);

      // 新しいイベント駆動型の更新
      this.eventService.planUpdated(planId, {
        name: newName,
        updatedAt: updatedPlan.updatedAt,
      });

      // 互換性のため既存の更新も実行
      this.updateStoresOptimized(updatedPlan);

      return {
        success: true,
        plan: updatedPlan,
        message: "プラン名が更新されました",
      };
    } catch (error) {
      const appError = toAppError(
        error,
        PlanErrorCode.PLAN_SAVE_FAILED,
        "error",
        {
          service: "UnifiedPlanService",
          operation: "updatePlanName",
          entityId: planId,
          entityType: "plan",
        },
      );
      console.error(
        "[UnifiedPlanService] updatePlanName failed:",
        appError.toJSON(),
      );
      return {
        success: false,
        error: appError,
        message: "プラン名の更新に失敗しました",
      };
    }
  }

  async addPlace(planId: string, place: Place): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.placeAdded(planId, place);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedPlan = {
        ...currentPlan,
        places: [...(currentPlan.places || []), place],
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
    }
  }

  async updatePlace(
    planId: string,
    placeId: string,
    changes: Partial<Place>,
  ): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.placeUpdated(planId, placeId, changes);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedPlaces =
        currentPlan.places?.map((p) =>
          p.id === placeId ? { ...p, ...changes, updatedAt: new Date() } : p,
        ) || [];

      const updatedPlan = {
        ...currentPlan,
        places: updatedPlaces,
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
    }
  }

  async deletePlace(planId: string, placeId: string): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.placeDeleted(planId, placeId);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedPlaces =
        currentPlan.places?.filter((p) => p.id !== placeId) || [];

      const updatedPlan = {
        ...currentPlan,
        places: updatedPlaces,
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
    }
  }

  async addLabel(planId: string, label: Label): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.labelAdded(planId, label);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedPlan = {
        ...currentPlan,
        labels: [...(currentPlan.labels || []), label],
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
    }
  }

  async updateLabel(
    planId: string,
    labelId: string,
    changes: Partial<Label>,
  ): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.labelUpdated(planId, labelId, changes);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedLabels =
        currentPlan.labels?.map((l) =>
          l.id === labelId ? { ...l, ...changes, updatedAt: new Date() } : l,
        ) || [];

      const updatedPlan = {
        ...currentPlan,
        labels: updatedLabels,
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
    }
  }

  async deleteLabel(planId: string, labelId: string): Promise<void> {
    // イベントを発行して新しいアーキテクチャを使用
    this.eventService.labelDeleted(planId, labelId);

    // 互換性のため、既存のリポジトリ操作も実行
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && currentPlan.id === planId) {
      const updatedLabels =
        currentPlan.labels?.filter((l) => l.id !== labelId) || [];

      const updatedPlan = {
        ...currentPlan,
        labels: updatedLabels,
        updatedAt: new Date(),
      };
      await this.planRepository.savePlan(updatedPlan);
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
      const currentPlaceIds = new Set(currentPlaces.map((p) => p.id));
      const newAddedPlaces = newPlaces.filter(
        (p) => !currentPlaceIds.has(p.id),
      );

      if (newAddedPlaces.length > 0) {
        console.log("[UnifiedPlanService] 場所の変更を検出:", {
          現在の場所数: currentPlaces.length,
          新しい場所数: newPlaces.length,
          追加された場所数: newAddedPlaces.length,
        });
      }

      // 他のユーザーが追加した場所の通知を作成
      newAddedPlaces.forEach((place) => {
        if (place.addedBy?.uid && place.addedBy.uid !== user.uid) {
          console.log(
            "[UnifiedPlanService] 他のユーザーが追加した場所を検出:",
            {
              placeId: place.id,
              placeName: place.name,
              addedByUid: place.addedBy.uid,
              addedByName: place.addedBy.displayName,
              currentUserId: user.uid,
            },
          );

          const notificationStore = useNotificationStore.getState();
          notificationStore.addNotification({
            placeId: place.id,
            placeName: place.name,
            placeCategory: place.category,
            addedBy: {
              uid: place.addedBy.uid,
              displayName: place.addedBy.displayName || "ユーザー",
            },
            planId: plan.id,
            position: place.coordinates,
          });

          console.log(
            "[UnifiedPlanService] 他のユーザーの場所追加通知を作成しました",
          );
        }
      });
    }

    // プランが実際に変更された場合のみ更新（深い比較で無限ループを防ぐ）
    if (
      !currentPlan ||
      currentPlan.id !== plan.id ||
      JSON.stringify(currentPlan) !== JSON.stringify(plan)
    ) {
      usePlanStore.setState({
        plan,
        isLoading: false,
        error: null,
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
      error: null,
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
      console.warn("[UnifiedPlanService] Places count mismatch:", {
        planPlaces: planPlaces.length,
        storePlaces: places.length,
      });
      return false;
    }

    if (planLabels.length !== labels.length) {
      console.warn("[UnifiedPlanService] Labels count mismatch:", {
        planLabels: planLabels.length,
        storeLabels: labels.length,
      });
      return false;
    }

    // IDの整合性チェック
    const planPlaceIds = new Set(planPlaces.map((p) => p.id));
    const storePlaceIds = new Set(places.map((p) => p.id));
    const planLabelIds = new Set(planLabels.map((l) => l.id));
    const storeLabelIds = new Set(labels.map((l) => l.id));

    const placesMatch =
      planPlaceIds.size === storePlaceIds.size &&
      [...planPlaceIds].every((id) => storePlaceIds.has(id));
    const labelsMatch =
      planLabelIds.size === storeLabelIds.size &&
      [...planLabelIds].every((id) => storeLabelIds.has(id));

    if (!placesMatch || !labelsMatch) {
      console.warn("[UnifiedPlanService] ID consistency error:", {
        placesMatch,
        labelsMatch,
        planPlaceIds: [...planPlaceIds],
        storePlaceIds: [...storePlaceIds],
        planLabelIds: [...planLabelIds],
        storeLabelIds: [...storeLabelIds],
      });
      return false;
    }

    return true;
  }
}
