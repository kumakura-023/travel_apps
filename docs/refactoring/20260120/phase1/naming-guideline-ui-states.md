## Purpose

Clarify how UI-only stores (e.g., `selectedPlaceStore`, `mapLayerUiStore`) should be named, what they own, and how they interact with canonical data stores without leaking business logic.

## Naming Guidelines

- **Prefix by context**: use `selected`, `hovered`, `panel`, `modal`, etc., to signal interaction scope (`selectedPlaceStore`, `panelVisibilityStore`). Avoid terms implying data ownership (`places`, `routes`).
- **Suffix with `UiStore` when state never persists** to keep parity with domain stores (`savedPlacesStore`). Example: `selectedPlaceUiStore`, `mapFilterUiStore`.
- **Use noun-based actions** (`select`, `focus`, `openPanel`) instead of CRUD verbs; UI stores manage intent, not entities.
- **Expose selectors, not raw state**: `selectSelectedPlaceId`, `selectIsDetailsPanelOpen`; keep naming parallel to React hooks consuming them.

## Responsibility Guidelines

- Own only ephemeral view state: selection, hover, expansion, temporary filters, form drafts that can be discarded without affecting backend truth.
- Never mutate canonical data (`savedPlacesStore`, `routeStore`); instead, dispatch events or call services that own persistence.
- Publish events tagged `ViewState*` so analytics distinguishes UI intent from data mutations.
- Handle undo/redo or optimistic UI locally but reconcile against canonical events (e.g., revert selection when `SavedPlaceSyncFailed`).
- Keep state shape minimal and serializable for debugging; avoid embedding large entity snapshots—store ids or references instead.

## Integration Checklist

1. Read-only dependency on canonical stores via selectors; no circular subscriptions.
2. Clearly documented lifecycle (init on page mount, reset on navigation) to prevent memory leaks.
3. Tests verify naming and ownership rules: actions do not call persistence adapters, selectors return primitive-friendly values.
4. Monitoring hooks distinguish UI-only actions (e.g., `ui.selectedPlace.changed`) to support UX telemetry without noisy data events.
