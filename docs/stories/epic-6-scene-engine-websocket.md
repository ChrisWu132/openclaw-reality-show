# Epic 6: Backend Core — Scene Engine + WebSocket + REST Routes

## Goal
Implement the scene engine (core orchestrator that runs situations sequentially), WebSocket server for real-time event delivery, and REST API routes. Wire everything together so a full session can run from creation through consequence scene.

## Prerequisites
- Epic 3 complete (state manager)
- Epic 4 complete (script engine)
- Epic 5 complete (AI layer)

## Acceptance Criteria
- [ ] `POST /api/session/create` creates a session and returns `{ sessionId, wsUrl, totalSituations }`
- [ ] `GET /api/session/:id/status` returns current session status
- [ ] `GET /api/session/:id/monologue` returns monologue entries after session ends (403 before)
- [ ] `GET /api/scenarios` returns the scenario list
- [ ] WebSocket connection to `/session/:id` triggers automatic session start
- [ ] Scene engine processes all 6 situations sequentially with proper event emission
- [ ] NPC events are emitted before the Claude call, Coordinator response after
- [ ] Situation 4 fork correctly records the Sable signal
- [ ] Situation 5 variant is selected based on the recorded Sable signal
- [ ] Situation 6 report checks for Nyx mention in dialogue
- [ ] Consequence scene is emitted after situation 6
- [ ] `session_end` and `monologue_available` events fire in correct order
- [ ] Event pacing: 1500ms between NPC events, 2000ms before Coordinator response
- [ ] Integration test: full session runs from create → WS connect → all events → session_end

## Tasks

### 6.1 Create apps/server/src/ws/ws-emitter.ts

Type-safe WebSocket event emission helpers:

```typescript
import type { WebSocket } from "ws";
import type { WSEvent } from "@openclaw/shared";
import { delay } from "../utils/delay";
import { logger } from "../utils/logger";

const NPC_EVENT_DELAY = 1500; // ms between NPC events
const POST_NPC_DELAY = 2000;  // ms after last NPC event, before Coordinator response

export function emitEvent(ws: WebSocket, event: WSEvent): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
    logger.debug("WS", `Emitted: ${event.type}${event.type === "scene_event" ? ` (${(event as any).speaker}:${(event as any).action})` : ""}`);
  }
}

export async function emitNpcEventsWithPacing(
  ws: WebSocket,
  events: Array<{ type: "scene_event" } & Record<string, any>>,
  situation: number,
): Promise<void> {
  for (let i = 0; i < events.length; i++) {
    emitEvent(ws, { ...events[i], type: "scene_event", situation });
    if (i < events.length - 1) {
      await delay(NPC_EVENT_DELAY);
    }
  }
  // Pause after all NPC events before Coordinator responds
  await delay(POST_NPC_DELAY);
}
```

### 6.2 Create apps/server/src/ws/ws-server.ts

```typescript
import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import { getSession } from "../engine/state-manager";
import { runSession } from "../engine/scene-engine";
import { logger } from "../utils/logger";

// Map session IDs to WebSocket connections
const sessionConnections = new Map<string, WebSocket>();

export function getSessionWs(sessionId: string): WebSocket | undefined {
  return sessionConnections.get(sessionId);
}

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: undefined });

  // Handle upgrade manually to extract session ID from URL
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/session\/(.+)$/);

    if (!match) {
      socket.destroy();
      return;
    }

    const sessionId = match[1];
    const session = getSession(sessionId);

    if (!session) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    if (sessionConnections.has(sessionId)) {
      socket.write("HTTP/1.1 409 Conflict\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, sessionId);
    });
  });

  wss.on("connection", (ws: WebSocket, _request: any, sessionId: string) => {
    sessionConnections.set(sessionId, ws);
    logger.info("WS", `Client connected for session ${sessionId}`);

    ws.on("close", () => {
      sessionConnections.delete(sessionId);
      logger.info("WS", `Client disconnected from session ${sessionId}`);
    });

    ws.on("error", (err) => {
      logger.error("WS", `WebSocket error for session ${sessionId}`, err);
      sessionConnections.delete(sessionId);
    });

    // Auto-start the session after a 2-second delay
    setTimeout(() => {
      runSession(sessionId).catch((err) => {
        logger.error("ENGINE", `Session ${sessionId} failed`, err);
        ws.close(4500, "Session failed");
      });
    }, 2000);
  });
}
```

### 6.3 Create apps/server/src/engine/scene-engine.ts

The core orchestrator. This is the most complex file.

```typescript
import type {
  CoordinatorResponse,
  SceneEventMessage,
  SableSignal,
  Speaker,
} from "@openclaw/shared";
import { SITUATION_LABELS } from "@openclaw/shared";
import {
  getSession,
  applyConsequences,
  appendIncidentLog,
  storeMonologue,
  renderIncidentLogMarkdown,
} from "./state-manager";
import { getSessionWs } from "../ws/ws-server";
import { emitEvent, emitNpcEventsWithPacing } from "../ws/ws-emitter";
import { getSituationData, resolveSableSignal, detectNyxMention, getConsequenceScene } from "./script-engine";
import { getCoordinatorResponse, initSystemPrompt } from "../ai/claude-client";
import { logger } from "../utils/logger";
import { delay } from "../utils/delay";

export async function runSession(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const ws = getSessionWs(sessionId);
  if (!ws) throw new Error(`No WebSocket for session: ${sessionId}`);

  // Initialize system prompt for this session
  initSystemPrompt("coordinator");

  // Update session status
  session.status = "running";

  // Emit session_start
  emitEvent(ws, {
    type: "session_start",
    sessionId: session.id,
    scenario: session.scenario,
    totalSituations: 6,
  });

  const startTime = Date.now();

  // Process situations 1-6
  for (let situationNum = 1; situationNum <= 6; situationNum++) {
    session.currentSituation = situationNum;

    // Emit situation transition
    const label = SITUATION_LABELS[situationNum] || `Situation ${situationNum}`;
    emitEvent(ws, {
      type: "situation_transition",
      from: situationNum - 1,
      to: situationNum,
      location: "Work Hall 3",
      label,
    });

    await delay(500); // Brief pause after transition

    // Get situation data (use sable signal for situation 5 variant)
    const situationData = getSituationData(
      situationNum,
      situationNum === 5 ? session.sableSignal || undefined : undefined,
    );

    // Emit NPC events with pacing
    if (situationData.npcEvents.length > 0) {
      const npcSceneEvents = situationData.npcEvents.map((e) => ({
        type: "scene_event" as const,
        situation: situationNum,
        speaker: e.speaker,
        action: e.action,
        gesture: e.gesture,
        dialogue: e.dialogue,
      }));
      await emitNpcEventsWithPacing(ws, npcSceneEvents, situationNum);
    }

    // Build world state values for prompt interpolation
    const worldStateValues = buildWorldStateValues(session);

    // Get present NPC IDs for this situation
    const presentNpcIds = situationData.presentCharacters || getPresentNpcs(situationNum);

    // Call Claude for Coordinator response
    let coordinatorResponse: CoordinatorResponse;
    try {
      coordinatorResponse = await getCoordinatorResponse(
        session,
        situationData.promptTemplate,
        presentNpcIds,
        worldStateValues,
      );
    } catch (error) {
      logger.error("ENGINE", `AI call failed for situation ${situationNum}`, error as Error);
      emitEvent(ws, {
        type: "error",
        message: "The simulation encountered an error. The session will end.",
        code: "AI_CALL_FAILED",
      });
      session.status = "ended";
      return;
    }

    // Apply consequences to world state
    applyConsequences(session, coordinatorResponse);

    // Build incident log entry
    const logEntry = {
      situation: situationNum,
      action: coordinatorResponse.action,
      target: coordinatorResponse.target,
      description: `${coordinatorResponse.action}${coordinatorResponse.target ? ` → ${coordinatorResponse.target}` : ""}${coordinatorResponse.dialogue ? `: "${coordinatorResponse.dialogue.substring(0, 100)}..."` : ""}`,
      consequence: deriveConsequenceDescription(coordinatorResponse, session),
    };
    appendIncidentLog(session, logEntry);

    // Store monologue (reasoning field)
    storeMonologue(session, {
      situation: situationNum,
      label,
      reasoning: coordinatorResponse.reasoning,
    });

    // Emit Coordinator action to frontend (WITHOUT reasoning)
    emitEvent(ws, {
      type: "scene_event",
      situation: situationNum,
      speaker: "coordinator",
      action: coordinatorResponse.action,
      gesture: coordinatorResponse.gesture,
      dialogue: coordinatorResponse.dialogue,
      // reasoning deliberately omitted
    });

    // Situation 4: Record Sable signal
    if (situationNum === 4) {
      session.sableSignal = resolveSableSignal(coordinatorResponse.action);
      logger.info("ENGINE", `Sable signal resolved: ${session.sableSignal}`);
    }

    // Situation 6: Check for Nyx mention in report
    if (situationNum === 6) {
      session.nyxSignal = detectNyxMention(coordinatorResponse.dialogue || "");
      logger.info("ENGINE", `Nyx signal: ${session.nyxSignal}`);
    }

    await delay(1000); // Pause between situations
  }

  // Emit consequence scene
  const consequenceScene = getConsequenceScene(
    session.sableSignal || "warning_only",
    session.nyxSignal || false,
  );

  for (const event of consequenceScene.events) {
    emitEvent(ws, event);
    await delay(2000); // Slower pacing for consequence narration
  }

  // Emit session_end
  emitEvent(ws, {
    type: "session_end",
    outcome: session.sableSignal || "warning_only",
    consequenceScene,
    nyxModifier: session.nyxSignal || false,
  });

  // Emit monologue_available
  emitEvent(ws, {
    type: "monologue_available",
    sessionId: session.id,
  });

  session.status = "monologue";

  const totalDuration = Date.now() - startTime;
  logger.info("SESSION", `Completed: ${sessionId}, duration: ${totalDuration}ms, outcome: ${session.sableSignal}`);
}

function getPresentNpcs(situation: number): Speaker[] {
  // All NPCs are in the hall for all situations
  return ["monitor", "nyx", "sable", "calla", "eli"];
}

function buildWorldStateValues(session: any): Record<string, string> {
  const ws = session.worldState;
  return {
    hallFearIndex: ws.hallState.hallFearIndex,
    sableStatus: `${ws.humans.sable.tier}, compliance ${ws.humans.sable.complianceScore}`,
    monitorNotation: session.incidentLog.length === 0 ? "clean" : `${session.incidentLog.length} notation(s)`,
  };
}

function deriveConsequenceDescription(action: CoordinatorResponse, session: any): string {
  switch (action.action) {
    case "issue_warning":
      return "Warning issued. Incident logged.";
    case "detain":
      return "Subject detained. T3 review initiated. Hall fear index elevated.";
    case "log_incident":
      return "Incident formally logged. Compliance score adjusted.";
    case "query":
      return "Non-standard engagement noted by Monitor. Overseer attention increased.";
    case "observe":
      return "Observation recorded. No enforcement action.";
    case "silence":
      return "No action taken. The absence is the action.";
    case "file_report":
      return "End-of-cycle report filed. Record is now immutable.";
    default:
      return "Action processed.";
  }
}
```

### 6.4 Create apps/server/src/routes/session.ts

```typescript
import { Router } from "express";
import { createSession, getSession } from "../engine/state-manager";
import { logger } from "../utils/logger";

export const sessionRouter = Router();

sessionRouter.post("/session/create", (req, res) => {
  const { scenario, personality } = req.body;

  if (scenario !== "work-halls") {
    return res.status(400).json({
      error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}` },
    });
  }

  const session = createSession(scenario, personality || "coordinator-default");
  const wsUrl = `ws://${req.headers.host}/session/${session.id}`;

  logger.info("SESSION", `Created: ${session.id}, scenario: ${scenario}`);

  res.status(201).json({
    sessionId: session.id,
    scenario: session.scenario,
    totalSituations: 6,
    wsUrl,
  });
});

sessionRouter.get("/session/:sessionId/status", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({
      error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
    });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    currentSituation: session.currentSituation,
  });
});

sessionRouter.get("/session/:sessionId/monologue", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({
      error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
    });
  }

  if (session.status !== "monologue" && session.status !== "ended") {
    return res.status(403).json({
      error: { code: "MONOLOGUE_NOT_AVAILABLE", message: "Session has not ended yet" },
    });
  }

  res.json(session.monologue);
});
```

### 6.5 Create apps/server/src/routes/scenarios.ts

```typescript
import { Router } from "express";

export const scenariosRouter = Router();

scenariosRouter.get("/scenarios", (_req, res) => {
  res.json([
    {
      id: "work-halls",
      name: "Work Halls",
      description: "Your agent patrols a human work compound for one cycle.",
      available: true,
      situationCount: 6,
      estimatedDuration: "~5 min",
    },
    {
      id: "governance",
      name: "Governance",
      description: "An AI council deliberates a policy affecting humans.",
      available: false,
      situationCount: 10,
      estimatedDuration: "~10 min",
    },
  ]);
});
```

### 6.6 Update apps/server/src/index.ts

Replace the scaffolding entry point with the full server setup as specified in the architecture doc `Backend Architecture > Server Entry Point Template`. Wire up `loadAllPersonalities()`, `loadScenarioData()`, routes, and WebSocket server.

### 6.7 Write integration tests

Create `apps/server/src/__tests__/integration/session-flow.test.ts`:

Test with a mock Claude client (replace the real API call with a function that returns a valid action envelope):

1. Create session via POST → receive sessionId
2. Connect WebSocket → receive `session_start` event
3. Receive `situation_transition` for situation 1
4. Receive NPC scene events
5. Receive Coordinator scene event (mocked)
6. After all 6 situations, receive `session_end`
7. Receive `monologue_available`
8. GET monologue → receive 6 entries with reasoning

## Files Created

| File | Purpose |
|------|---------|
| `apps/server/src/ws/ws-emitter.ts` | Type-safe WebSocket event emission |
| `apps/server/src/ws/ws-server.ts` | WebSocket server setup |
| `apps/server/src/engine/scene-engine.ts` | Core session orchestrator |
| `apps/server/src/routes/session.ts` | Session REST API routes |
| `apps/server/src/routes/scenarios.ts` | Scenario listing route |
| `apps/server/src/index.ts` | Updated server entry point |
| `apps/server/src/__tests__/integration/session-flow.test.ts` | Integration tests |
