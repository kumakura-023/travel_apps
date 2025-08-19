import { IUserRepository } from "./interfaces/IUserRepository";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export class FirestoreUserRepository implements IUserRepository {
  private readonly usersCollection = "users";

  async getActivePlanId(userId: string): Promise<string | null> {
    const userRef = doc(db, this.usersCollection, userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return data.activePlanId || null;
  }

  async setActivePlanId(userId: string, planId: string): Promise<void> {
    const userRef = doc(db, this.usersCollection, userId);

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await setDoc(userRef, {
        activePlanId: planId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        activePlanId: planId,
        updatedAt: serverTimestamp(),
      });
    }
  }

  async getUserPlans(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]> {
    const userRef = doc(db, this.usersCollection, userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.data();
    return data.plans || [];
  }
}
