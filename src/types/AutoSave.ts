export type SaveStrategy = 'immediate' | 'debounced' | 'manual';

export interface AutoSaveOptions {
  autoSave?: boolean;
  strategy?: SaveStrategy;
  debounceMs?: number;
  localOnly?: boolean;
}

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}