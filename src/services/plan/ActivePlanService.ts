import { IUserRepository } from '../../repositories/interfaces/IUserRepository';

export class ActivePlanService {
  private readonly ACTIVE_PLAN_KEY = 'travel-app-active-plan';
  
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async getActivePlanId(userId: string): Promise<string | null> {
    const firestoreId = await this.userRepository.getActivePlanId(userId);
    
    const localId = localStorage.getItem(this.ACTIVE_PLAN_KEY);
    
    return firestoreId || localId;
  }

  async setActivePlanId(userId: string, planId: string): Promise<void> {
    await this.userRepository.setActivePlanId(userId, planId);
    
    if (planId) {
      localStorage.setItem(this.ACTIVE_PLAN_KEY, planId);
    } else {
      localStorage.removeItem(this.ACTIVE_PLAN_KEY);
    }
  }
}