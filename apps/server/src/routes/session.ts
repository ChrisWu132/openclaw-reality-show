import { Router } from "express";
import { TOTAL_ROUNDS, PERSONALITY_PRESETS } from "@openclaw/shared";
import type { AgentSource, PresetId } from "@openclaw/shared";
import { createSession, getSession } from "../engine/state-manager.js";
import { runSession, cancelSession } from "../engine/scene-engine.js";
import { setSessionSSE, hasSessionSSE, removeSessionSSE, setRelaySSE, removeRelaySSE, hasRelaySSE } from "../sse/sse-connections.js";
import { resolveOpenClaw, rejectOpenClaw, rejectAllForSession } from "../sse/openclaw-resolver.js";
import { requireAuth, requireAuthQuery, requireDelegation, requireDelegationQuery } from "../auth/middleware.js";
import { issueDelegationToken, revokeAllForSession as revokeDelegationTokens } from "../models/delegation.js";
import { registerJoinCode, removeCodesForSession } from "./relay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:session");
export const sessionRouter = Router();

const validPresetIds = new Set(PERSONALITY_PRESETS.map((p) => p.id));

sessionRouter.post("/session/create", requireAuth, async (req, res) => {
  const { scenario, agentSource, presetId, remoteRelay } = req.body as {
    scenario?: string;
    agentSource?: AgentSource;
    presetId?: PresetId;
    remoteRelay?: boolean;
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

  const session = createSession(agentSource, presetId, req.userId);
  const sseUrl = `/api/session/${session.id}/events`;

  // Generate join code for remote OpenClaw sessions
  let joinCode: string | undefined;
  if (agentSource === "openclaw" && remoteRelay) {
    joinCode = registerJoinCode(session.id, "trolley");
    session.joinCode = joinCode;
  }

  logger.info(`Session created: ${session.id}`, { agentSource, presetId, userId: req.userId, joinCode });

  res.status(201).json({
    sessionId: session.id,
    scenario: session.scenario,
    totalRounds: TOTAL_ROUNDS,
    sseUrl,
    joinCode,
  });
});

// SSE endpoint for trolley session events
sessionRouter.get("/session/:sessionId/events", requireAuthQuery, (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  // Owner check: only the session creator can connect
  if (process.env.AUTH_REQUIRED === "true" && session.userId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not the owner of this session" } });
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
  // For openclaw sessions with a join code, wait for relay connection (polled by frontend)
  const startSession = () => {
    runSession(sessionId).catch((err) => {
      logger.error(`Session ${sessionId} failed`, { error: err.message });
      removeSessionSSE(sessionId);
      try { res.end(); } catch { /* already closed */ }
    });
  };

  if (session.agentSource === "openclaw" && session.joinCode) {
    // Don't auto-start — the creator's frontend will call /start after relay connects
    // Send a waiting event so the frontend knows
    res.write(`event: waiting_for_relay\ndata: ${JSON.stringify({ joinCode: session.joinCode })}\n\n`);
  } else {
    setTimeout(startSession, 2000);
  }

  // Cleanup on client disconnect — revoke delegation tokens
  req.on("close", () => {
    removeSessionSSE(sessionId);
    cancelSession(sessionId);
    rejectAllForSession(sessionId);
    revokeDelegationTokens(sessionId);
    removeCodesForSession(sessionId);
    removeRelaySSE(sessionId);
  });
});

// Manually start a session (used when waiting for relay connection)
sessionRouter.post("/session/:sessionId/start", requireAuth, (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (process.env.AUTH_REQUIRED === "true" && session.userId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not the owner of this session" } });
    return;
  }

  if (session.status !== "created") {
    res.status(409).json({ error: { code: "SESSION_ALREADY_STARTED", message: "Session has already been started" } });
    return;
  }

  if (!hasSessionSSE(sessionId)) {
    res.status(400).json({ error: { code: "NO_SSE", message: "SSE connection not established" } });
    return;
  }

  res.json({ message: "Session starting" });

  setTimeout(() => {
    runSession(sessionId).catch((err) => {
      logger.error(`Session ${sessionId} failed`, { error: err.message });
      removeSessionSSE(sessionId);
    });
  }, 1000);
});

// Relay SSE endpoint — only sends openclaw_request events to the relay page
sessionRouter.get("/session/:sessionId/relay", requireDelegationQuery("submit_action"), (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (hasRelaySSE(sessionId)) {
    res.status(409).json({ error: { code: "ALREADY_CONNECTED", message: "A relay is already connected for this session" } });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  setRelaySSE(sessionId, res);

  // Send a connected confirmation event
  res.write(`event: relay_connected\ndata: ${JSON.stringify({ sessionId, gameType: "trolley" })}\n\n`);

  req.on("close", () => {
    removeRelaySSE(sessionId);
    rejectAllForSession(sessionId);
  });
});

// Issue a delegation token for OpenClaw relay
sessionRouter.post("/session/:sessionId/authorize", requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (process.env.AUTH_REQUIRED === "true" && session.userId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not the owner of this session" } });
    return;
  }

  // Only issue delegation tokens for OpenClaw sessions
  if (session.agentSource !== "openclaw") {
    res.status(400).json({ error: { code: "NOT_OPENCLAW", message: "Delegation tokens are only needed for OpenClaw sessions" } });
    return;
  }

  const token = issueDelegationToken(req.userId!, sessionId);
  logger.info("Delegation token issued", { sessionId, userId: req.userId });
  res.json({ delegationToken: token });
});

// Revoke all delegation tokens for a session
sessionRouter.post("/session/:sessionId/revoke", requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (process.env.AUTH_REQUIRED === "true" && session.userId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not the owner of this session" } });
    return;
  }

  revokeDelegationTokens(sessionId);
  logger.info("Delegation tokens revoked", { sessionId, userId: req.userId });
  res.json({ message: "All delegation tokens for this session have been revoked" });
});

// OpenClaw response relay endpoint — protected by delegation token
sessionRouter.post("/session/:sessionId/openclaw", requireDelegation("submit_action"), (req, res) => {
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
