import { create } from 'zustand';
import { TravelPlan } from '../types';
import { listenPlan } from '../services/planCloudService';
import { Unsubscribe, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface PlanState {
  plan: TravelPlan | null;
  activePlanId: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribe: Unsubscribe | null;
  setPlan: (plan: TravelPlan | null) => void;
  updatePlan: (update: Partial<TravelPlan>) => void;
  listenToPlan: (planId: string) => void;
  unsubscribeFromPlan: () => void;
  updateLastActionPosition: (position: google.maps.LatLngLiteral, actionType: 'place' | 'label') => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  activePlanId: null,
  isLoading: true,
  error: null,
  unsubscribe: null,

  setPlan: (plan) => set({ plan, isLoading: false, error: null }),

  updatePlan: (update) =>
    set((state) => {
      if (state.plan) {
        const updatedPlan = { ...state.plan, ...update, updatedAt: new Date() };
        // Note: The actual save to the cloud should be handled by a separate mechanism,
        // like a useAutoSave hook, to prevent Zustand from having side effects.
        return { plan: updatedPlan };
      }
      return {};
    }),

  listenToPlan: (planId) => {
    const { unsubscribe, activePlanId } = get();
    if (unsubscribe && activePlanId === planId) {
      // Already listening to this plan
      return;
    }

    // If listening to another plan, unsubscribe first
    if (unsubscribe) {
      unsubscribe();
    }

    set({ isLoading: true, activePlanId: planId });

    const newUnsubscribe = listenPlan(planId, (plan) => {
      if (plan) {
        set({ plan, isLoading: false, error: null });
      } else {
        set({ plan: null, isLoading: false, error: `Plan with ID ${planId} not found or permission denied.` });
      }
    });

    set({ unsubscribe: newUnsubscribe });
  },

  unsubscribeFromPlan: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({ plan: null, activePlanId: null, unsubscribe: null });
  },

  updateLastActionPosition: async (position: google.maps.LatLngLiteral, actionType: 'place' | 'label') => {
    const { plan } = get();
    const user = auth.currentUser;
    
    if (!plan || !user) {
      console.error('[planStore] Cannot update last action position: plan or user is null', {
        hasPlan: !!plan,
        hasUser: !!user,
        planId: plan?.id
      });
      return;
    }
    
    try {
      console.log('[planStore] Updating last action position:', { 
        position, 
        actionType, 
        planId: plan.id,
        userId: user.uid,
        timestamp: new Date().toISOString()
      });
      
      const planRef = doc(db, 'plans', plan.id);
      const updateData = {
        lastActionPosition: {
          position,
          timestamp: serverTimestamp(),
          userId: user.uid,
          actionType
        }
      };
      
      console.log('[planStore] Update data to be sent:', updateData);
      
      await updateDoc(planRef, updateData);
      
      console.log('[planStore] Last action position updated successfully in Firestore');
      
      // ローカルのplanオブジェクトも更新（即座に反映させるため）
      set((state) => ({
        plan: state.plan ? {
          ...state.plan,
          lastActionPosition: {
            position,
            timestamp: new Date(),
            userId: user.uid,
            actionType
          }
        } : null
      }));
      
    } catch (error) {
      console.error('[planStore] Error updating last action position:', error);
      throw error;
    }
  },
})); 