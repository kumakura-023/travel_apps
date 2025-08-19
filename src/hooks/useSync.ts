import { useState, useRef, useCallback, useEffect } from "react";
import { TravelPlan } from "../types";
import {
  SyncCoordinator,
  SyncStrategy,
} from "../services/sync/SyncCoordinator";
import { RealtimeWatcher } from "../services/sync/RealtimeWatcher";
import { ConflictResolver } from "../services/conflict/ConflictResolver";

export interface UseSyncOptions {
  strategy?: SyncStrategy;
  debounceMs?: number;
  localOnly?: boolean;
  enableRealtime?: boolean;
}

export interface SyncState {
  isSaving: boolean;
  isConflicting: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

export function useSync(
  plan: TravelPlan | null,
  userId: string | null,
  options: UseSyncOptions = {},
) {
  const [state, setState] = useState<SyncState>({
    isSaving: false,
    isConflicting: false,
    lastSaved: null,
    error: null,
  });

  const coordinatorRef = useRef(new SyncCoordinator());
  const watcherRef = useRef(new RealtimeWatcher());
  const resolverRef = useRef(new ConflictResolver());

  const sync = useCallback(
    async (strategy?: SyncStrategy) => {
      if (!plan) return;

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await coordinatorRef.current.scheduleSync(plan, userId, {
          strategy: strategy || options.strategy,
          debounceMs: options.debounceMs,
          localOnly: options.localOnly,
        });

        setState((prev) => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error as Error,
        }));
      }
    },
    [plan?.id, userId, options.strategy, options.debounceMs, options.localOnly],
  );

  const forceSync = useCallback(() => sync("immediate"), [sync]);

  useEffect(() => {
    if (!plan || !options.enableRealtime || !userId) return;

    let cleanup: (() => void) | undefined;

    const setupWatcher = async () => {
      cleanup = await watcherRef.current.watch(plan.id, (remotePlan) => {
        setState((prev) => ({ ...prev, isConflicting: false }));
      });
    };

    setupWatcher();

    return () => {
      if (cleanup) cleanup();
    };
  }, [plan?.id, options.enableRealtime, userId]);

  useEffect(() => {
    if (plan && options.strategy !== "manual") {
      sync();
    }
  }, [plan?.id, options.strategy]);

  useEffect(() => {
    return () => {
      coordinatorRef.current.cleanup();
      watcherRef.current.stopAll();
    };
  }, []);

  return {
    ...state,
    sync,
    forceSync,
  };
}
