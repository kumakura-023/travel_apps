import { useState, useRef, useCallback } from "react";
import { TravelPlan } from "../types";
import { PlanOperationResult } from "../types/PlanOperations";
import { UnifiedPlanService } from "../services/plan/UnifiedPlanService";
import { FirestorePlanRepository } from "../repositories/FirestorePlanRepository";

export function useUnifiedPlan(userId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const planServiceRef = useRef<UnifiedPlanService>(
    new UnifiedPlanService(new FirestorePlanRepository()),
  );

  const executeOperation = useCallback(
    async (operation: () => Promise<PlanOperationResult>): Promise<boolean> => {
      if (!userId) {
        setMessage("ログインが必要です");
        return false;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const result = await operation();
        setMessage(result.message);

        if (!result.success && result.error) {
          console.error("Plan operation failed:", result.error);
        }

        return result.success;
      } catch (error) {
        console.error("Unexpected error:", error);
        setMessage("予期しないエラーが発生しました");
        return false;
      } finally {
        setIsLoading(false);

        // メッセージを3秒後にクリア
        setTimeout(() => setMessage(null), 3000);
      }
    },
    [userId],
  );

  const createPlan = useCallback(
    (name: string) => {
      return executeOperation(() =>
        planServiceRef.current.createPlan(userId!, name),
      );
    },
    [userId, executeOperation],
  );

  const switchPlan = useCallback(
    (planId: string) => {
      return executeOperation(() =>
        planServiceRef.current.switchPlan(planId, userId!),
      );
    },
    [userId, executeOperation],
  );

  const duplicatePlan = useCallback(
    (planId: string) => {
      return executeOperation(() =>
        planServiceRef.current.duplicatePlan(userId!, planId),
      );
    },
    [userId, executeOperation],
  );

  const deletePlan = useCallback(
    (planId: string) => {
      return executeOperation(() =>
        planServiceRef.current.deletePlan(userId!, planId),
      );
    },
    [userId, executeOperation],
  );

  const updatePlanName = useCallback(
    (planId: string, newName: string) => {
      return executeOperation(() =>
        planServiceRef.current.updatePlanName(userId!, planId, newName),
      );
    },
    [userId, executeOperation],
  );

  const validateDataConsistency = useCallback(() => {
    return planServiceRef.current.validateDataConsistency();
  }, []);

  return {
    isLoading,
    message,
    createPlan,
    switchPlan,
    duplicatePlan,
    deletePlan,
    updatePlanName,
    validateDataConsistency,
  };
}
