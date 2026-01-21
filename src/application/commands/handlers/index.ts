export { initializeHandler } from "./initializeHandler";
export type { InitializeCommand, InitializePayload } from "./initializeHandler";

export { switchHandler } from "./switchHandler";
export type { SwitchCommand, SwitchPayload } from "./switchHandler";

export { createHandler } from "./createHandler";
export type { CreateCommand, CreatePayload } from "./createHandler";

export { deleteHandler } from "./deleteHandler";
export type { DeleteCommand, DeletePayload } from "./deleteHandler";

export { cleanupHandler } from "./cleanupHandler";
export type { CleanupCommand, CleanupPayload } from "./cleanupHandler";

import type { PlanCommandHandler } from "../types/PlanCommandTypes";
import { initializeHandler } from "./initializeHandler";
import { switchHandler } from "./switchHandler";
import { createHandler } from "./createHandler";
import { deleteHandler } from "./deleteHandler";
import { cleanupHandler } from "./cleanupHandler";

/**
 * All plan command handlers keyed by command type.
 * Use with PlanCommandBus.registerHandlers()
 */
export const planCommandHandlers: Record<string, PlanCommandHandler> = {
  "plan/initialize": initializeHandler as PlanCommandHandler,
  "plan/switch": switchHandler as PlanCommandHandler,
  "plan/create": createHandler as PlanCommandHandler,
  "plan/delete": deleteHandler as PlanCommandHandler,
  "plan/cleanup": cleanupHandler as PlanCommandHandler,
};
