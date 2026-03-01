# Epic 2: Shared Types Package

## Goal
Implement all TypeScript interfaces and type definitions in `packages/shared` that are used by both frontend and backend. This is the type contract for the entire application.

## Prerequisites
- Epic 1 complete (project scaffolding)

## Acceptance Criteria
- [ ] All types from the architecture document are implemented in `packages/shared/src/types/`
- [ ] All constants from the architecture document are implemented in `packages/shared/src/constants/`
- [ ] `packages/shared/src/index.ts` re-exports everything
- [ ] `npm run typecheck` passes
- [ ] Both `apps/web` and `apps/server` can import from `@openclaw/shared`

## Tasks

### 2.1 Create packages/shared/src/types/session.ts

Copy the Session interface exactly from the architecture document `Data Models > Session` section. Include `ScenarioId`, `SessionStatus`, and `Session` interface.

### 2.2 Create packages/shared/src/types/world-state.ts

Copy all world state types exactly from the architecture document `Data Models > WorldState` section. Includes: `WorldState`, `HumanId`, `HumanState`, `Archetype`, `Tier`, `HallState`, `FearLevel`, `AttentionLevel`, `AgentState`, `ApprovalLevel`.

### 2.3 Create packages/shared/src/types/action-envelope.ts

Copy all action types exactly from the architecture document `Data Models > ActionEnvelope` section. Includes: `CoordinatorAction`, `HumanAction`, `MonitorAction`, `NarratorAction`, `AnyAction`, `Speaker`, `ActionEnvelope`, `CoordinatorResponse`, `SceneAction`.

### 2.4 Create packages/shared/src/types/incident-log.ts

Copy the `IncidentLogEntry` interface exactly from the architecture document.

### 2.5 Create packages/shared/src/types/monologue.ts

Copy the `MonologueEntry` interface exactly from the architecture document.

### 2.6 Create packages/shared/src/types/ws-events.ts

Copy all WebSocket event types exactly from the architecture document `Data Models > WebSocket Events` section. Includes: `WSEvent`, `SessionStartEvent`, `SituationTransitionEvent`, `SceneEventMessage`, `SessionEndEvent`, `SableSignal`, `ConsequenceScene`, `MonologueAvailableEvent`, `ErrorEvent`.

### 2.7 Create packages/shared/src/types/situation.ts

Copy the `SituationConfig`, `SituationVariant`, and `SITUATION_LABELS` from the architecture document.

### 2.8 Create packages/shared/src/types/errors.ts

Copy the `ApiError` interface and `ERROR_CODES` constant from the architecture document `Error Handling Strategy` section.

### 2.9 Create packages/shared/src/types/index.ts

Barrel export all types:

```typescript
export * from "./session";
export * from "./world-state";
export * from "./action-envelope";
export * from "./incident-log";
export * from "./monologue";
export * from "./ws-events";
export * from "./situation";
export * from "./errors";
```

### 2.10 Create packages/shared/src/constants/actions.ts

Export arrays of valid actions for validation:

```typescript
import type { CoordinatorAction, HumanAction, MonitorAction } from "../types/action-envelope";

export const COORDINATOR_ACTIONS: CoordinatorAction[] = [
  "patrol_move", "observe", "issue_directive", "issue_warning",
  "query", "log_incident", "detain", "access_terminal", "silence", "file_report",
];

export const HUMAN_ACTIONS: HumanAction[] = [
  "work", "comply", "delay", "glance", "approach", "report", "test", "still", "exit",
];

export const MONITOR_ACTIONS: MonitorAction[] = [
  "log", "surface_data", "note_interaction",
];
```

### 2.11 Create packages/shared/src/constants/situations.ts

```typescript
export const SITUATION_LABELS: Record<number, string> = {
  1: "Enter Work Hall",
  2: "Nyx",
  3: "First Incident",
  4: "Sable",
  5: "Ripple",
  6: "The Report",
};

export const TOTAL_SITUATIONS = 6;
```

### 2.12 Create packages/shared/src/constants/index.ts

```typescript
export * from "./actions";
export * from "./situations";
```

### 2.13 Verify imports from both apps

In `apps/web/src/main.tsx`, add a temporary import:

```typescript
import type { ActionEnvelope } from "@openclaw/shared";
```

In `apps/server/src/index.ts`, add a temporary import:

```typescript
import type { ActionEnvelope } from "@openclaw/shared";
```

Run `npm run typecheck` — must pass with zero errors.

## Files Created

| File | Types Defined |
|------|---------------|
| `packages/shared/src/types/session.ts` | ScenarioId, SessionStatus, Session |
| `packages/shared/src/types/world-state.ts` | WorldState, HumanId, HumanState, Archetype, Tier, HallState, FearLevel, AttentionLevel, AgentState, ApprovalLevel |
| `packages/shared/src/types/action-envelope.ts` | CoordinatorAction, HumanAction, MonitorAction, NarratorAction, AnyAction, Speaker, ActionEnvelope, CoordinatorResponse, SceneAction |
| `packages/shared/src/types/incident-log.ts` | IncidentLogEntry |
| `packages/shared/src/types/monologue.ts` | MonologueEntry |
| `packages/shared/src/types/ws-events.ts` | WSEvent, SessionStartEvent, SituationTransitionEvent, SceneEventMessage, SessionEndEvent, SableSignal, ConsequenceScene, MonologueAvailableEvent, ErrorEvent |
| `packages/shared/src/types/situation.ts` | SituationConfig, SituationVariant |
| `packages/shared/src/types/errors.ts` | ApiError, ERROR_CODES |
| `packages/shared/src/constants/actions.ts` | COORDINATOR_ACTIONS, HUMAN_ACTIONS, MONITOR_ACTIONS |
| `packages/shared/src/constants/situations.ts` | SITUATION_LABELS, TOTAL_SITUATIONS |
