## Goals

- Establish `savedPlacesStore` as the canonical read/write surface for all place entities regardless of origin (user saved, imported, recommended).
- Remove duplicated entity lifecycles between `placesStore`, route caches, and UI-local mirrors so selectors can operate on a single normalized graph.
- Guarantee that persistence (Firestore/local backup) and client caches subscribe to the same event stream to avoid drift during offline or concurrent edits.

## Current Issues

- Parallel stores mutate overlapping data (e.g., `placesStore.addPlace`, `savedPlacesStore.upsert`) with incompatible schemas, leading to stale markers and double-fetching.
- UI components consume ad-hoc derived state (selected, highlighted, pinned) without provenance, so interactions race when stores resolve at different speeds.
- Backup utilities tap into `savedPlacesStore.backup` while import/export flows still reference `placesStore`, making rollback paths inconsistent and hard to verify.
- Observability is fragmented; events are fired from individual components rather than the store boundary, so diagnostics cannot trace full CRUD flows.

## Proposed Architecture

### Events

- `SavedPlaceRequested` → emitted by UI/services; includes intent (`create`, `update`, `delete`, `hydrate`) and metadata for auditing.
- `SavedPlacePersisted` → dispatched after optimistic write succeeds against persistence; carries `placeId`, version, and source adapter for downstream caches.
- `SavedPlaceSyncFailed` → surfaces transport/storage errors; `ErrorCode` enriched so UI chooses retry or rollback strategy.
- `SavedPlaceViewStateChanged` → lightweight event for UI-only state that references `savedPlacesStore` ids instead of duplicating entities.

### Selectors

- `selectSavedPlaces`: normalized array keyed by `placeId`, annotated with hydration status and last-sync timestamp.
- `selectSavedPlacesByTag(tagId)`: memoized filter using derived indexes maintained inside the store.
- `selectSavedPlaceMeta(placeId)`: exposes lifecycle info (persistence mode, pending mutations) for concurrency-safe UI.
- `selectViewState(placeId)`: composes `savedPlacesStore` data with UI state slices (selected, hovered, editDraft) via readonly projection.

### Store Responsibilities

- Accepts all mutations through a single command queue that routes to persistence adapters and emits events; no UI component writes directly to other stores.
- Hosts adapters for Firestore, LocalStorage backup, and import/export, managed via `ServiceContainer` so they can be mocked in tests.
- Provides hydration hooks to bootstrap offline caches before UI renders; selectors expose `isHydrated` for gatekeeping.
- Publishes metrics counters (mutations/minute, failure rate) to the observability layer for Phase 3 monitoring goals.

## Migration Plan

- **Freeze new `placesStore` writes**
  - [ ] Add an ESLint rule that errors on `placesStore.*` mutators in UI/runtime code paths.
  - [ ] Ship a unit test/contract test that fails when new `placesStore` writes are introduced via DI bindings.
  - [ ] Emit a dev-mode console warning when `placesStore` helpers run so teams can trace remaining callers.

- **Add compatibility selectors**
  - [ ] Implement selector shims that expose the legacy signatures but resolve through `savedPlacesStore` data.
  - [ ] Create memoized selector tests to ensure parity against existing snapshots before swapping consumers.
  - [ ] Publish a migration guide that maps each legacy selector to its new `savedPlacesStore` equivalent.

- **Backfill data shape**
  - [ ] Write a migration script that copies `placesStore` docs into `savedPlacesStore` format (normalize tags, metadata, timestamps).
  - [ ] Run the script against staging and verify checksums + counts before executing in production.
  - [ ] Capture a rollback plan (backup snapshot + replay instructions) in case the script fails mid-run.

- **Swap persistence adapters**
  - [ ] Define the `SavedPlacePersisted` event contract (payload schema, idempotency rules, ack behavior) and circulate for sign-off.
  - [ ] Update Firestore and LocalStorage adapters to subscribe to events instead of direct store calls; add integration tests for both paths.
  - [ ] Remove any `placesStore`-specific persistence hooks and ensure telemetry dashboards monitor the new event-driven flow.

- **Decommission legacy store**
  - [ ] Delete `placesStore` source files once telemetry shows zero legacy selector reads for two releases.
  - [ ] Update DI bindings + feature flags to point exclusively at `savedPlacesStore` implementations.
  - [ ] Archive legacy documentation and link the new architecture page so teams stop referencing outdated patterns.

## Open Questions

- Should multi-device conflict resolution live inside `savedPlacesStore` or an external `PlaceSyncService`?
- Do we cache third-party metadata (e.g., Google Place Details) inside the store, or keep that in a separate enrichment service to control size?
- How do we represent ephemeral collaboration state (co-editing, live cursors) without polluting the canonical store schema?
- What migration rollback steps are required if Firestore batching fails mid-flight; do we pause writes or support partial merges?
