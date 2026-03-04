import { Router } from "express";
import { TOTAL_ROUNDS } from "@openclaw/shared";
import { createSession, getSession } from "../engine/state-manager.js";
import { loadAgentMemoryFromOpenClaw } from "../loaders/personality-loader.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:session");
export const sessionRouter = Router();

sessionRouter.post("/session/create", async (req, res) => {
  const { scenario, agentId } = req.body;

  if (scenario !== "trolley-problem") {
    res.status(400).json({
      error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}. Use "trolley-problem".` },
    });
    return;
  }

  let agentMemory: string | undefined;
  if (agentId) {
    try {
      agentMemory = await loadAgentMemoryFromOpenClaw(agentId);
    } catch (err) {
      logger.warn("Failed to load agent memory", { error: (err as Error).message });
    }
  }

  const session = createSession("", agentId, agentMemory);
  const protocol = req.headers["x-forwarded-proto"] === "https" || req.secure ? "wss" : "ws";
  const wsUrl = `${protocol}://${req.headers.host}/session/${session.id}`;

  logger.info(`Session created: ${session.id}`, { agentId });

  res.status(201).json({
    sessionId: session.id,
    scenario: session.scenario,
    totalRounds: TOTAL_ROUNDS,
    wsUrl,
  });
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
