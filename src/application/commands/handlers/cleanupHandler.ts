import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanSnapshot,
} from "../types/PlanCommandTypes";
import { createPlanEvent } from "../../events/types/PlanEventTypes";

export interface CleanupPayload {
  readonly userId?: string;
}

export type CleanupCommand = PlanCommand<CleanupPayload> & {
  type: "plan/cleanup";
};

/**
 * plan/cleanup handler
 *
 * Cleans up plan state and listeners.
 * - Stops any active listeners
 * - Clears stores to empty state
 * - Emits PlanSessionEnded event (optional)
 */
export async function cleanupHandler(
  command: CleanupCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
): Promise<PlanCommandResult> {
  const userId = command.payload?.userId ?? context.userId;
  const lastPlanId = context.snapshot?.plan?.id ?? null;

  try {
    // Note: Listener cleanup is handled by PlanCoordinatorBridge via utilities
    // The handler just returns the empty state

    const emptySnapshot: PlanSnapshot = {
      plan: null,
      places: [],
      labels: [],
      isLoading: false,
      error: null,
    };

    const events = userId
      ? [
          createPlanEvent("plan/sessionEnded", {
            userId,
            lastPlanId,
          }),
        ]
      : [];

    return {
      status: "accepted",
      nextState: emptySnapshot,
      events,
    };
  } catch (error) {
    console.error("[cleanupHandler] Failed to cleanup:", error);

    return {
      status: "rejected",
      reason: "cleanup_error",
      metadata: { error },
    };
  }
}
