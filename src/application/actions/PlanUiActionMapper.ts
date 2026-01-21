import type { PlanUiAction } from "./types/PlanUiAction";
import type {
  PlanCommand,
  PlanCommandContext,
} from "../commands/types/PlanCommandTypes";

export class PlanUiActionMapper {
  // TODO: inject action mapping config once available
  constructor(private readonly mappingTable: Record<string, unknown> = {}) {}

  mapToCommand(action: PlanUiAction): {
    command: PlanCommand | null;
    context: PlanCommandContext;
  } {
    // TODO: implement mapping logic using mappingTable
    const placeholderCommand: PlanCommand = {
      type: action.type,
      payload: action.payload,
      metadata: action.metadata,
    };

    const context: PlanCommandContext = {
      action,
      userId: action.metadata?.userId as string | undefined,
      timestamp: new Date(),
      correlationId: action.metadata?.correlationId as string | undefined,
    };

    return { command: placeholderCommand, context };
  }
}
