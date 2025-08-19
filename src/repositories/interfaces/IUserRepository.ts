export interface IUserRepository {
  getActivePlanId(userId: string): Promise<string | null>;
  setActivePlanId(userId: string, planId: string): Promise<void>;
  getUserPlans(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]>;
}
