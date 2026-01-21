import type { PlanUiAction } from "../../actions/types/PlanUiAction";
import type { PlanEvent } from "../../events/types/PlanEventTypes";
import type { TravelPlan, Place, Label } from "../../../types";
import type { PlanService } from "../../../services/plan/PlanService";
import type { ActivePlanService } from "../../../services/plan/ActivePlanService";
import type { UnifiedPlanService } from "../../../services/plan/UnifiedPlanService";
import type { usePlanStore } from "../../../store/planStore";
import type { useSavedPlacesStore } from "../../../store/savedPlacesStore";
import type { useLabelsStore } from "../../../store/labelsStore";
import type { PlanEventPublisher } from "../../events/types/PlanEventPublisher";

export interface PlanSnapshot {
  readonly plan?: TravelPlan | null;
  readonly places?: Place[];
  readonly labels?: Label[];
  readonly isLoading?: boolean;
  readonly error?: string | null;
}

export interface PlanCommandMetadata extends Record<string, unknown> {
  readonly correlationId?: string;
  readonly tags?: string[];
  readonly [key: string]: unknown;
}

export interface PlanCommandContext {
  readonly action: PlanUiAction;
  readonly userId?: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly snapshot?: PlanSnapshot;
  readonly metadata?: PlanCommandMetadata;
}

export interface PlanCommand<
  TPayload = Record<string, unknown>,
  TMetadata extends PlanCommandMetadata = PlanCommandMetadata,
> {
  readonly type: string;
  readonly payload?: TPayload;
  readonly metadata?: TMetadata;
}

export interface PlanCommandDependencies {
  readonly services: {
    planService: PlanService;
    activePlanService: ActivePlanService;
    unifiedPlanService?: UnifiedPlanService;
    eventPublisher?: PlanEventPublisher;
    readonly [key: string]: unknown;
  };
  readonly stores: {
    planStore?: typeof usePlanStore;
    savedPlacesStore?: typeof useSavedPlacesStore;
    labelsStore?: typeof useLabelsStore;
    readonly [key: string]: unknown;
  };
  readonly utilities?: Record<string, unknown>;
}

export interface PlanCommandResult {
  readonly status: "accepted" | "rejected" | "noop";
  readonly nextState?: PlanSnapshot;
  readonly events?: PlanEvent<unknown>[];
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export type PlanCommandHandler<
  TCommand extends PlanCommand = PlanCommand,
  TResult extends PlanCommandResult = PlanCommandResult,
> = (
  command: TCommand,
  context: PlanCommandContext,
  deps: PlanCommandDependencies,
) => Promise<TResult>;
