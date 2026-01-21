export interface PlanUiAction<TPayload = Record<string, unknown>> {
  readonly type: string;
  readonly payload?: TPayload;
  /**
   * Additional metadata that can be used for logging, tracing, or feature flags.
   */
  readonly metadata?: Record<string, unknown>;
}

export type PlanUiActionFactory<TPayload = Record<string, unknown>> = (
  payload: TPayload,
) => PlanUiAction<TPayload>;
