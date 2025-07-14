import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

// ドキュメントパスを組み立てるヘルパ
function planDocRef(uid: string, planId: string) {
  return doc(db, 'users', uid, 'plans', planId);
}

// 追加: ユーザードキュメント参照ヘルパ
function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

export async function loadActivePlan(uid: string): Promise<TravelPlan | null> {
  // users/{uid} ドキュメントに activePlanId フィールドが格納されている前提
  const activeSnap = await getDoc(userDocRef(uid));
  if (!activeSnap.exists()) return null;
  const { activePlanId } = activeSnap.data() as { activePlanId: string };
  if (!activePlanId) return null;

  const planSnap = await getDoc(planDocRef(uid, activePlanId));
  if (!planSnap.exists()) return null;
  const json = planSnap.data().payload as string;
  return deserializePlan(json);
}

export async function savePlanCloud(uid: string, plan: TravelPlan) {
  const clientTimestamp = new Date();
  const payload = serializePlan({ ...plan, updatedAt: clientTimestamp });

  // users/{uid} ドキュメントを upsert して activePlanId を保存
  await setDoc(userDocRef(uid), {
    activePlanId: plan.id,
    updatedAt: clientTimestamp,
  }, { merge: true });

  // plan ドキュメントを upsert
  await setDoc(planDocRef(uid, plan.id), {
    payload,
    updatedAt: clientTimestamp,
    lastSavedAt: clientTimestamp.toISOString(), // クライアントタイムスタンプ
  });
}

export function listenPlan(
  uid: string,
  planId: string,
  cb: (plan: TravelPlan) => void
) {
  return onSnapshot(planDocRef(uid, planId), (snap: any) => {
    if (!snap.exists()) return;
    const json = (snap.data() as { payload: string }).payload;
    cb(deserializePlan(json));
  });
} 