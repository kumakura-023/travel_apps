import { create } from 'zustand';
import { PlanListItem, listenUserPlans } from '../services/planListService';
import { User } from 'firebase/auth';
import { Unsubscribe } from 'firebase/firestore';

interface PlanListState {
  plans: PlanListItem[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: Unsubscribe | null;
  startListening: (user: User) => void;
  stopListening: () => void;
  updatePlans: (plans: PlanListItem[]) => void;
  setError: (error: string | null) => void;
}

export const usePlanListStore = create<PlanListState>((set, get) => ({
  plans: [],
  isLoading: true,
  error: null,
  unsubscribe: null,

  startListening: (user: User) => {
    console.log('[planListStore] Starting to listen for plans');
    
    // 既存のリスナーがあれば停止
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }

    set({ isLoading: true, error: null });

    // Firestoreからプラン一覧をリアルタイムで監視
    const newUnsubscribe = listenUserPlans(
      user,
      (plans) => {
        set({ plans, isLoading: false, error: null });
      },
      (error) => {
        set({ error: error.message, isLoading: false });
      }
    );

    set({ unsubscribe: newUnsubscribe });
  },

  stopListening: () => {
    console.log('[planListStore] Stopping plan list listener');
    
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    
    set({ unsubscribe: null, plans: [], isLoading: false });
  },

  updatePlans: (plans: PlanListItem[]) => {
    set({ plans });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));