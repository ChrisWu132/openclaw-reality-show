import { Router } from "express";
import { createSession, getSession } from "../engine/state-manager.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:session");
export const sessionRouter = Router();

sessionRouter.post("/session/create", (req, res) => {
  const { scenario, personality, agentId } = req.body;

  if (scenario !== "work-halls") {
    res.status(400).json({
      error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}` },
    });
    return;
  }

  const session = createSession(scenario, personality || "coordinator-default", agentId);
  const wsUrl = `ws://${req.headers.host}/session/${session.id}`;

  logger.info(`Session created: ${session.id}`, { scenario });

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
    res.status(404).json({
      error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
    });
    return;
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
    res.status(404).json({
      error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
    });
    return;
  }

  if (session.status !== "monologue" && session.status !== "ended") {
    res.status(403).json({
      error: { code: "MONOLOGUE_NOT_AVAILABLE", message: "Session has not ended yet" },
    });
    return;
  }

  res.json(session.monologue);
});
