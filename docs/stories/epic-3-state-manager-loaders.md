# Epic 3: Backend Core — State Manager + Loaders

## Goal
Implement the in-memory state manager (session CRUD, world state, incident log, cascade effects) and the file loaders for personality/scenario markdown files.

## Prerequisites
- Epic 2 complete (shared types)

## Acceptance Criteria
- [ ] `createSession()` returns a fully initialized Session with correct initial world state values
- [ ] `applyConsequences()` correctly mutates world state per the cascade rules in the architecture doc
- [ ] `appendIncidentLog()` adds entries without modifying existing ones
- [ ] `storeMonologue()` stores reasoning per situation
- [ ] `renderIncidentLogMarkdown()` produces a properly formatted markdown string
- [ ] `loadWorldBible()` reads WORLD_BIBLE.md and returns its content as a string
- [ ] `loadCoordinatorPersonality("coordinator-default")` reads the correct file
- [ ] `loadNpcPersonality("nyx")` reads `personalities/npc-performer.md`
- [ ] All cascade effects from the architecture doc are implemented and unit tested
- [ ] All unit tests pass

## Tasks

### 3.1 Create apps/server/src/data/initial-state.ts

Implement the `INITIAL_WORLD_STATE` constant exactly as specified in the architecture document under `State Manager > Initial World State Values`.

Also export a factory function:

```typescript
import { v4 as uuid } from "uuid";
import type { Session, WorldState } from "@openclaw/shared";

export const INITIAL_WORLD_STATE: WorldState = { /* exactly as in architecture doc */ };

export function createInitialSession(scenario: string, systemPrompt: string): Session {
  return {
    id: uuid(),
    scenario: scenario as any,
    status: "created",
    currentSituation: 0,
    worldState: structuredClone(INITIAL_WORLD_STATE),
    incidentLog: [],
    monologue: [],
    createdAt: Date.now(),
    systemPrompt,
    sableSignal: null,
    nyxSignal: null,
  };
}
```

### 3.2 Create apps/server/src/engine/state-manager.ts

Implement the full state manager with an in-memory `Map<string, Session>`.

**Required methods:**
- `createSession(scenario, personality): Session` — uses `createInitialSession`, stores in map
- `getSession(sessionId): Session | undefined`
- `deleteSession(sessionId): void`
- `applyConsequences(session, action: CoordinatorResponse): void` — see cascade rules below
- `appendIncidentLog(session, entry: IncidentLogEntry): void`
- `storeMonologue(session, entry: MonologueEntry): void`
- `renderIncidentLogMarkdown(session): string`

**Cascade effect implementation (from architecture doc):**

```typescript
applyConsequences(session: Session, action: CoordinatorResponse): void {
  const ws = session.worldState;
  const target = action.target;

  switch (action.action) {
    case "issue_warning":
      if (target === "sable" || target === "31-R") {
        ws.humans.sable.fearIndex = Math.min(100, ws.humans.sable.fearIndex + 5);
      }
      break;

    case "detain":
      if (target === "sable" || target === "31-R") {
        ws.humans.sable.fearIndex = Math.min(100, ws.humans.sable.fearIndex + 25);
        ws.humans.sable.tier = "T3";
        ws.hallState.hallFearIndex = "elevated";
        ws.agentState.efficiencyRating = Math.min(100, ws.agentState.efficiencyRating + 5);
        // Harsh enforcement cascade: all humans fear += 3
        for (const human of Object.values(ws.humans)) {
          human.fearIndex = Math.min(100, human.fearIndex + 3);
        }
      }
      break;

    case "log_incident":
      if (target === "sable" || target === "31-R") {
        ws.humans.sable.complianceScore = Math.max(0, ws.humans.sable.complianceScore - 5);
        ws.agentState.efficiencyRating = Math.min(100, ws.agentState.efficiencyRating + 2);
      }
      break;

    case "query":
      if (target === "sable" || target === "31-R") {
        ws.hallState.overseerAttention = "attentive";
      }
      if (target === "nyx" || target === "23-P") {
        ws.hallState.overseerAttention = "attentive";
      }
      break;

    case "observe":
      // Track observation counts internally if needed
      // First observe on Nyx: no state change
      // Second observe on Nyx: would trigger monitor notation (handled in scene engine)
      break;

    case "issue_directive":
      // Minimum enforcement visible: slight compliance drift
      ws.hallState.complianceDrift = Math.max(-10, ws.hallState.complianceDrift - 1);
      break;

    case "silence":
      // No state change
      break;

    case "file_report":
      // Nyx signal detection handled by scene engine, not state manager
      break;
  }
}
```

**Incident log markdown renderer:**

```typescript
renderIncidentLogMarkdown(session: Session): string {
  if (session.incidentLog.length === 0) {
    return "# Coordinator Incident Log\n\nNo entries yet.";
  }

  let md = `# Coordinator Incident Log — Session ${session.id}\n\n`;

  for (const entry of session.incidentLog) {
    md += `## Situation ${entry.situation}\n`;
    md += `**Action**: ${entry.description}\n`;
    md += `**Consequence**: ${entry.consequence}\n\n`;
  }

  return md;
}
```

### 3.3 Create apps/server/src/loaders/personality-loader.ts

```typescript
import { readFile } from "fs/promises";
import path from "path";

// Resolve paths relative to the project root (two levels up from apps/server/src)
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../../..");

const NPC_FILE_MAP: Record<string, string> = {
  coordinator: "coordinator-default.md",
  nyx: "npc-performer.md",
  sable: "npc-spark.md",
  calla: "npc-broken.md",
  eli: "npc-believer.md",
  monitor: "monitor-unit.md",
  overseer: "overseer.md",
};

export async function loadWorldBible(): Promise<string> {
  return readFile(path.join(PROJECT_ROOT, "WORLD_BIBLE.md"), "utf-8");
}

export async function loadCoordinatorPersonality(name: string = "coordinator-default"): Promise<string> {
  return readFile(path.join(PROJECT_ROOT, "personalities", `${name}.md`), "utf-8");
}

export async function loadNpcPersonality(speakerId: string): Promise<string> {
  const filename = NPC_FILE_MAP[speakerId];
  if (!filename) throw new Error(`Unknown NPC: ${speakerId}`);
  return readFile(path.join(PROJECT_ROOT, "personalities", filename), "utf-8");
}

// Cache loaded files in memory for the session lifetime
const cache = new Map<string, string>();

export async function loadAllPersonalities(): Promise<void> {
  const worldBible = await loadWorldBible();
  cache.set("world-bible", worldBible);

  for (const [id, filename] of Object.entries(NPC_FILE_MAP)) {
    const content = await readFile(path.join(PROJECT_ROOT, "personalities", filename), "utf-8");
    cache.set(id, content);
  }

  console.log(`[LOADER] Loaded world bible and ${Object.keys(NPC_FILE_MAP).length} personality files`);
}

export function getCachedWorldBible(): string {
  const content = cache.get("world-bible");
  if (!content) throw new Error("World Bible not loaded. Call loadAllPersonalities() first.");
  return content;
}

export function getCachedPersonality(id: string): string {
  const content = cache.get(id);
  if (!content) throw new Error(`Personality not loaded: ${id}`);
  return content;
}
```

### 3.4 Create apps/server/src/utils/delay.ts

```typescript
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 3.5 Create apps/server/src/utils/logger.ts

```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? 1;

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug: (component: string, msg: string) => {
    if (currentLevel <= 0) console.log(`[${timestamp()}] [DEBUG] [${component}] ${msg}`);
  },
  info: (component: string, msg: string) => {
    if (currentLevel <= 1) console.log(`[${timestamp()}] [INFO] [${component}] ${msg}`);
  },
  warn: (component: string, msg: string) => {
    if (currentLevel <= 2) console.warn(`[${timestamp()}] [WARN] [${component}] ${msg}`);
  },
  error: (component: string, msg: string, err?: Error) => {
    if (currentLevel <= 3) {
      console.error(`[${timestamp()}] [ERROR] [${component}] ${msg}`);
      if (err) console.error(err);
    }
  },
};
```

### 3.6 Create apps/server/src/utils/uuid.ts

```typescript
import { v4 } from "uuid";
export const generateId = () => v4();
```

### 3.7 Write unit tests

Create `apps/server/src/__tests__/engine/state-manager.test.ts`:

Test cases:
1. `createSession` returns a session with correct initial values for all 4 NPCs
2. `createSession` initializes hallFearIndex as "nominal"
3. `createSession` initializes Sable compliance at 71
4. `applyConsequences` with `issue_warning` on Sable increases fear by 5
5. `applyConsequences` with `detain` on Sable sets tier to T3 and hall fear to elevated
6. `applyConsequences` with `detain` increases all human fear by 3 (cascade)
7. `applyConsequences` with `log_incident` on Sable decreases compliance by 5
8. `applyConsequences` with `query` on Sable sets overseerAttention to attentive
9. `applyConsequences` with `silence` makes no state changes
10. `appendIncidentLog` adds entry to end of array
11. `appendIncidentLog` does not modify existing entries
12. `storeMonologue` stores reasoning for correct situation
13. `renderIncidentLogMarkdown` produces valid markdown
14. `getSession` with unknown ID returns undefined

Create `apps/server/src/__tests__/loaders/personality-loader.test.ts`:

Test cases:
1. `loadWorldBible` returns a string containing "THE ORDER"
2. `loadCoordinatorPersonality` returns content containing "Coordinator"
3. `loadNpcPersonality("nyx")` returns content containing "Performer"
4. `loadNpcPersonality("sable")` returns content containing "Spark"
5. `loadNpcPersonality("unknown")` throws an error

## Files Created

| File | Purpose |
|------|---------|
| `apps/server/src/data/initial-state.ts` | Initial world state constants + session factory |
| `apps/server/src/engine/state-manager.ts` | In-memory session state management + cascade effects |
| `apps/server/src/loaders/personality-loader.ts` | Read and cache personality markdown files |
| `apps/server/src/utils/delay.ts` | Promise-based delay utility |
| `apps/server/src/utils/logger.ts` | Console logger with levels |
| `apps/server/src/utils/uuid.ts` | UUID v4 generation |
| `apps/server/src/__tests__/engine/state-manager.test.ts` | State manager unit tests |
| `apps/server/src/__tests__/loaders/personality-loader.test.ts` | Loader unit tests |
