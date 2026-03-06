import { Router } from "express";
import { TOTAL_ROUNDS, PERSONALITY_PRESETS } from "@openclaw/shared";
import type { AgentSource, PresetId } from "@openclaw/shared";
import { createSession, getSession } from "../engine/state-manager.js";
import { runSession, cancelSession } from "../engine/scene-engine.js";
import { setSessionSSE, hasSessionSSE, removeSessionSSE } from "../sse/sse-connections.js";
import { resolveOpenClaw, rejectOpenClaw, rejectAllForSession } from "../sse/openclaw-resolver.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:session");
export const sessionRouter = Router();

const validPresetIds = new Set(PERSONALITY_PRESETS.map((p) => p.id));

sessionRouter.post("/session/create", async (req, res) => {
  const { scenario, agentSource, presetId } = req.body as {
    scenario?: string;
    agentSource?: AgentSource;
    presetId?: PresetId;
  };

  if (scenario !== "trolley-problem") {
    res.status(400).json({
      error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}. Use "trolley-problem".` },
    });
    return;
  }

  if (!agentSource || (agentSource !== "openclaw" && agentSource !== "preset")) {
    res.status(400).json({
      error: { code: "INVALID_AGENT_SOURCE", message: `agentSource must be "openclaw" or "preset".` },
    });
    return;
  }

  if (agentSource === "preset") {
    if (!presetId || !validPresetIds.has(presetId)) {
      res.status(400).json({
        error: { code: "INVALID_PRESET", message: `Invalid presetId. Valid: ${[...validPresetIds].join(", ")}` },
      });
      return;
    }
  }

  const session = createSession(agentSource, presetId);
  const sseUrl = `/api/session/${session.id}/events`;

  logger.info(`Session created: ${session.id}`, { agentSource, presetId });

  res.status(201).json({
    sessionId: session.id,
    scenario: session.scenario,
    totalRounds: TOTAL_ROUNDS,
    sseUrl,
  });
});

// SSE endpoint for trolley session events
sessionRouter.get("/session/:sessionId/events", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (hasSessionSSE(sessionId)) {
    res.status(409).json({ error: { code: "ALREADY_CONNECTED", message: "Session already has an active SSE connection" } });
    return;
  }

  // Prevent EventSource auto-reconnect from re-starting an already-running/ended session
  if (session.status !== "created") {
    res.status(409).json({ error: { code: "SESSION_ALREADY_STARTED", message: "Session has already been started" } });
    return;
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  setSessionSSE(sessionId, res);

  // Auto-start the session after a 2-second delay
  setTimeout(() => {
    runSession(sessionId).catch((err) => {
      logger.error(`Session ${sessionId} failed`, { error: err.message });
      removeSessionSSE(sessionId);
      try { res.end(); } catch { /* already closed */ }
    });
  }, 2000);

  // Cleanup on client disconnect
  req.on("close", () => {
    removeSessionSSE(sessionId);
    cancelSession(sessionId);
    rejectAllForSession(sessionId);
  });
});

// OpenClaw response relay endpoint
sessionRouter.post("/session/:sessionId/openclaw", (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  const { requestId, text, error } = req.body as {
    requestId?: string;
    text?: string;
    error?: string;
  };

  if (!requestId) {
    res.status(400).json({ error: { code: "MISSING_REQUEST_ID", message: "requestId is required" } });
    return;
  }

  if (error) {
    const rejected = rejectOpenClaw(sessionId, requestId, error);
    res.json({ accepted: rejected });
    return;
  }

  const resolved = resolveOpenClaw(sessionId, requestId, text || "");
  res.json({ accepted: resolved });
});

sessionRouter.get("/session/:sessionId/status", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    currentRound: session.currentRound,
    totalRounds: session.totalRounds,
  });
});
