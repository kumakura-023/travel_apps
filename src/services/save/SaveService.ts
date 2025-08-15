import { TravelPlan } from '../../types';
import { savePlanHybrid } from '../storageService';

export interface SaveConfig {
  localOnly?: boolean;
  userId?: string;
}

export class SaveService {
  async saveLocal(plan: TravelPlan): Promise<void> {
    await savePlanHybrid(plan, { mode: 'local' });
  }

  async saveCloud(plan: TravelPlan, userId: string): Promise<void> {
    await savePlanHybrid(plan, { mode: 'cloud', uid: userId });
  }

  async saveHybrid(plan: TravelPlan, config: SaveConfig): Promise<void> {
    if (config.localOnly) {
      await this.saveLocal(plan);
    } else if (config.userId) {
      await this.saveCloud(plan, config.userId);
    } else {
      throw new Error('saveHybrid requires userId when not localOnly');
    }
  }
}