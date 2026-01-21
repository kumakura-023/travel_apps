import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanSnapshot,
} from "../types/PlanCommandTypes";
import { createPlanEvent } from "../../events/types/PlanEventTypes";

export interface CreatePayload {
  readonly userId: string;
  readonly name: string;
}

export type CreateCommand = PlanCommand<CreatePayload> & {
  type: "plan/create";
};

/**
 * plan/create handler
 *
 * Creates a new plan and switches to it.
 * - Creates plan via PlanService
 * - Sets new plan as active
 * - Emits PlanCreated and PlanSwitched events
 */
export async function createHandler(
  command: CreateCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
): Promise<PlanCommandResult> {
  const { userId, name } = command.payload!;
  const { planService, activePlanService } = deps.services;

  // Capture previous plan ID from context snapshot
  const previousPlanId = context.snapshot?.plan?.id ?? null;

  try {
    // Create the new plan
    const newPlan = await planService.createPlanLegacy(userId, name);

    // Set as active plan
    await activePlanService.setActivePlanId(userId, newPlan.id);

    const snapshot: PlanSnapshot = {
      plan: newPlan,
      places: [],
      labels: [],
      isLoading: false,
      error: null,
    };

    return {
      status: "accepted",
      nextState: snapshot,
      events: [
        createPlanEvent("plan/created", {
          planId: newPlan.id,
          plan: newPlan,
          createdBy: userId,
        }),
        createPlanEvent("plan/switched", {
          previousPlanId,
          newPlanId: newPlan.id,
          plan: newPlan,
        }),
      ],
    };
  } catch (error) {
    console.error("[createHandler] Failed to create plan:", error);

    return {
      status: "rejected",
      reason: "create_error",
      events: [
        createPlanEvent("plan/syncFailed", {
          action: "create",
          reason: error instanceof Error ? error.message : "unknown_error",
          error,
        }),
      ],
      metadata: { error },
    };
  }
}
