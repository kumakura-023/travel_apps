import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

export interface PlanListItem {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  placeCount: number;
  totalCost: number;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * ユーザーが参加しているプラン一覧をリアルタイムで監視
 */
export function listenUserPlans(
  user: User,
  onUpdate: (plans: PlanListItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  console.log('[planListService] Starting to listen for user plans:', user.uid);
  
  const plansRef = collection(db, 'plans');
  const q = query(
    plansRef,
    where('memberIds', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('[planListService] Received plans snapshot:', snapshot.size, 'plans');
      
      const plans: PlanListItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // payloadから基本情報を抽出
        let placeCount = 0;
        let totalCost = 0;
        
        try {
          if (data.payload) {
            const payload = JSON.parse(data.payload);
            placeCount = payload.places?.length || 0;
            totalCost = payload.totalCost || 0;
          }
        } catch (e) {
          console.error('[planListService] Failed to parse payload:', e);
        }
        
        plans.push({
          id: doc.id,
          name: data.name || '名称未設定',
          ownerId: data.ownerId,
          memberCount: Object.keys(data.members || {}).length,
          placeCount,
          totalCost,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      console.log('[planListService] Processed plans:', plans);
      onUpdate(plans);
    },
    (error) => {
      console.error('[planListService] Error listening to plans:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * プラン名を更新
 */
export async function updatePlanName(planId: string, newName: string): Promise<void> {
  console.log('[planListService] Updating plan name:', { planId, newName });
  
  const planRef = doc(db, 'plans', planId);
  await updateDoc(planRef, {
    name: newName,
    updatedAt: serverTimestamp(),
  });
  
  console.log('[planListService] Plan name updated successfully');
}

/**
 * プランを削除
 */
export async function deletePlanFromCloud(planId: string): Promise<void> {
  console.log('[planListService] Deleting plan:', planId);
  
  const planRef = doc(db, 'plans', planId);
  await deleteDoc(planRef);
  
  console.log('[planListService] Plan deleted successfully');
}

/**
 * 新規プランを作成
 */
export async function createNewPlan(
  user: User,
  name: string,
  initialPayload: string
): Promise<string> {
  console.log('[planListService] Creating new plan:', { userId: user.uid, name });
  
  const plansRef = collection(db, 'plans');
  const docRef = await addDoc(plansRef, {
    name,
    ownerId: user.uid,
    memberIds: [user.uid],
    members: {
      [user.uid]: {
        role: 'owner',
        joinedAt: serverTimestamp(),
      },
    },
    payload: initialPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  console.log('[planListService] New plan created:', docRef.id);
  return docRef.id;
}