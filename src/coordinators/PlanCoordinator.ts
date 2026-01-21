import { PlanService } from "../services/plan/PlanService";
import { ActivePlanService } from "../services/plan/ActivePlanService";
import { usePlanStore } from "../store/planStore";
import { useSavedPlacesStore } from "../store/savedPlacesStore";
import { useLabelsStore } from "../store/labelsStore";
import { usePlanListStore } from "../store/planListStore";
import { TravelPlan } from "../types";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../hooks/useAuth";
import { IPlanCoordinator } from "../interfaces/IPlanCoordinator";
import { PlanUiActionMapper } from "../application/actions/PlanUiActionMapper";
import { PlanCommandBus } from "../application/commands/PlanCommandBus";
import { planCommandHandlers } from "../application/commands/handlers";
import { PlanEventPublisherAdapter } from "../application/events/PlanEventPublisher";
import { getEventBus } from "../services/ServiceContainer";
import {
  PlanCoordinatorBridge,
  PlanCoordinatorBridgeDeps,
} from "./PlanCoordinatorBridge";

export class PlanCoordinator implements IPlanCoordinator {
  private currentPlanUnsubscribe?: () => void;
  private isInitialized: boolean = false;
  private currentUserId?: string;
  private readonly bridge: PlanCoordinatorBridge;

  constructor(
    private readonly planService: PlanService,
    private readonly activePlanService: ActivePlanService,
  ) {
    const eventBus = getEventBus();
    const eventPublisher = new PlanEventPublisherAdapter(eventBus);
    const bridgeDeps: PlanCoordinatorBridgeDeps = {
      services: {
        planService: this.planService,
        activePlanService: this.activePlanService,
        eventPublisher,
      },
      stores: {
        planStore: usePlanStore,
        savedPlacesStore: useSavedPlacesStore,
        labelsStore: useLabelsStore,
      },
      utilities: {},
    };

    const mapper = new PlanUiActionMapper();
    const commandBus = new PlanCommandBus(bridgeDeps);

    // Register all plan command handlers
    commandBus.registerHandlers(planCommandHandlers);

    this.bridge = new PlanCoordinatorBridge(mapper, commandBus, bridgeDeps);
  }

  async initialize(userId: string): Promise<void> {
    const result = await this.bridge.dispatch({
      type: "plan/initialize",
      payload: { userId },
      metadata: { source: "PlanCoordinator.initialize" },
    });

    // Command handled successfully - skip legacy flow
    if (result.status === "accepted" && result.nextState?.plan) {
      console.log("[PlanCoordinator] Initialization handled by command bus");
      this.isInitialized = true;
      this.currentUserId = userId;

      // Still need to set up listener for real-time updates (not yet in command handler)
      await this.setupPlanListener(result.nextState.plan.id);
      return;
    }

    // [LEGACY] Fallback initialization flow - to be removed after full migration
    console.log(
      "[PlanCoordinator] [LEGACY] Starting initialization for user:",
      userId,
    );

    // 既に同じユーザーで初期化済みで、現在のプランが存在する場合はスキップ
    if (
      this.isInitialized &&
      this.currentUserId === userId &&
      usePlanStore.getState().plan
    ) {
      console.log(
        "[PlanCoordinator] Already initialized with plan, skipping initialization",
      );
      return;
    }

    try {
      // プランリストを先に初期化して完了を待つ
      console.log("[PlanCoordinator] Refreshing plan list...");
      await usePlanListStore.getState().refreshPlans();

      // 少し待機して確実にストアが更新されるのを待つ（重要）
      await new Promise((resolve) => setTimeout(resolve, 100));

      const activePlanId = await this.activePlanService.getActivePlanId(userId);
      console.log("[PlanCoordinator] Retrieved active plan ID:", activePlanId);

      // プランリストを再度取得（重要）
      const { plans } = usePlanListStore.getState();
      console.log("[PlanCoordinator] Available plans:", plans.length);

      if (activePlanId && plans.some((p) => p.id === activePlanId)) {
        console.log(
          "[PlanCoordinator] Loading and listening to plan:",
          activePlanId,
        );
        await this.loadAndListenToPlan(activePlanId);
      } else if (plans.length > 0) {
        // アクティブプランがない、または無効な場合は最初のプランを選択
        console.log(
          "[PlanCoordinator] Active plan not found, selecting first plan:",
          plans[0].id,
        );
        await this.switchPlan(userId, plans[0].id);
      } else {
        console.log(
          "[PlanCoordinator] No plans available, keeping empty state",
        );
        this.setEmptyState();
      }

      console.log("[PlanCoordinator] Initialization completed");
      this.isInitialized = true;
      this.currentUserId = userId;
    } catch (error) {
      console.error("[PlanCoordinator] Failed to initialize:", error);
      this.setErrorState(error);
    }
  }

  async switchPlan(userId: string, planId: string): Promise<void> {
    // Stop current listener before switching
    this.stopListening();

    const result = await this.bridge.dispatch({
      type: "plan/switch",
      payload: { userId, planId },
      metadata: { source: "PlanCoordinator.switchPlan" },
    });

    // Command handled successfully - skip legacy flow
    if (result.status === "accepted" && result.nextState?.plan) {
      console.log("[PlanCoordinator] Switch handled by command bus");
      this.isInitialized = true;
      this.currentUserId = userId;

      // Set up listener for real-time updates
      await this.setupPlanListener(planId);
      return;
    }

    // [LEGACY] Fallback switch flow - to be removed after full migration
    console.log("[PlanCoordinator] [LEGACY] Switching plan:", planId);
    try {
      await this.activePlanService.setActivePlanId(userId, planId);

      // プラン切り替え時にオーバーレイを一時的にクリア
      useSavedPlacesStore.getState().clearPlaces();
      useLabelsStore.setState({ labels: [] });

      await this.loadAndListenToPlan(planId);

      // プラン切り替え成功時は初期化済みとして記録
      this.isInitialized = true;
      this.currentUserId = userId;
    } catch (error) {
      console.error("[PlanCoordinator] Failed to switch plan:", error);
      this.setErrorState(error);
    }
  }

  async deletePlan(userId: string, planId: string): Promise<void> {
    const result = await this.bridge.dispatch({
      type: "plan/delete",
      payload: { userId, planId },
      metadata: { source: "PlanCoordinator.deletePlan" },
    });

    // Command handled successfully - skip legacy flow
    if (result.status === "accepted") {
      console.log("[PlanCoordinator] Delete handled by command bus");

      // Set up listener for next plan if exists
      if (result.nextState?.plan) {
        await this.setupPlanListener(result.nextState.plan.id);
      }
      return;
    }

    // [LEGACY] Fallback delete flow - to be removed after full migration
    console.log("[PlanCoordinator] [LEGACY] Deleting plan:", planId);
    try {
      await this.planService.deletePlanLegacy(userId, planId);

      // TODO: 次のプランIDを取得する処理を実装
      const nextPlanId: string | null = null;

      if (nextPlanId) {
        await this.switchPlan(userId, nextPlanId);
      } else {
        await this.activePlanService.setActivePlanId(userId, "");
        this.setEmptyState();
      }
    } catch (error) {
      console.error("[PlanCoordinator] Failed to delete plan:", error);
      this.setErrorState(error);
    }
  }

  async createNewPlan(userId: string, name: string): Promise<void> {
    const result = await this.bridge.dispatch({
      type: "plan/create",
      payload: { userId, name },
      metadata: { source: "PlanCoordinator.createNewPlan" },
    });

    // Command handled successfully - skip legacy flow
    if (result.status === "accepted" && result.nextState?.plan) {
      console.log("[PlanCoordinator] Create handled by command bus");

      // Refresh plan list to include the new plan
      await usePlanListStore.getState().refreshPlans();

      // Set up listener for new plan
      await this.setupPlanListener(result.nextState.plan.id);
      return;
    }

    // [LEGACY] Fallback create flow - to be removed after full migration
    console.log("[PlanCoordinator] [LEGACY] Creating new plan:", name);
    try {
      // 新しいプランを作成
      const newPlan = await this.planService.createPlanLegacy(userId, name);
      console.log("[PlanCoordinator] New plan created:", newPlan.id);

      // プランリストを更新
      await usePlanListStore.getState().refreshPlans();

      // 新しいプランに切り替え
      await this.switchPlan(userId, newPlan.id);

      console.log("[PlanCoordinator] New plan creation completed");
    } catch (error) {
      console.error("[PlanCoordinator] Failed to create new plan:", error);
      this.setErrorState(error);
      throw error; // 呼び出し元でエラーハンドリングできるように
    }
  }

  cleanup(): void {
    // Stop listener first
    this.stopListening();

    void this.bridge.dispatch({
      type: "plan/cleanup",
      metadata: { source: "PlanCoordinator.cleanup" },
    });

    this.isInitialized = false;
    this.currentUserId = undefined;
  }

  private async loadAndListenToPlan(planId: string): Promise<void> {
    console.log("[PlanCoordinator] loadAndListenToPlan called for:", planId);

    usePlanStore.setState({ isLoading: true });

    const plan = await this.planService.loadPlan(planId);
    console.log("[PlanCoordinator] Plan loaded:", plan?.id, plan?.name);

    if (plan) {
      this.updateStores(plan);

      this.currentPlanUnsubscribe = this.planService.listenToPlan(
        planId,
        (updatedPlan) => {
          console.log(
            "[PlanCoordinator] Plan updated via listener:",
            updatedPlan?.id,
          );
          if (updatedPlan) {
            this.updateStores(updatedPlan);
          } else {
            console.log("[PlanCoordinator] Plan deleted, setting empty state");
            this.setEmptyState();
          }
        },
      );
    } else {
      console.log("[PlanCoordinator] Plan not found, setting empty state");
      this.setEmptyState();
    }
  }

  private updateStores(plan: TravelPlan): void {
    const currentPlan = usePlanStore.getState().plan;
    const currentPlaces = useSavedPlacesStore.getState().places;
    const currentLabels = useLabelsStore.getState().labels;
    const newPlaces = plan.places || [];
    const newLabels = plan.labels || [];
    const { user } = useAuthStore.getState();

    // 他のユーザーが追加した新しい場所を検出
    if (user && currentPlaces.length > 0) {
      const currentPlaceIds = new Set(currentPlaces.map((p) => p.id));
      const newAddedPlaces = newPlaces.filter(
        (p) => !currentPlaceIds.has(p.id),
      );

      if (newAddedPlaces.length > 0) {
        console.log("[PlanCoordinator] 場所の変更を検出:", {
          現在の場所数: currentPlaces.length,
          新しい場所数: newPlaces.length,
          追加された場所数: newAddedPlaces.length,
        });
      }

      // 他のユーザーが追加した場所の通知を作成
      newAddedPlaces.forEach((place) => {
        // 自分が追加した場所でない場合（addedByが存在し、自分と異なる）
        if (place.addedBy?.uid && place.addedBy.uid !== user.uid) {
          console.log("[PlanCoordinator] 他のユーザーが追加した場所を検出:", {
            placeId: place.id,
            placeName: place.name,
            addedByUid: place.addedBy.uid,
            addedByName: place.addedBy.displayName,
            currentUserId: user.uid,
          });

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
            "[PlanCoordinator] 他のユーザーの場所追加通知を作成しました",
          );
        }
      });
    }

    // プランが実際に変更された場合のみ更新
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

  private setEmptyState(): void {
    usePlanStore.setState({
      plan: null,
      isLoading: false,
      error: null,
    });
    useSavedPlacesStore.setState({ places: [] });
    useLabelsStore.setState({ labels: [] });
  }

  private setErrorState(error: any): void {
    usePlanStore.setState({
      plan: null,
      isLoading: false,
      error: error.message || "Unknown error",
    });
  }

  private stopListening(): void {
    if (this.currentPlanUnsubscribe) {
      this.currentPlanUnsubscribe();
      this.currentPlanUnsubscribe = undefined;
    }
  }

  /**
   * Sets up a real-time listener for plan updates.
   * Used after command handlers have already loaded and applied the plan to stores.
   */
  private async setupPlanListener(planId: string): Promise<void> {
    console.log("[PlanCoordinator] Setting up listener for plan:", planId);

    this.currentPlanUnsubscribe = this.planService.listenToPlan(
      planId,
      (updatedPlan) => {
        console.log(
          "[PlanCoordinator] Plan updated via listener:",
          updatedPlan?.id,
        );
        if (updatedPlan) {
          this.updateStores(updatedPlan);
        } else {
          console.log("[PlanCoordinator] Plan deleted, setting empty state");
          this.setEmptyState();
        }
      },
    );
  }

  // ServiceContainerから移行した機能のためのアクセサ
  getPlanService(): PlanService {
    return this.planService;
  }

  // Phase4で追加: UnifiedPlanServiceのアクセサ
  getUnifiedPlanService() {
    const { getUnifiedPlanService } = require("../services/ServiceContainer");
    return getUnifiedPlanService();
  }
}
