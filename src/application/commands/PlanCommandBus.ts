import type {
  PlanCommand,
  PlanCommandContext,
  PlanCommandDependencies,
  PlanCommandResult,
  PlanCommandHandler,
} from "./types/PlanCommandTypes";

export class PlanCommandBus {
  private readonly handlers = new Map<string, PlanCommandHandler>();

  constructor(private readonly dependencies: PlanCommandDependencies) {}

  registerHandler<TCommand extends PlanCommand>(
    type: TCommand["type"],
    handler: PlanCommandHandler<TCommand>,
  ): void {
    this.handlers.set(type, handler as PlanCommandHandler);
  }

  registerHandlers(handlers: Record<string, PlanCommandHandler>): void {
    Object.entries(handlers).forEach(([type, handler]) => {
      this.registerHandler(type, handler);
    });
  }

  async execute(
    command: PlanCommand,
    context: PlanCommandContext,
  ): Promise<PlanCommandResult> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      console.warn("[PlanCommandBus] No handler registered for command", {
        type: command.type,
      });
      return {
        status: "noop",
        nextState: context.snapshot,
        reason: "handler_not_found",
      };
    }

    try {
      return await handler(command, context, this.dependencies);
    } catch (error) {
      console.error("[PlanCommandBus] Error executing handler", {
        type: command.type,
        error,
      });
      return {
        status: "rejected",
        reason: "handler_error",
        metadata: { error },
      };
    }
  }
}
