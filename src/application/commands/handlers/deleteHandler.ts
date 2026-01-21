import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanSnapshot,
} from "../types/PlanCommandTypes";
import { createPlanEvent } from "../../events/types/PlanEventTypes";

export interface DeletePayload {
  readonly userId: string;
  readonly planId: string;
}

export type DeleteCommand = PlanCommand<DeletePayload> & {
  type: "plan/delete";
};

/**
 * plan/delete handler
 *
 * Deletes a plan and switches to the next available plan.
 * - Deletes plan via PlanService
 * - Gets next plan ID from deletion result
 * - Switches to next plan or clears state
 * - Emits PlanDeleted event
 */
export async function deleteHandler(
  command: DeleteCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
): Promise<PlanCommandResult> {
  const { userId, planId } = command.payload!;
  const { planService, activePlanService } = deps.services;

  try {
    // Delete the plan and get next plan ID
    const nextPlanId = await planService.deletePlanLegacy(userId, planId);

    if (nextPlanId) {
      // Load and switch to next plan
      const nextPlan = await planService.loadPlan(nextPlanId);

      if (nextPlan) {
        await activePlanService.setActivePlanId(userId, nextPlanId);

        const snapshot: PlanSnapshot = {
          plan: nextPlan,
          places: nextPlan.places || [],
          labels: nextPlan.labels || [],
          isLoading: false,
          error: null,
        };

        return {
          status: "accepted",
          nextState: snapshot,
          events: [
            createPlanEvent("plan/deleted", {
              planId,
              deletedBy: userId,
              nextPlanId,
            }),
            createPlanEvent("plan/switched", {
              previousPlanId: planId,
              newPlanId: nextPlanId,
              plan: nextPlan,
            }),
          ],
        };
      }
    }

    // No next plan - clear active plan and return empty state
    await activePlanService.setActivePlanId(userId, "");

    const emptySnapshot: PlanSnapshot = {
      plan: null,
      places: [],
      labels: [],
      isLoading: false,
      error: null,
    };

    return {
      status: "accepted",
      nextState: emptySnapshot,
      events: [
        createPlanEvent("plan/deleted", {
          planId,
          deletedBy: userId,
          nextPlanId: null,
        }),
      ],
    };
  } catch (error) {
    console.error("[deleteHandler] Failed to delete plan:", error);

    return {
      status: "rejected",
      reason: "delete_error",
      events: [
        createPlanEvent("plan/syncFailed", {
          action: "delete",
          reason: error instanceof Error ? error.message : "unknown_error",
          planId,
          error,
        }),
      ],
      metadata: { error },
    };
  }
}
