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
  onError?: (error: Error) => void,
  useSort: boolean = true
): Unsubscribe {
  
  const plansRef = collection(db, 'plans');
  // 注意: このクエリにはFirestoreの複合インデックスが必要です
  // memberIds (array-contains) + updatedAt (desc)
  const q = useSort
    ? query(
        plansRef,
        where('memberIds', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      )
    : query(
        plansRef,
        where('memberIds', 'array-contains', user.uid)
      );

  return onSnapshot(
    q,
    (snapshot) => {
      
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
      
      // ソートなしの場合は手動でソート
      if (!useSort) {
        plans.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }
      
      onUpdate(plans);
    },
    (error) => {
      console.error('[planListService] Error listening to plans:', error);
      
      // Firestoreインデックスエラーの場合は詳細なメッセージを表示
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error('[planListService] Firestore index required. Please create the composite index for:', {
          collection: 'plans',
          fields: ['memberIds', 'updatedAt DESC']
        });
        console.error('[planListService] You can create the index by visiting the URL in the error message or Firebase Console');
      }
      
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
  
  const planRef = doc(db, 'plans', planId);
  await updateDoc(planRef, {
    name: newName,
    updatedAt: serverTimestamp(),
  });
  
}

/**
 * プランを削除
 */
export async function deletePlanFromCloud(planId: string): Promise<void> {
  
  const planRef = doc(db, 'plans', planId);
  await deleteDoc(planRef);
  
}

/**
 * 新規プランを作成
 */
export async function createNewPlan(
  user: User,
  name: string,
  initialPayload: string
): Promise<string> {
  
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