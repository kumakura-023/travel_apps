import { IPlanRepository } from './interfaces/IPlanRepository';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

export class FirestorePlanRepository implements IPlanRepository {
  private readonly plansCollection = collection(db, 'plans');

  async savePlan(plan: TravelPlan): Promise<void> {
    const planRef = doc(this.plansCollection, plan.id);
    const payload = serializePlan(plan);
    
    // membersからmemberIds配列を生成（プランリスト取得のため）
    const memberIds = Object.keys(plan.members || {});
    
    await setDoc(planRef, {
      payload,
      name: plan.name,
      ownerId: plan.ownerId,
      members: plan.members || {},
      memberIds: memberIds, // プランリスト取得用の配列
      updatedAt: new Date(),
      lastActionPosition: plan.lastActionPosition || null
    });
  }

  async loadPlan(planId: string): Promise<TravelPlan | null> {
    const planRef = doc(this.plansCollection, planId);
    const snapshot = await getDoc(planRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    const plan = deserializePlan(data.payload as string);
    
    plan.ownerId = data.ownerId;
    plan.members = data.members;
    if (data.name) plan.name = data.name;
    if (data.lastActionPosition) plan.lastActionPosition = data.lastActionPosition;
    
    return plan;
  }

  async deletePlan(planId: string): Promise<void> {
    const planRef = doc(this.plansCollection, planId);
    await deleteDoc(planRef);
  }

  async getAllPlans(): Promise<TravelPlan[]> {
    throw new Error('getAllPlans requires user context - use PlanService instead');
  }

  listenToPlan(planId: string, callback: (plan: TravelPlan | null) => void): () => void {
    const planRef = doc(this.plansCollection, planId);
    
    return onSnapshot(planRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      
      const data = snapshot.data();
      const plan = deserializePlan(data.payload as string);
      
      plan.ownerId = data.ownerId;
      plan.members = data.members;
      if (data.name) plan.name = data.name;
      if (data.lastActionPosition) plan.lastActionPosition = data.lastActionPosition;
      
      callback(plan);
    });
  }

  async updatePlan(planId: string, update: Partial<TravelPlan>): Promise<void> {
    try {
      const planRef = doc(this.plansCollection, planId);
      
      // updateデータを準備
      const updateData: any = {
        ...update,
        updatedAt: serverTimestamp()
      };
      
      // membersが更新される場合、memberIds配列も同期
      if (update.members) {
        updateData.memberIds = Object.keys(update.members);
      }
      
      await updateDoc(planRef, updateData);
      console.log('[FirestorePlanRepository] Plan updated:', planId);
    } catch (error) {
      console.error('[FirestorePlanRepository] Failed to update plan:', error);
      throw error;
    }
  }
}