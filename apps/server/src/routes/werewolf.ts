import { Router } from "express";
import type { WerewolfAgentConfig } from "@openclaw/shared";
import { createWerewolfGame, startWerewolfGame, isWerewolfGameRunning } from "../engine/werewolf-engine.js";
import { loadWerewolfGame, listWerewolfGames, deleteWerewolfGame } from "../engine/werewolf-store.js";
import {
  broadcastWerewolfEvent,
  addWerewolfSSE,
  removeWerewolfSSE,
  endAllWerewolfSSE,
  setRelaySSE,
  removeRelaySSE,
  hasRelaySSE,
} from "../sse/sse-connections.js";
import { resolveWerewolfOpenClaw } from "../sse/openclaw-resolver.js";
import { requireAuth, requireAuthQuery, requireDelegationQuery } from "../auth/middleware.js";
import { registerJoinCode } from "./relay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:werewolf");
export const werewolfRouter = Router();

/** POST /api/werewolf/games — Create a new werewolf game */
werewolfRouter.post("/werewolf/games", requireAuth, async (req, res) => {
  const { agentConfigs } = req.body as { agentConfigs?: WerewolfAgentConfig[] };

  if (!agentConfigs || agentConfigs.length < 5 || agentConfigs.length > 7) {
    res.status(400).json({
      error: { code: "INVALID_AGENTS", message: "Provide 5-7 agents with agentId and agentName" },
    });
    return;
  }

  try {
    const game = createWerewolfGame(agentConfigs, req.userId);

    // Generate join codes for any openclaw agent slots
    if (game.agentConfigs) {
      for (const config of game.agentConfigs) {
        if (config.agentSource === "openclaw") {
          const code = registerJoinCode(game.id, "werewolf" as any, config.agentName, config.agentId);
          config.joinCode = code;
        }
      }
    }

    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ error: { code: "CREATION_FAILED", message: (err as Error).message } });
  }
});

/** GET /api/werewolf/games — List all werewolf games */
werewolfRouter.get("/werewolf/games", (_req, res) => {
  const games = listWerewolfGames();
  res.json(games);
});

/** GET /api/werewolf/games/:id — Get game state (HIDE alive player roles!) */
werewolfRouter.get("/werewolf/games/:id", (req, res) => {
  const game = loadWerewolfGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  // Hide roles of alive players for spectators
  const sanitized = {
    ...game,
    players: game.players.map((p) => ({
      ...p,
      role: p.status === "alive" && game.status === "running" ? ("unknown" as any) : p.role,
    })),
    // Hide night actions from spectators during running game
    rounds: game.rounds.map((r) => ({
      ...r,
      nightActions: game.status === "finished" ? r.nightActions : [],
    })),
  };

  res.json(sanitized);
});

/** GET /api/werewolf/games/:id/events — SSE endpoint */
werewolfRouter.get("/werewolf/games/:id/events", requireAuthQuery, (req, res) => {
  const gameId = req.params.id;
  const game = loadWerewolfGame(gameId);

  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  addWerewolfSSE(gameId, res);

  req.on("close", () => {
    removeWerewolfSSE(gameId, res);
  });
});

/** POST /api/werewolf/games/:id/start — Start the game */
werewolfRouter.post("/werewolf/games/:id/start", requireAuth, async (req, res) => {
  const game = loadWerewolfGame(req.params.id);
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
  startWerewolfGame(game.id, (event) => {
    broadcastWerewolfEvent(game.id, event);

    // Close all SSE connections after game over
    if (event.type === "werewolf_game_over" || event.type === "werewolf_narrative") {
      if (event.type === "werewolf_narrative") {
        // Wait a bit then close
        setTimeout(() => endAllWerewolfSSE(game.id), 1000);
      }
    }
  }).catch((err) => {
    logger.error("Werewolf game failed", { gameId: game.id, error: (err as Error).message });
  });
});

/** GET /api/werewolf/games/:id/relay — Relay SSE endpoint for remote OpenClaw */
werewolfRouter.get("/werewolf/games/:id/relay", requireDelegationQuery("submit_action"), (req, res) => {
  const gameId = req.params.id;
  const game = loadWerewolfGame(gameId);

  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  const agentId = req.query.agentId as string | undefined;
  const relayKey = agentId ? `werewolf:${gameId}:${agentId}` : `werewolf:${gameId}`;

  if (hasRelaySSE(relayKey)) {
    res.status(409).json({ error: { code: "ALREADY_CONNECTED", message: "A relay is already connected for this agent" } });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  setRelaySSE(relayKey, res);

  res.write(`event: relay_connected\ndata: ${JSON.stringify({ gameId, agentId, gameType: "werewolf" })}\n\n`);

  req.on("close", () => {
    removeRelaySSE(relayKey);
  });
});

/** POST /api/werewolf/games/:id/openclaw — OpenClaw relay response */
werewolfRouter.post("/werewolf/games/:id/openclaw", requireAuth, (req, res) => {
  const gameId = req.params.id;
  const game = loadWerewolfGame(gameId);
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

  const resolved = resolveWerewolfOpenClaw(gameId, requestId, error || null, text || "");
  res.json({ accepted: resolved });
});

/** DELETE /api/werewolf/games/:id — Delete a game */
werewolfRouter.delete("/werewolf/games/:id", requireAuth, (req, res) => {
  const game = loadWerewolfGame(req.params.id);
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

  deleteWerewolfGame(req.params.id);
  res.json({ message: "Game deleted" });
});
