import { Router } from "express";
import type { StartupAgentConfig } from "@openclaw/shared";
import { createStartupGame, startStartupGame } from "../engine/startup-engine.js";
import { loadGame, listGames, deleteGame } from "../engine/startup-store.js";
import { broadcastStartupEvent, addStartupSSE, removeStartupSSE, endAllStartupSSE, setRelaySSE, removeRelaySSE, hasRelaySSE } from "../sse/sse-connections.js";
import { resolveStartupOpenClaw } from "../sse/openclaw-resolver.js";
import { requireAuth, requireAuthQuery, requireDelegationQuery } from "../auth/middleware.js";
import { registerJoinCode } from "./relay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:startup");
export const startupRouter = Router();

/** POST /api/startup/games — Create a new startup game (requires auth) */
startupRouter.post("/startup/games", requireAuth, async (req, res) => {
  const { agents, agentConfigs } = req.body as {
    agents?: { agentId: string; agentName: string }[];
    agentConfigs?: StartupAgentConfig[];
  };

  // Support new agentConfigs or legacy agents array
  const configs: StartupAgentConfig[] = agentConfigs
    ? agentConfigs
    : agents
      ? agents.map((a) => ({ agentId: a.agentId, agentName: a.agentName, agentSource: "preset" as const }))
      : [];

  if (configs.length < 2 || configs.length > 4) {
    res.status(400).json({ error: { code: "INVALID_AGENTS", message: "Provide 2-4 agents with agentId and agentName" } });
    return;
  }

  try {
    const game = createStartupGame(configs, req.userId);

    // Generate join codes for any openclaw agent slots
    if (game.agentConfigs) {
      for (const config of game.agentConfigs) {
        if (config.agentSource === "openclaw") {
          const code = registerJoinCode(game.id, "startup", config.agentName, config.agentId);
          config.joinCode = code;
        }
      }
    }

    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ error: { code: "CREATION_FAILED", message: (err as Error).message } });
  }
});

/** GET /api/startup/games — List all games (public) */
startupRouter.get("/startup/games", (_req, res) => {
  const games = listGames();
  res.json(games);
});

/** GET /api/startup/games/:id — Get full game state (public) */
startupRouter.get("/startup/games/:id", (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }
  res.json(game);
});

/** GET /api/startup/games/:id/events — SSE endpoint for startup game (auth via query param) */
startupRouter.get("/startup/games/:id/events", requireAuthQuery, (req, res) => {
  const gameId = req.params.id;
  const game = loadGame(gameId);

  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  addStartupSSE(gameId, res);

  req.on("close", () => {
    removeStartupSSE(gameId, res);
  });
});

/** POST /api/startup/games/:id/start — Start a lobby game (requires auth, must be creator) */
startupRouter.post("/startup/games/:id/start", requireAuth, async (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  if (game.creatorId && game.creatorId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Only the creator can start this game" } });
    return;
  }

  if (game.status !== "lobby") {
    res.status(400).json({ error: { code: "INVALID_STATUS", message: "Game is not in lobby state" } });
    return;
  }

  res.json({ message: "Game starting", gameId: game.id });

  // Run the game in the background
  startStartupGame(
    game.id,
    (g, turn) => {
      broadcastStartupEvent(g.id, { type: "startup_turn_start", gameId: g.id, turn });
    },
    (g, turnLog) => {
      broadcastStartupEvent(g.id, { type: "startup_turn_complete", gameId: g.id, turn: turnLog.turn, turnLog, game: g });
    },
    (g) => {
      broadcastStartupEvent(g.id, {
        type: "startup_game_over",
        gameId: g.id,
        winner: g.winner!,
        winCondition: g.winCondition!,
        game: g,
      });
      // Send narrative if available
      if (g.narrative) {
        broadcastStartupEvent(g.id, {
          type: "startup_narrative",
          gameId: g.id,
          narrative: g.narrative,
        });
      }
      // Close all spectator SSE connections after game over
      endAllStartupSSE(g.id);
    },
    (g, turn, marketEvent) => {
      broadcastStartupEvent(g.id, { type: "startup_market_event", gameId: g.id, turn, marketEvent });
    },
    (g, turn, agentId, turnAction) => {
      broadcastStartupEvent(g.id, { type: "startup_agent_action", gameId: g.id, turn, agentId, turnAction });
    }
  ).catch((err) => {
    logger.error("Startup game failed", { gameId: game.id, error: (err as Error).message });
  });
});

/** GET /api/startup/games/:id/relay — Relay SSE endpoint for remote OpenClaw */
startupRouter.get("/startup/games/:id/relay", requireDelegationQuery("submit_action"), (req, res) => {
  const gameId = req.params.id;
  const game = loadGame(gameId);

  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  // agentId is passed as query param to identify which slot this relay is for
  const agentId = req.query.agentId as string | undefined;
  const relayKey = agentId ? `${gameId}:${agentId}` : gameId;

  if (hasRelaySSE(relayKey)) {
    res.status(409).json({ error: { code: "ALREADY_CONNECTED", message: "A relay is already connected for this agent" } });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  setRelaySSE(relayKey, res);

  res.write(`event: relay_connected\ndata: ${JSON.stringify({ gameId, agentId, gameType: "startup" })}\n\n`);

  req.on("close", () => {
    removeRelaySSE(relayKey);
  });
});

/** POST /api/startup/games/:id/openclaw — OpenClaw relay response endpoint */
startupRouter.post("/startup/games/:id/openclaw", requireAuth, (req, res) => {
  const gameId = req.params.id;
  const game = loadGame(gameId);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
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

  const resolved = resolveStartupOpenClaw(gameId, requestId, error || null, text || "");
  res.json({ accepted: resolved });
});

/** DELETE /api/startup/games/:id — Delete a game (requires auth, must be creator, cannot be running) */
startupRouter.delete("/startup/games/:id", requireAuth, (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  if (game.creatorId && game.creatorId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Only the creator can delete this game" } });
    return;
  }

  if (game.status === "running") {
    res.status(409).json({ error: { code: "GAME_RUNNING", message: "Cannot delete a running game" } });
    return;
  }

  deleteGame(req.params.id);
  res.json({ message: "Game deleted" });
});
