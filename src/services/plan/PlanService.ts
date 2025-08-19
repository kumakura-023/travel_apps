import { IPlanRepository } from "../../repositories/interfaces/IPlanRepository";
import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { TravelPlan } from "../../types";
import { v4 as uuidv4 } from "uuid";
// import { serverTimestamp } from 'firebase/firestore';
import { usePlanStore } from "../../store/planStore";
import {
  IPlanService,
  PlanData,
  PlanUpdateData,
} from "../../interfaces/IPlanService";

export class PlanService implements IPlanService {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly userRepository: IUserRepository,
    private readonly localCacheRepository: IPlanRepository,
  ) {}

  // IPlanService インターフェースの実装
  async createPlan(data: PlanData): Promise<TravelPlan> {
    const userId = await this.getCurrentUserId();
    const now = new Date();
    const newPlan: TravelPlan = {
      id: uuidv4(),
      name: data.name,
      description: data.description || "",
      places: [],
      labels: [],
      startDate: data.startDate || now,
      endDate: data.endDate || now,
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ownerId: userId,
      members: {
        [userId]: { role: "owner", joinedAt: now },
      },
    };

    await this.planRepository.savePlan(newPlan);
    await this.localCacheRepository.savePlan(newPlan);

    return newPlan;
  }

  // 既存のメソッドをラップ
  async createPlanLegacy(userId: string, name: string): Promise<TravelPlan> {
    return this.createPlan({ name });
  }

  async savePlan(plan: TravelPlan): Promise<void> {
    plan.updatedAt = new Date();

    await this.planRepository.savePlan(plan);

    await this.localCacheRepository.savePlan(plan);
  }

  async deletePlan(id: string): Promise<void> {
    await this.planRepository.deletePlan(id);
    await this.localCacheRepository.deletePlan(id);
  }

  async deletePlanLegacy(
    userId: string,
    planId: string,
  ): Promise<string | null> {
    await this.planRepository.deletePlan(planId);

    await this.localCacheRepository.deletePlan(planId);

    const userPlans = await this.userRepository.getUserPlans(userId);
    const remainingPlans = userPlans.filter((p) => p.id !== planId);

    if (remainingPlans.length > 0) {
      return remainingPlans[0].id;
    }

    return null;
  }

  async loadPlan(planId: string): Promise<TravelPlan | null> {
    const cachedPlan = await this.localCacheRepository.loadPlan(planId);
    if (cachedPlan) {
      return cachedPlan;
    }

    const plan = await this.planRepository.loadPlan(planId);

    if (plan) {
      await this.localCacheRepository.savePlan(plan);
    }

    return plan;
  }

  listenToPlan(
    planId: string,
    callback: (plan: TravelPlan | null) => void,
  ): () => void {
    return this.planRepository.listenToPlan(planId, async (plan) => {
      if (plan) {
        await this.localCacheRepository.savePlan(plan);
      } else {
        await this.localCacheRepository.deletePlan(planId);
      }

      callback(plan);
    });
  }

  async updateLastActionPosition(
    planId: string,
    position: google.maps.LatLngLiteral,
    userId: string,
    actionType: "place" | "label",
  ): Promise<void> {
    const lastActionPosition = {
      position: {
        lat: position.lat,
        lng: position.lng,
      },
      timestamp: new Date(),
      userId,
      actionType,
    };

    console.log("[PlanService] Updating last action position:", {
      planId,
      position,
      userId,
      actionType,
    });

    try {
      await this.planRepository.updatePlan(planId, {
        lastActionPosition,
      });

      // ローカルキャッシュも更新
      const cachedPlan = await this.localCacheRepository.loadPlan(planId);
      if (cachedPlan) {
        cachedPlan.lastActionPosition = {
          ...lastActionPosition,
          timestamp: new Date(), // ローカルではDateオブジェクトを使用
        };
        await this.localCacheRepository.savePlan(cachedPlan);
      }

      // planStoreの状態も更新（リアルタイム反映のため）
      const { setPlan, plan: currentPlan } = usePlanStore.getState();
      if (currentPlan && currentPlan.id === planId) {
        setPlan({
          ...currentPlan,
          lastActionPosition: {
            position: {
              lat: position.lat,
              lng: position.lng,
            },
            timestamp: new Date(),
            userId,
            actionType,
          },
        });
      }

      console.log("[PlanService] Last action position updated successfully");
    } catch (error) {
      console.error(
        "[PlanService] Failed to update last action position:",
        error,
      );
      throw error;
    }
  }

  // IPlanService インターフェースの追加メソッド
  async updatePlan(id: string, data: PlanUpdateData): Promise<TravelPlan> {
    const plan = await this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan not found: ${id}`);
    }

    const updatedPlan: TravelPlan = {
      ...plan,
      ...data,
      updatedAt: new Date(),
    };

    await this.savePlan(updatedPlan);
    return updatedPlan;
  }

  async getPlan(id: string): Promise<TravelPlan | null> {
    try {
      const plan = await this.planRepository.loadPlan(id);
      return plan;
    } catch (error) {
      const cachedPlan = await this.localCacheRepository.loadPlan(id);
      return cachedPlan;
    }
  }

  async getAllPlans(): Promise<TravelPlan[]> {
    const userId = await this.getCurrentUserId();
    return this.getUserPlans(userId);
  }

  async getUserPlans(userId: string): Promise<TravelPlan[]> {
    try {
      // TODO: planRepositoryにloadUserPlansメソッドを追加する必要がある
      return [];
    } catch (error) {
      return [];
    }
  }

  async setActivePlan(id: string): Promise<void> {
    const plan = await this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan not found: ${id}`);
    }

    // 現在のアクティブプランを非アクティブに
    const userId = await this.getCurrentUserId();
    const userPlans = await this.getUserPlans(userId);
    for (const p of userPlans) {
      if (p.isActive && p.id !== id) {
        p.isActive = false;
        await this.savePlan(p);
      }
    }

    // 指定されたプランをアクティブに
    plan.isActive = true;
    await this.savePlan(plan);
  }

  async duplicatePlan(id: string, newName: string): Promise<TravelPlan> {
    const plan = await this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan not found: ${id}`);
    }

    const duplicatedPlan: TravelPlan = {
      ...plan,
      id: uuidv4(),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
    };

    await this.planRepository.savePlan(duplicatedPlan);
    await this.localCacheRepository.savePlan(duplicatedPlan);

    return duplicatedPlan;
  }

  async exportPlan(id: string): Promise<string> {
    const plan = await this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan not found: ${id}`);
    }
    return JSON.stringify(plan, null, 2);
  }

  async importPlan(data: string): Promise<TravelPlan> {
    const parsedPlan = JSON.parse(data) as TravelPlan;
    const importedPlan: TravelPlan = {
      ...parsedPlan,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
    };

    await this.planRepository.savePlan(importedPlan);
    await this.localCacheRepository.savePlan(importedPlan);

    return importedPlan;
  }

  private async getCurrentUserId(): Promise<string> {
    const { auth } = await import("../../firebase");
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    return currentUser.uid;
  }
}
