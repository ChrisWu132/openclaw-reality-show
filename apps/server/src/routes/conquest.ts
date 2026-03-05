import { Router } from "express";
import type { MapTemplate } from "@openclaw/shared";
import { createConquestGame, startConquestGame } from "../engine/conquest-engine.js";
import { loadGame, listGames, deleteGame } from "../engine/conquest-store.js";
import { loadPersonalityFromOpenClaw } from "../loaders/personality-loader.js";
import { broadcastConquestEvent } from "../ws/ws-server.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:conquest");
export const conquestRouter = Router();

/** POST /api/conquest/games — Create a new conquest game */
conquestRouter.post("/conquest/games", async (req, res) => {
  const { mapTemplate, agents } = req.body as {
    mapTemplate?: MapTemplate;
    agents?: { agentId: string; agentName: string }[];
  };

  if (!mapTemplate || !["hex19", "hex37"].includes(mapTemplate)) {
    res.status(400).json({ error: { code: "INVALID_MAP", message: 'mapTemplate must be "hex19" or "hex37"' } });
    return;
  }

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
    const game = createConquestGame(mapTemplate, agents);
    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ error: { code: "CREATION_FAILED", message: (err as Error).message } });
  }
});

/** GET /api/conquest/games — List all games */
conquestRouter.get("/conquest/games", (_req, res) => {
  const games = listGames();
  res.json(games);
});

/** GET /api/conquest/games/:id — Get full game state */
conquestRouter.get("/conquest/games/:id", (req, res) => {
  const game = loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }
  res.json(game);
});

/** POST /api/conquest/games/:id/start — Start a lobby game */
conquestRouter.post("/conquest/games/:id/start", async (req, res) => {
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
  startConquestGame(
    game.id,
    (g, turn) => {
      broadcastConquestEvent(g.id, { type: "conquest_turn_start", gameId: g.id, turn });
    },
    (g, turnLog) => {
      broadcastConquestEvent(g.id, { type: "conquest_turn_complete", gameId: g.id, turn: turnLog.turn, turnLog, game: g });
    },
    (g) => {
      broadcastConquestEvent(g.id, {
        type: "conquest_game_over",
        gameId: g.id,
        winner: g.winner!,
        winCondition: g.winCondition!,
        game: g,
      });
      postConquestToOpenClaw(g).catch((err) => {
        logger.warn("Failed to post conquest outcome to OpenClaw", { error: (err as Error).message });
      });
    }
  ).catch((err) => {
    logger.error("Conquest game failed", { gameId: game.id, error: (err as Error).message });
  });
});

/** DELETE /api/conquest/games/:id — Delete a finished game */
conquestRouter.delete("/conquest/games/:id", (req, res) => {
  const deleted = deleteGame(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game not found" } });
    return;
  }
  res.json({ message: "Game deleted" });
});

/** Post conquest outcomes to OpenClaw (fire-and-forget). */
async function postConquestToOpenClaw(game: import("@openclaw/shared").ConquestGame): Promise<void> {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  if (!apiUrl) return;

  for (const agent of game.agents) {
    const won = agent.agentId === game.winner;
    const owned = game.territories.filter((t) => t.owner === agent.agentId).length;

    const incidentLog = game.turnLog
      .flatMap((t) => t.actions.filter((a) => a.agentId === agent.agentId))
      .map((a) => `${a.action.type} ${a.success ? "✓" : "✗"}: ${a.result}`)
      .join("\n");

    try {
      await fetch(`${apiUrl}/agents/${agent.agentId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          scenario: "territory-conquest",
          outcome: won ? "victory" : agent.status === "eliminated" ? "eliminated" : "defeat",
          incidentLog,
          narrative: `${agent.agentName} ${won ? "won" : "lost"} a territory conquest game. Controlled ${owned}/${game.territories.length} territories. Win condition: ${game.winCondition}.`,
        }),
      });
    } catch {
      // fire and forget
    }
  }
}
