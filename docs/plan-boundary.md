# Plan Boundary Architecture

## Overview

Phase 2 introduces a scaffolding layer between UI interactions and plan domain services. The new structure keeps existing behavior intact while providing explicit seams for the migration described in `docs/refactoring/phase2` materials.

## Layers

1. **UI Actions (`src/application/actions`)**: Typed `PlanUiAction` objects and `PlanUiActionMapper` translate view intents into commands.
2. **Commands (`src/application/commands`)**: `PlanCommandBus` executes commands with context and dependencies, producing snapshots and events.
3. **Events (`src/application/events`)**: `PlanEventPublisher` (interface) will broadcast domain events to listeners and stores.
4. **Coordinator Bridge (`src/coordinators/PlanCoordinatorBridge.ts`)**: Orchestrates the action → command → state update → event flow.

## Responsibilities

- **PlanCoordinatorBridge**: Entry point used by `PlanCoordinator`. It receives UI actions, invokes the mapper, executes commands, and applies `nextState` to stores/services before publishing events.
- **PlanCoordinator**: Continues to host legacy logic while delegating early to the bridge. TODO notes mark areas that will migrate in later phases.

## Migration Notes

- Legacy stores/services remain untouched aside from bridge injection points.
- Command handlers, event routing, and concrete dependencies are intentionally stubbed with TODOs. Future phases will replace deprecated store interactions with command-driven updates.
- All new files live under `src/application` with clear subfolders for actions, commands, and events.
