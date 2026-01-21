import { PlanUiActionMapper } from "../application/actions/PlanUiActionMapper";
import { PlanCommandBus } from "../application/commands/PlanCommandBus";
import {
  PlanCommandDependencies,
  PlanCommandResult,
} from "../application/commands/types/PlanCommandTypes";
import { PlanUiAction } from "../application/actions/types/PlanUiAction";
import { PlanEvent } from "../application/events/types/PlanEventTypes";
import { PlanEventPublisher } from "../application/events/types/PlanEventPublisher";
import { usePlanStore } from "../store/planStore";
import { useSavedPlacesStore } from "../store/savedPlacesStore";
import { useLabelsStore } from "../store/labelsStore";

export interface PlanCoordinatorBridgeDeps extends PlanCommandDependencies {
  readonly stores: PlanCommandDependencies["stores"] & {
    planStore?: typeof usePlanStore;
    savedPlacesStore?: typeof useSavedPlacesStore;
    labelsStore?: typeof useLabelsStore;
  };
  readonly services: PlanCommandDependencies["services"] & {
    eventPublisher?: PlanEventPublisher;
  };
}

export class PlanCoordinatorBridge {
  constructor(
    private readonly actionMapper: PlanUiActionMapper,
    private readonly commandBus: PlanCommandBus,
    private readonly deps: PlanCoordinatorBridgeDeps,
  ) {}

  async dispatch(action: PlanUiAction): Promise<PlanCommandResult> {
    const { command, context } = this.actionMapper.mapToCommand(action);

    if (!command) {
      console.warn(
        "[PlanCoordinatorBridge] No command mapped for action",
        action,
      );
      return {
        status: "noop",
        metadata: { reason: "No command mapping" },
      };
    }

    // TODO: gather snapshot + dependencies before execution
    const result = await this.commandBus.execute(command, context);

    if (result.nextState) {
      this.applyNextState(result.nextState);
    }

    if (result.events?.length) {
      await this.publishEvents(result.events);
    }

    return result;
  }

  private applyNextState(snapshot: PlanCommandResult["nextState"]): void {
    if (!snapshot) {
      return;
    }

    const planStore = this.deps.stores.planStore ?? usePlanStore;
    const savedPlacesStore =
      this.deps.stores.savedPlacesStore ?? useSavedPlacesStore;
    const labelsStore = this.deps.stores.labelsStore ?? useLabelsStore;

    // Apply plan state
    if (snapshot.plan !== undefined) {
      planStore.setState({
        plan: snapshot.plan,
        isLoading: snapshot.isLoading ?? false,
        error: snapshot.error ?? null,
      });
    } else if (
      snapshot.isLoading !== undefined ||
      snapshot.error !== undefined
    ) {
      // Partial update for loading/error states
      planStore.setState((state) => ({
        ...state,
        isLoading: snapshot.isLoading ?? state.isLoading,
        error: snapshot.error ?? state.error,
      }));
    }

    // Apply places state
    if (snapshot.places !== undefined) {
      savedPlacesStore.setState({ places: snapshot.places });
    }

    // Apply labels state
    if (snapshot.labels !== undefined) {
      labelsStore.setState({ labels: snapshot.labels });
    }

    console.log("[PlanCoordinatorBridge] Applied snapshot to stores", {
      hasPlan: snapshot.plan !== undefined,
      placesCount: snapshot.places?.length,
      labelsCount: snapshot.labels?.length,
    });
  }

  private async publishEvents(events: PlanEvent<unknown>[]): Promise<void> {
    const publisher = this.deps.services.eventPublisher;
    if (!publisher) {
      console.warn("[PlanCoordinatorBridge] No event publisher configured", {
        events,
      });
      return;
    }

    await publisher.publish(events as PlanEvent[]);
  }
}
