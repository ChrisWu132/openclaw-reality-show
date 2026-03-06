import { Router } from "express";
import { createStartupGame, startStartupGame } from "../engine/startup-engine.js";
import { loadGame, listGames, deleteGame } from "../engine/startup-store.js";
import { broadcastStartupEvent, addStartupSSE, removeStartupSSE, endAllStartupSSE } from "../sse/sse-connections.js";
import { requireAuth, requireAuthQuery } from "../auth/middleware.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:startup");
export const startupRouter = Router();

/** POST /api/startup/games — Create a new startup game (requires auth) */
startupRouter.post("/startup/games", requireAuth, async (req, res) => {
  const { agents } = req.body as {
    agents?: { agentId: string; agentName: string }[];
  };

  if (!agents || !Array.isArray(agents) || agents.length < 2 || agents.length > 4) {
    res.status(400).json({ error: { code: "INVALID_AGENTS", message: "Provide 2-4 agents with agentId and agentName" } });
    return;
  }

  try {
    const game = createStartupGame(agents);
    // Store creatorId in the game object for ownership checks
    (game as any).creatorId = req.userId;
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

  if (process.env.AUTH_REQUIRED === "true" && (game as any).creatorId && (game as any).creatorId !== req.userId) {
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
      // Close all spectator SSE connections after game over
      endAllStartupSSE(g.id);
    }
  ).catch((err) => {
    logger.error("Startup game failed", { gameId: game.id, error: (err as Error).message });
  });
});

/** DELETE /api/startup/games/:id — Delete a finished game (requires auth, must be creator) */
startupRouter.delete("/startup/games/:id", requireAuth, (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }

  if (process.env.AUTH_REQUIRED === "true" && (game as any).creatorId && (game as any).creatorId !== req.userId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Only the creator can delete this game" } });
    return;
  }

  deleteGame(req.params.id);
  res.json({ message: "Game deleted" });
});
