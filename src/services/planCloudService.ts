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

  const planSnap = await getDoc(planDocRef(activePlanId));
  if (!planSnap.exists()) return null;

  const data = planSnap.data();
  // Check if the user is a member of the plan
  if (!data.members || !data.members[uid]) {
    console.warn('User is not a member of the active plan');
    return null;
  }

  return deserializePlan(data.payload as string);
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

  // Upsert the plan document
  batch.set(planRef, {
    payload,
    ownerId: plan.ownerId || uid, // Set owner if not already set
    members: {
      ...existingMembers,
      [uid]: { role: 'owner', joinedAt: clientTimestamp }, // Ensure current user is a member
    },
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