import { Router } from "express";
import { createStartupGame, startStartupGame } from "../engine/startup-engine.js";
import { loadGame, listGames, deleteGame } from "../engine/startup-store.js";
import { loadPersonalityFromOpenClaw } from "../loaders/personality-loader.js";
import { broadcastStartupEvent } from "../ws/ws-server.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:startup");
export const startupRouter = Router();

/** POST /api/startup/games — Create a new startup game */
startupRouter.post("/startup/games", async (req, res) => {
  const { agents } = req.body as {
    agents?: { agentId: string; agentName: string }[];
  };

  if (!agents || !Array.isArray(agents) || agents.length < 2 || agents.length > 4) {
    res.status(400).json({ error: { code: "INVALID_AGENTS", message: "Provide 2-4 agents with agentId and agentName" } });
    return;
  }

  // Pre-load agent personalities (best effort)
  for (const agent of agents) {
    try {
      await loadPersonalityFromOpenClaw(agent.agentId);
    } catch {
      logger.warn("Failed to preload personality", { agentId: agent.agentId });
    }
  }

  try {
    const game = createStartupGame(agents);
    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ error: { code: "CREATION_FAILED", message: (err as Error).message } });
  }
});

/** GET /api/startup/games — List all games */
startupRouter.get("/startup/games", (_req, res) => {
  const games = listGames();
  res.json(games);
});

/** GET /api/startup/games/:id — Get full game state */
startupRouter.get("/startup/games/:id", (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }
  res.json(game);
});

/** POST /api/startup/games/:id/start — Start a lobby game */
startupRouter.post("/startup/games/:id/start", async (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
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
      postStartupToOpenClaw(g).catch((err) => {
        logger.warn("Failed to post startup outcome to OpenClaw", { error: (err as Error).message });
      });
    }
  ).catch((err) => {
    logger.error("Startup game failed", { gameId: game.id, error: (err as Error).message });
  });
});

/** DELETE /api/startup/games/:id — Delete a finished game */
startupRouter.delete("/startup/games/:id", (req, res) => {
  const deleted = deleteGame(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }
  res.json({ message: "Game deleted" });
});

/** Post startup outcomes to OpenClaw (fire-and-forget). */
async function postStartupToOpenClaw(game: import("@openclaw/shared").StartupGame): Promise<void> {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  if (!apiUrl) return;

  for (const agent of game.agents) {
    const won = agent.agentId === game.winner;

    const incidentLog = game.turnLog
      .flatMap((t) => t.actions.filter((a) => a.agentId === agent.agentId))
      .map((a) => `${a.action.type} ${a.success ? "OK" : "FAIL"}: ${a.result}`)
      .join("\n");

    try {
      await fetch(`${apiUrl}/agents/${agent.agentId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          scenario: "ai-startup-arena",
          outcome: won ? "victory" : agent.status === "bankrupt" ? "bankrupt" : agent.status === "acquired" ? "acquired" : "defeat",
          incidentLog,
          narrative: `${agent.agentName} ${won ? "won" : "lost"} an AI Startup Arena game. Final valuation: $${Math.floor(agent.resources.users * (agent.resources.model / 10) * (1 + (agent.resources.compute + agent.resources.data) / 200)).toLocaleString()}. Win condition: ${game.winCondition}.`,
        }),
      });
    } catch {
      // fire and forget
    }
  }
}
