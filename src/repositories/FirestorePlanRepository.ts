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
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

export class FirestorePlanRepository implements IPlanRepository {
  private readonly plansCollection = collection(db, 'plans');

  async savePlan(plan: TravelPlan): Promise<void> {
    const planRef = doc(this.plansCollection, plan.id);
    const payload = serializePlan(plan);
    
    await setDoc(planRef, {
      payload,
      name: plan.name,
      ownerId: plan.ownerId,
      members: plan.members || {},
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
}