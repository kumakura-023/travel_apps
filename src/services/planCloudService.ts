import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPlan } from '../types';
import { serializePlan, deserializePlan } from '../utils/planSerializer';

// ドキュメントパスを組み立てるヘルパ
function planDocRef(uid: string, planId: string) {
  return doc(db, 'users', uid, 'plans', planId);
}

export async function loadActivePlan(uid: string): Promise<TravelPlan | null> {
  // activePlan ドキュメントに planId が格納されている前提
  const activeRef = doc(db, 'users', uid, 'activePlan');
  const activeSnap = await getDoc(activeRef);
  if (!activeSnap.exists()) return null;
  const { activePlanId } = activeSnap.data() as { activePlanId: string };
  if (!activePlanId) return null;

  const planSnap = await getDoc(planDocRef(uid, activePlanId));
  if (!planSnap.exists()) return null;
  const json = planSnap.data().payload as string;
  return deserializePlan(json);
}

export async function savePlanCloud(uid: string, plan: TravelPlan) {
  const payload = serializePlan({ ...plan, updatedAt: new Date() });

  // activePlan ドキュメントを更新
  await setDoc(doc(db, 'users', uid, 'activePlan'), {
    activePlanId: plan.id,
    updatedAt: serverTimestamp(),
  });

  // plan ドキュメントを upsert
  await setDoc(planDocRef(uid, plan.id), {
    payload,
    updatedAt: serverTimestamp(),
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