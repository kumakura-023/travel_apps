import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanSnapshot,
} from "../types/PlanCommandTypes";
import { createPlanEvent } from "../../events/types/PlanEventTypes";

export interface SwitchPayload {
  readonly userId: string;
  readonly planId: string;
}

export type SwitchCommand = PlanCommand<SwitchPayload> & {
  type: "plan/switch";
};

/**
 * plan/switch handler
 *
 * Switches to a different plan.
 * - Updates active plan ID in storage
 * - Loads new plan data
 * - Emits PlanSwitched event
 */
export async function switchHandler(
  command: SwitchCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
): Promise<PlanCommandResult> {
  const { userId, planId } = command.payload!;
  const { planService, activePlanService } = deps.services;

  // Capture previous plan ID from context snapshot
  const previousPlanId = context.snapshot?.plan?.id ?? null;

  try {
    // Update active plan ID
    await activePlanService.setActivePlanId(userId, planId);

    // Load the new plan
    const plan = await planService.loadPlan(planId);

    if (!plan) {
      return {
        status: "rejected",
        reason: "plan_not_found",
        events: [
          createPlanEvent("plan/syncFailed", {
            action: "switch",
            reason: "plan_not_found",
            planId,
          }),
        ],
      };
    }

    const snapshot: PlanSnapshot = {
      plan,
      places: plan.places || [],
      labels: plan.labels || [],
      isLoading: false,
      error: null,
    };

    return {
      status: "accepted",
      nextState: snapshot,
      events: [
        createPlanEvent("plan/switched", {
          previousPlanId,
          newPlanId: planId,
          plan,
        }),
      ],
    };
  } catch (error) {
    console.error("[switchHandler] Failed to switch plan:", error);

    return {
      status: "rejected",
      reason: "switch_error",
      events: [
        createPlanEvent("plan/syncFailed", {
          action: "switch",
          reason: error instanceof Error ? error.message : "unknown_error",
          planId,
          error,
        }),
      ],
      metadata: { error },
    };
  }
}
