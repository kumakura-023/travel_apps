import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanSnapshot,
} from "../types/PlanCommandTypes";
import { createPlanEvent } from "../../events/types/PlanEventTypes";

export interface InitializePayload {
  readonly userId: string;
}

export type InitializeCommand = PlanCommand<InitializePayload> & {
  type: "plan/initialize";
};

/**
 * plan/initialize handler
 *
 * Determines the active plan for a user and loads it.
 * - Gets active plan ID from ActivePlanService
 * - Falls back to first available plan if active plan is invalid
 * - Loads plan data and emits PlanLoaded event
 */
export async function initializeHandler(
  command: InitializeCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
): Promise<PlanCommandResult> {
  const { userId } = command.payload!;
  const { planService, activePlanService, eventPublisher } = deps.services;

  try {
    // Get active plan ID
    const activePlanId = await activePlanService.getActivePlanId(userId);

    if (!activePlanId) {
      // No active plan - return empty state
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
        events: [],
        metadata: { reason: "no_active_plan" },
      };
    }

    // Load the plan
    const plan = await planService.loadPlan(activePlanId);

    if (!plan) {
      // Plan not found - return empty state
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
          createPlanEvent("plan/syncFailed", {
            action: "initialize",
            reason: "plan_not_found",
            planId: activePlanId,
          }),
        ],
        metadata: { reason: "plan_not_found" },
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
        createPlanEvent("plan/loaded", {
          planId: plan.id,
          plan,
          places: plan.places || [],
          labels: plan.labels || [],
        }),
      ],
    };
  } catch (error) {
    console.error("[initializeHandler] Failed to initialize:", error);

    return {
      status: "rejected",
      reason: "initialization_error",
      events: [
        createPlanEvent("plan/syncFailed", {
          action: "initialize",
          reason: error instanceof Error ? error.message : "unknown_error",
          error,
        }),
      ],
      metadata: { error },
    };
  }
}
