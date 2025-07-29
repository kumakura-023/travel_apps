import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

// Firestore collection references
const plansCollection = collection(db, 'plans');
const usersCollection = collection(db, 'users');

// Document reference helpers
const planDocRef = (planId: string) => doc(plansCollection, planId);
const userDocRef = (uid: string) => doc(usersCollection, uid);

export async function loadActivePlan(uid: string): Promise<TravelPlan | null> {
  const userSnap = await getDoc(userDocRef(uid));
  if (!userSnap.exists()) return null;

  const { activePlanId } = userSnap.data() as { activePlanId?: string };
  if (!activePlanId) return null;

  const planRef = planDocRef(activePlanId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return null;

  const data = planSnap.data();
  // --- 修正: members[uid]がなくてもownerId===uidなら取得OK、かつmembers[uid]がなければ追加 ---
  let shouldUpdateMembers = false;
  let members = data.members || {};
  if (!members[uid]) {
    if (data.ownerId === uid) {
      // オーナー自身ならmembersに追加
      members = {
        ...members,
        [uid]: { role: 'owner', joinedAt: new Date() },
      };
      shouldUpdateMembers = true;
    } else {
      // オーナーでもメンバーでもなければnull
      console.warn('User is not a member or owner of the active plan');
      return null;
    }
  }
  // 必要ならmembersをFirestoreに反映
  if (shouldUpdateMembers) {
    await setDoc(planRef, { members }, { merge: true });
  }

  const plan = deserializePlan(data.payload as string);
  plan.ownerId = data.ownerId;
  plan.members = members;
  return plan;
}

/**
 * 指定されたプランIDのプランを強制的に読み込む
 * 招待参加後に使用する
 */
export async function loadPlanById(uid: string, planId: string): Promise<TravelPlan | null> {
  const planRef = planDocRef(planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return null;

  const data = planSnap.data();
  if (!data) return null;

  // ユーザーがメンバーまたはオーナーかチェック
  const members = data.members || {};
  if (!members[uid] && data.ownerId !== uid) {
    console.warn('User is not a member or owner of the plan');
    return null;
  }

  const plan = deserializePlan(data.payload as string);
  plan.ownerId = data.ownerId;
  plan.members = members;
  return plan;
}

export async function savePlanCloud(uid: string, plan: TravelPlan) {
  const clientTimestamp = new Date();
  const payload = serializePlan({ ...plan, updatedAt: clientTimestamp });

  const planRef = planDocRef(plan.id);
  const userRef = userDocRef(uid);

  const batch = writeBatch(db);

  // Get current plan doc to check for existing members
  const planSnap = await getDoc(planRef);
  const existingMembers = planSnap.exists() ? planSnap.data().members : {};

  // Extract member IDs for querying
  const allMembers = {
    ...existingMembers,
    [uid]: { role: 'owner', joinedAt: clientTimestamp }, // Ensure current user is a member
  };
  const memberIds = Object.keys(allMembers);

  // Upsert the plan document
  batch.set(planRef, {
    payload,
    name: plan.name, // プラン名も保存
    ownerId: plan.ownerId || uid, // Set owner if not already set
    members: allMembers,
    memberIds, // クエリ用のメンバーIDリスト
    updatedAt: clientTimestamp,
    lastSavedAt: clientTimestamp.toISOString(),
  }, { merge: true });

  // Update the user's active plan
  batch.set(userRef, {
    activePlanId: plan.id,
    updatedAt: clientTimestamp,
  }, { merge: true });

  await batch.commit();
}

export function listenPlan(
  planId: string,
  cb: (plan: TravelPlan | null) => void
) {
  const docRef = planDocRef(planId);
  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data();
    const plan = deserializePlan(data.payload as string);
    // Add metadata to the plan object
    plan.ownerId = data.ownerId;
    plan.members = data.members;
    // Firestoreのnameフィールドがあれば優先的に使用
    if (data.name) {
      plan.name = data.name;
    }
    // lastActionPositionも追加
    if (data.lastActionPosition) {
      plan.lastActionPosition = data.lastActionPosition;
    }
    cb(plan);
  });
}

// Function to invite a user (to be called from a Cloud Function for security)
export async function addUserToPlan(planId: string, newUserId: string, role: 'editor' | 'viewer' = 'editor') {
    const planRef = planDocRef(planId);
    await setDoc(planRef, {
        members: {
            [newUserId]: { role, joinedAt: new Date() }
        }
    }, { merge: true });
} 