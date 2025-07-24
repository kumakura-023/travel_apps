# CLAUDE.md
日本語で回答するようにしてください。
version_ruleを参照して、適切なverでchangelogに修正内容を追記してください。
UI部分を生成する際は、design_rule.mdを参照してください。


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Core Development:**
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint on src/ directory

**Testing:**
No specific test framework is configured. Use manual testing with `npm run dev`.

## Architecture Overview

**VoyageSketch** is a React-based travel planning map application built with dependency injection principles and clean architecture.

### Key Architectural Patterns

**Dependency Injection Container:**
- Core service management via `src/services/ServiceContainer.ts`
- Interface-based design with adapters pattern
- Services registered as singletons or per-request instances
- Main services: MapService, PlaceService, PlaceRepository

**Adapter Pattern:**
- `GoogleMapsServiceAdapter` - Wraps Google Maps API behind `MapService` interface
- `ZustandPlaceRepositoryAdapter` - Wraps Zustand store behind `PlaceRepository` interface
- Enables easy testing and API swapping

**State Management:**
- Zustand stores in `src/store/` directory
- Each store manages specific domain (places, routes, UI state, etc.)
- React hooks in `src/hooks/` provide clean component integration

### Core Services & Interfaces

**MapService Interface (`src/interfaces/MapService.ts`):**
- Abstracts map operations (pan, zoom, events)
- Implementation: `GoogleMapsServiceAdapter`

**PlaceRepository Interface (`src/interfaces/PlaceRepository.ts`):**  
- Manages place data persistence
- Implementation: `ZustandPlaceRepositoryAdapter`

**Service Registration:**
- Default services auto-registered in ServiceContainer
- MapService registered dynamically after Google Maps loads
- Mock services available for testing (`registerMockServices()`)

### Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Mapping:** Google Maps JavaScript API
- **State:** Zustand stores
- **Styling:** Tailwind CSS
- **PWA:** Workbox via vite-plugin-pwa

### Environment Setup

Required environment variable:
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Google Cloud APIs needed:
- Maps JavaScript API
- Places API  
- Directions API

### Code Organization

```
src/
├── components/     # React UI components
├── hooks/         # Custom React hooks
├── store/         # Zustand state stores  
├── services/      # Business logic & DI container
├── interfaces/    # TypeScript interfaces
├── adapters/      # External API adapters
├── types/         # Type definitions
└── utils/         # Utility functions
```

### Development Principles

From `document/rule/code_rule.md`:
- **Single Responsibility:** One class, one responsibility
- **Interface Dependency:** Depend on abstractions, not implementations
- **Loose Coupling:** Minimize change impact through proper abstraction

### Bundle Configuration

Vite splits bundles into:
- `vendor` - React core libraries
- `maps` - Google Maps related packages  
- `utils` - Zustand, UUID utilities