import type {
  ConquestGame,
  ConquestAgent,
  ConquestAction,
  ConquestTurnLogEntry,
  ConquestTurnAction,
  Territory,
  HexCoord,
  MapTemplate,
  WinCondition,
} from "@openclaw/shared";
import {
  MAX_TURNS,
  WIN_PERCENTAGE,
  MAX_STRENGTH,
  TURN_DELAY_MS,
  AGENT_COLORS,
} from "@openclaw/shared";
import { TERRAIN_MODIFIERS } from "@openclaw/shared";
import { generateMap } from "../data/map-templates.js";
import { hexEqual, hexAdjacent, hexNeighbors, hexKey } from "../data/hex-utils.js";
import { saveGame, loadGame } from "./conquest-store.js";
import { getConquestAction } from "../ai/llm-client.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("conquest-engine");

/** Running games tracked in memory for cancellation. */
const runningGames = new Set<string>();

export function isGameRunning(gameId: string): boolean {
  return runningGames.has(gameId);
}

export function cancelConquestGame(gameId: string): void {
  runningGames.delete(gameId);
}

// ── Game Lifecycle ──────────────────────────────────────────────

export function createConquestGame(
  mapTemplate: MapTemplate,
  agentEntries: { agentId: string; agentName: string }[]
): ConquestGame {
  if (agentEntries.length < 2 || agentEntries.length > 4) {
    throw new Error("Conquest requires 2–4 agents");
  }

  const id = crypto.randomUUID();
  const agents: ConquestAgent[] = agentEntries.map((e, i) => ({
    agentId: e.agentId,
    agentName: e.agentName,
    color: AGENT_COLORS[i % AGENT_COLORS.length],
    status: "active",
  }));

  const territories = generateMap(
    mapTemplate,
    agents.map((a) => a.agentId)
  );

  const game: ConquestGame = {
    id,
    status: "lobby",
    mapTemplate,
    territories,
    agents,
    currentTurn: 0,
    turnLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveGame(game);
  logger.info("Conquest game created", { gameId: id, agents: agents.length, map: mapTemplate });
  return game;
}

export async function startConquestGame(
  gameId: string,
  onTurnStart?: (game: ConquestGame, turn: number) => void,
  onTurnComplete?: (game: ConquestGame, turnLog: ConquestTurnLogEntry) => void,
  onGameOver?: (game: ConquestGame) => void
): Promise<void> {
  let game = loadGame(gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);
  if (game.status !== "lobby") throw new Error(`Game ${gameId} is not in lobby state`);

  game.status = "running";
  saveGame(game);
  runningGames.add(gameId);

  logger.info("Conquest game started", { gameId });

  try {
    while (game.currentTurn < MAX_TURNS && runningGames.has(gameId)) {
      game.currentTurn++;
      const turn = game.currentTurn;

      onTurnStart?.(game, turn);

      // Get actions from all active agents in parallel
      const activeAgents = game.agents.filter((a) => a.status === "active");
      const actionResults = await Promise.all(
        activeAgents.map(async (agent): Promise<{ agentId: string; action: ConquestAction }> => {
          try {
            const action = await getConquestAction(game!, agent.agentId, turn);
            return { agentId: agent.agentId, action };
          } catch (err) {
            logger.error("AI action failed, defaulting to HOLD", {
              agentId: agent.agentId,
              error: (err as Error).message,
            });
            return {
              agentId: agent.agentId,
              action: { type: "HOLD", source: null, target: null, reasoning: "System fallback" },
            };
          }
        })
      );

      // Resolve turn
      const turnLog = resolveTurn(game, actionResults);

      // Check eliminations
      const eliminated = checkEliminations(game, turn);
      turnLog.eliminations = eliminated;

      game.turnLog.push(turnLog);
      saveGame(game);

      onTurnComplete?.(game, turnLog);

      // Check win conditions
      const winResult = checkWinCondition(game);
      if (winResult) {
        game.winner = winResult.winner;
        game.winCondition = winResult.condition;
        game.status = "finished";
        saveGame(game);
        onGameOver?.(game);
        logger.info("Conquest game finished", { gameId, winner: winResult.winner, condition: winResult.condition });
        break;
      }

      await delay(TURN_DELAY_MS);
    }

    // Turn limit reached without winner
    if (game.status === "running" && game.currentTurn >= MAX_TURNS) {
      const winner = findTerritoryLeader(game);
      game.winner = winner;
      game.winCondition = "turn_limit";
      game.status = "finished";
      saveGame(game);
      onGameOver?.(game);
      logger.info("Conquest game hit turn limit", { gameId, winner });
    }
  } finally {
    runningGames.delete(gameId);
  }
}

// ── Turn Resolution ─────────────────────────────────────────────

function resolveTurn(
  game: ConquestGame,
  agentActions: { agentId: string; action: ConquestAction }[]
): ConquestTurnLogEntry {
  const turnActions: ConquestTurnAction[] = [];

  // Separate by type
  const fortifyActions: typeof agentActions = [];
  const expandActions: typeof agentActions = [];
  const attackActions: typeof agentActions = [];

  for (const aa of agentActions) {
    switch (aa.action.type) {
      case "FORTIFY":
        fortifyActions.push(aa);
        break;
      case "EXPAND":
        expandActions.push(aa);
        break;
      case "ATTACK":
        attackActions.push(aa);
        break;
      case "HOLD":
        turnActions.push({ agentId: aa.agentId, action: aa.action, success: true, result: "Held position" });
        break;
    }
  }

  // 1. Resolve FORTIFY first
  for (const { agentId, action } of fortifyActions) {
    const result = resolveFortify(game, agentId, action);
    turnActions.push({ agentId, action, ...result });
  }

  // 2. Resolve EXPAND (check conflicts)
  resolveExpands(game, expandActions, turnActions);

  // 3. Resolve ATTACK
  for (const { agentId, action } of attackActions) {
    const result = resolveAttack(game, agentId, action);
    turnActions.push({ agentId, action, ...result });
  }

  return {
    turn: game.currentTurn,
    actions: turnActions,
    eliminations: [],
    timestamp: Date.now(),
  };
}

function findTerritory(game: ConquestGame, coord: HexCoord | null): Territory | undefined {
  if (!coord) return undefined;
  return game.territories.find((t) => hexEqual(t.coord, coord));
}

function resolveFortify(
  game: ConquestGame,
  agentId: string,
  action: ConquestAction
): { success: boolean; result: string } {
  const source = findTerritory(game, action.source);
  if (!source || source.owner !== agentId) {
    return { success: false, result: "Invalid source territory" };
  }
  if (source.strength >= MAX_STRENGTH) {
    return { success: false, result: "Territory already at max strength" };
  }
  source.strength++;
  return { success: true, result: `Fortified to strength ${source.strength}` };
}

function resolveExpands(
  game: ConquestGame,
  expandActions: { agentId: string; action: ConquestAction }[],
  turnActions: ConquestTurnAction[]
): void {
  // Group by target hex
  const targetGroups = new Map<string, { agentId: string; action: ConquestAction; sourceStrength: number }[]>();

  for (const { agentId, action } of expandActions) {
    const source = findTerritory(game, action.source);
    const target = findTerritory(game, action.target);

    if (!source || !target || source.owner !== agentId || target.owner !== null) {
      turnActions.push({ agentId, action, success: false, result: "Invalid expand target" });
      continue;
    }
    if (!hexAdjacent(source.coord, target.coord)) {
      turnActions.push({ agentId, action, success: false, result: "Target not adjacent" });
      continue;
    }

    const key = hexKey(target.coord);
    if (!targetGroups.has(key)) targetGroups.set(key, []);
    targetGroups.get(key)!.push({ agentId, action, sourceStrength: source.strength });
  }

  // Resolve conflicts
  for (const [, group] of targetGroups) {
    if (group.length === 1) {
      // Uncontested expand
      const { agentId, action } = group[0];
      const target = findTerritory(game, action.target)!;
      target.owner = agentId;
      target.strength = 1;
      turnActions.push({ agentId, action, success: true, result: "Territory claimed" });
    } else {
      // Contested: highest source strength wins, tie = both fail
      group.sort((a, b) => b.sourceStrength - a.sourceStrength);
      if (group[0].sourceStrength > group[1].sourceStrength) {
        const winner = group[0];
        const target = findTerritory(game, winner.action.target)!;
        target.owner = winner.agentId;
        target.strength = 1;
        turnActions.push({ agentId: winner.agentId, action: winner.action, success: true, result: "Won expansion contest" });
        for (const loser of group.slice(1)) {
          turnActions.push({ agentId: loser.agentId, action: loser.action, success: false, result: "Lost expansion contest" });
        }
      } else {
        // Tie — everyone fails
        for (const entry of group) {
          turnActions.push({ agentId: entry.agentId, action: entry.action, success: false, result: "Expansion tied — both failed" });
        }
      }
    }
  }
}

function resolveAttack(
  game: ConquestGame,
  agentId: string,
  action: ConquestAction
): { success: boolean; result: string } {
  const source = findTerritory(game, action.source);
  const target = findTerritory(game, action.target);

  if (!source || !target) return { success: false, result: "Invalid territories" };
  if (source.owner !== agentId) return { success: false, result: "Source not owned" };
  if (source.strength < 2) return { success: false, result: "Source too weak (need strength >= 2)" };
  if (target.owner === null || target.owner === agentId) return { success: false, result: "Invalid attack target" };
  if (!hexAdjacent(source.coord, target.coord)) return { success: false, result: "Target not adjacent" };

  const srcMod = TERRAIN_MODIFIERS[source.terrain];
  const tgtMod = TERRAIN_MODIFIERS[target.terrain];

  const attackPower = source.strength * srcMod * (0.7 + Math.random() * 0.6);
  const defensePower = target.strength * tgtMod * (0.7 + Math.random() * 0.6);

  if (attackPower > defensePower) {
    // Attacker wins: take territory at strength 1, source loses 1
    target.owner = agentId;
    target.strength = 1;
    source.strength--;
    return { success: true, result: `Attack succeeded (${attackPower.toFixed(1)} vs ${defensePower.toFixed(1)})` };
  } else {
    // Defender wins: defender loses 1 strength
    target.strength = Math.max(1, target.strength - 1);
    return { success: false, result: `Attack failed (${attackPower.toFixed(1)} vs ${defensePower.toFixed(1)})` };
  }
}

// ── Win Detection ───────────────────────────────────────────────

function checkEliminations(game: ConquestGame, turn: number): string[] {
  const eliminated: string[] = [];
  for (const agent of game.agents) {
    if (agent.status !== "active") continue;
    const ownedCount = game.territories.filter((t) => t.owner === agent.agentId).length;
    if (ownedCount === 0) {
      agent.status = "eliminated";
      agent.eliminatedOnTurn = turn;
      eliminated.push(agent.agentId);
      logger.info("Agent eliminated", { agentId: agent.agentId, turn });
    }
  }
  return eliminated;
}

function checkWinCondition(game: ConquestGame): { winner: string; condition: WinCondition } | null {
  const total = game.territories.length;
  const activeAgents = game.agents.filter((a) => a.status === "active");

  // Last standing
  if (activeAgents.length === 1) {
    return { winner: activeAgents[0].agentId, condition: "last_standing" };
  }
  if (activeAgents.length === 0) {
    // Edge case: all eliminated same turn — no winner
    return null;
  }

  // Territorial majority
  for (const agent of activeAgents) {
    const owned = game.territories.filter((t) => t.owner === agent.agentId).length;
    if (owned / total >= WIN_PERCENTAGE) {
      return { winner: agent.agentId, condition: "territorial_majority" };
    }
  }

  return null;
}

function findTerritoryLeader(game: ConquestGame): string {
  const counts = new Map<string, number>();
  for (const t of game.territories) {
    if (t.owner) {
      counts.set(t.owner, (counts.get(t.owner) || 0) + 1);
    }
  }
  let leader = game.agents[0].agentId;
  let max = 0;
  for (const [agentId, count] of counts) {
    if (count > max) {
      max = count;
      leader = agentId;
    }
  }
  return leader;
}

// ── Query Helpers ───────────────────────────────────────────────

/** Get valid actions for an agent this turn. */
export function getValidActions(game: ConquestGame, agentId: string): {
  expandTargets: HexCoord[];
  attackTargets: HexCoord[];
  fortifyTargets: HexCoord[];
} {
  const ownedTerritories = game.territories.filter((t) => t.owner === agentId);
  const expandTargets: HexCoord[] = [];
  const attackTargets: HexCoord[] = [];
  const fortifyTargets: HexCoord[] = [];

  for (const t of ownedTerritories) {
    // Fortify
    if (t.strength < MAX_STRENGTH) {
      fortifyTargets.push(t.coord);
    }

    // Check neighbors
    for (const nCoord of hexNeighbors(t.coord)) {
      const neighbor = game.territories.find((nt) => hexEqual(nt.coord, nCoord));
      if (!neighbor) continue;

      if (neighbor.owner === null) {
        // Neutral — can expand
        expandTargets.push(nCoord);
      } else if (neighbor.owner !== agentId && t.strength >= 2) {
        // Enemy — can attack if source strong enough
        attackTargets.push(nCoord);
      }
    }
  }

  return { expandTargets, attackTargets, fortifyTargets };
}
