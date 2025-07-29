import { create } from 'zustand';
import { PlanListItem, listenUserPlans } from '../services/planListService';
import { listenUserPlansNoSort } from '../services/planListServiceNoSort';
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
    let unsubscribeAttempted = false;
    const newUnsubscribe = listenUserPlans(
      user,
      (plans) => {
        set({ plans, isLoading: false, error: null });
      },
      (error) => {
        console.error('[planListStore] Error with sorted query:', error);
        
        // インデックスエラーの場合は、ソートなし版を試す
        if (!unsubscribeAttempted && error.code === 'failed-precondition') {
          console.log('[planListStore] Falling back to no-sort query');
          unsubscribeAttempted = true;
          
          const fallbackUnsubscribe = listenUserPlansNoSort(
            user,
            (plans) => {
              set({ plans, isLoading: false, error: null });
            },
            (fallbackError) => {
              set({ error: fallbackError.message, isLoading: false });
            }
          );
          
          set({ unsubscribe: fallbackUnsubscribe });
          return;
        }
        
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
  
  // 手動でリフレッシュする機能（デバッグ用）
  refreshPlans: () => {
    const { unsubscribe, startListening } = get();
    const user = (window as any).currentUser; // 一時的な実装
    
    if (unsubscribe && user) {
      console.log('[planListStore] Manually refreshing plans');
      unsubscribe();
      startListening(user);
    }
  },
}));