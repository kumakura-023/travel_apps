import { IPlanRepository } from '../../repositories/interfaces/IPlanRepository';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { TravelPlan } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export class PlanService {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly userRepository: IUserRepository,
    private readonly localCacheRepository: IPlanRepository
  ) {}

  async createPlan(userId: string, name: string): Promise<TravelPlan> {
    const now = new Date();
    const newPlan: TravelPlan = {
      id: uuidv4(),
      name,
      description: '',
      places: [],
      labels: [],
      startDate: now,
      endDate: now,
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ownerId: userId,
      members: {
        [userId]: { role: 'owner', joinedAt: now }
      }
    };
    
    await this.planRepository.savePlan(newPlan);
    
    await this.localCacheRepository.savePlan(newPlan);
    
    return newPlan;
  }

  async savePlan(plan: TravelPlan): Promise<void> {
    plan.updatedAt = new Date();
    
    await this.planRepository.savePlan(plan);
    
    await this.localCacheRepository.savePlan(plan);
  }

  async deletePlan(userId: string, planId: string): Promise<string | null> {
    await this.planRepository.deletePlan(planId);
    
    await this.localCacheRepository.deletePlan(planId);
    
    const userPlans = await this.userRepository.getUserPlans(userId);
    const remainingPlans = userPlans.filter(p => p.id !== planId);
    
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

  listenToPlan(planId: string, callback: (plan: TravelPlan | null) => void): () => void {
    return this.planRepository.listenToPlan(planId, async (plan) => {
      if (plan) {
        await this.localCacheRepository.savePlan(plan);
      } else {
        await this.localCacheRepository.deletePlan(planId);
      }
      
      callback(plan);
    });
  }
}