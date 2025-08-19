import { useState, useRef, useCallback, useEffect } from "react";
import { TravelPlan } from "../types";
import {
  AutoSaveService,
  SaveStrategy,
} from "../services/save/AutoSaveService";
import { AutoSaveOptions, AutoSaveState } from "../types/AutoSave";

export function useAutoSaveNew(
  plan: TravelPlan | null,
  userId: string | null,
  options: AutoSaveOptions = {},
) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const autoSaveService = useRef(new AutoSaveService(options));

  const save = useCallback(
    async (strategy?: SaveStrategy) => {
      if (!plan) return;

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await autoSaveService.current.save(plan, userId, strategy);
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
    [plan?.id, userId],
  );

  const saveImmediate = useCallback(() => save("immediate"), [save]);

  useEffect(() => {
    if (plan && options.autoSave !== false) {
      save("debounced");
    }
  }, [plan?.id, options.autoSave]);

  useEffect(() => {
    return () => {
      autoSaveService.current.cleanup();
    };
  }, []);

  return {
    ...state,
    save,
    saveImmediate,
  };
}
