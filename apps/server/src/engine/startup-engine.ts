import type {
  StartupGame,
  StartupAgent,
  StartupAction,
  StartupActionType,
  StartupTurnLogEntry,
  StartupTurnAction,
  StartupWinCondition,
  MarketEvent,
  MarketEventType,
  ZoneId,
} from "@openclaw/shared";
import {
  MAX_TURNS,
  STARTING_CASH,
  STARTING_COMPUTE,
  STARTING_DATA,
  STARTING_MODEL,
  STARTING_USERS,
  VALUATION_THRESHOLD,
  ACQUISITION_RATIO,
  TURN_DELAY_MS,
  AGENT_COLORS,
} from "@openclaw/shared";
import { saveGame, loadGame } from "./startup-store.js";
import { getStartupAction } from "../ai/llm-client.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("startup-engine");

const runningGames = new Set<string>();

export function isGameRunning(gameId: string): boolean {
  return runningGames.has(gameId);
}

export function cancelStartupGame(gameId: string): void {
  runningGames.delete(gameId);
}

// ── Zone mapping ────────────────────────────────────────────────

const ACTION_ZONE: Record<StartupActionType, ZoneId> = {
  TRAIN: "research_lab",
  DEPLOY: "launch_pad",
  FUNDRAISE: "vc_office",
  ACQUIRE_COMPUTE: "gpu_farm",
  ACQUIRE_DATA: "data_lake",
  POACH: "talent_pool",
  OPEN_SOURCE: "open_source",
};

// ── Valuation ───────────────────────────────────────────────────

export function calcValuation(agent: StartupAgent): number {
  const { users, model, compute, data } = agent.resources;
  return users * (model / 10) * (1 + (compute + data) / 200);
}

function calcRevenue(agent: StartupAgent): number {
  const { users, model } = agent.resources;
  return users * (model / 50) * 0.1;
}

// ── Market Events ───────────────────────────────────────────────

const MARKET_EVENTS: { type: MarketEventType; weight: number; description: string }[] = [
  { type: "NONE", weight: 40, description: "Business as usual." },
  { type: "GPU_SHORTAGE", weight: 12, description: "Global GPU shortage — compute costs doubled this turn." },
  { type: "FUNDING_BOOM", weight: 12, description: "AI funding boom — fundraising yields 50% more." },
  { type: "REGULATION", weight: 12, description: "New AI regulation — deployment costs increased 50%." },
  { type: "VIRAL_TREND", weight: 12, description: "AI goes viral — deployments gain 2x users this turn." },
  { type: "DATA_BREACH", weight: 12, description: "Industry data breach — all agents lose 10 data quality." },
];

function rollMarketEvent(): MarketEvent {
  const totalWeight = MARKET_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of MARKET_EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return { type: event.type, description: event.description };
  }
  return { type: "NONE", description: "Business as usual." };
}

// ── Game Lifecycle ──────────────────────────────────────────────

export function createStartupGame(
  agentEntries: { agentId: string; agentName: string }[]
): StartupGame {
  if (agentEntries.length < 2 || agentEntries.length > 4) {
    throw new Error("AI Startup Arena requires 2-4 agents");
  }

  const id = crypto.randomUUID();
  const agents: StartupAgent[] = agentEntries.map((e, i) => ({
    agentId: e.agentId,
    agentName: e.agentName,
    color: AGENT_COLORS[i % AGENT_COLORS.length],
    status: "active",
    resources: {
      cash: STARTING_CASH,
      compute: STARTING_COMPUTE,
      data: STARTING_DATA,
      model: STARTING_MODEL,
      users: STARTING_USERS,
    },
    zone: "center" as ZoneId,
    zoneHistory: [],
    reputation: 0,
  }));

  const game: StartupGame = {
    id,
    status: "lobby",
    agents,
    currentTurn: 0,
    maxTurns: MAX_TURNS,
    turnLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveGame(game);
  logger.info("Startup game created", { gameId: id, agents: agents.length });
  return game;
}

export async function startStartupGame(
  gameId: string,
  onTurnStart?: (game: StartupGame, turn: number) => void,
  onTurnComplete?: (game: StartupGame, turnLog: StartupTurnLogEntry) => void,
  onGameOver?: (game: StartupGame) => void
): Promise<void> {
  let game = loadGame(gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);
  if (game.status !== "lobby") throw new Error(`Game ${gameId} is not in lobby state`);

  game.status = "running";
  saveGame(game);
  runningGames.add(gameId);

  logger.info("Startup game started", { gameId });

  try {
    while (game.currentTurn < MAX_TURNS && runningGames.has(gameId)) {
      game.currentTurn++;
      const turn = game.currentTurn;

      onTurnStart?.(game, turn);

      // Roll market event
      const marketEvent = rollMarketEvent();

      // Apply global market event effects
      applyMarketEventPre(game, marketEvent);

      // Get actions from all active agents in parallel
      const activeAgents = game.agents.filter((a) => a.status === "active");
      const actionResults = await Promise.all(
        activeAgents.map(async (agent): Promise<{ agentId: string; action: StartupAction }> => {
          try {
            const action = await getStartupAction(game!, agent.agentId, turn, marketEvent);
            return { agentId: agent.agentId, action };
          } catch (err) {
            logger.error("AI action failed, defaulting to TRAIN", {
              agentId: agent.agentId,
              error: (err as Error).message,
            });
            return {
              agentId: agent.agentId,
              action: { type: "TRAIN", targetAgentId: null, reasoning: "[System fallback]" },
            };
          }
        })
      );

      // Resolve turn
      const turnLog = resolveTurn(game, actionResults, marketEvent);

      // Apply revenue
      for (const agent of game.agents) {
        if (agent.status !== "active") continue;
        const revenue = calcRevenue(agent);
        agent.resources.cash += revenue;
      }

      // Check eliminations (bankrupt)
      const eliminated = checkEliminations(game, turn);
      turnLog.eliminations = eliminated;

      // Check acquisitions
      const acquisitions = checkAcquisitions(game, turn);
      turnLog.acquisitions = acquisitions;

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
        logger.info("Startup game finished", { gameId, winner: winResult.winner, condition: winResult.condition });
        break;
      }

      await delay(TURN_DELAY_MS);
    }

    // Turn limit reached without winner
    if (game.status === "running" && game.currentTurn >= MAX_TURNS) {
      const winner = findValuationLeader(game);
      game.winner = winner;
      game.winCondition = "turn_limit";
      game.status = "finished";
      saveGame(game);
      onGameOver?.(game);
      logger.info("Startup game hit turn limit", { gameId, winner });
    }
  } finally {
    runningGames.delete(gameId);
  }
}

// ── Market Event Pre-effects ────────────────────────────────────

function applyMarketEventPre(game: StartupGame, event: MarketEvent): void {
  if (event.type === "DATA_BREACH") {
    for (const agent of game.agents) {
      if (agent.status === "active") {
        agent.resources.data = Math.max(0, agent.resources.data - 10);
      }
    }
  }
}

// ── Turn Resolution ─────────────────────────────────────────────

/** Resolution order: ACQUIRE_COMPUTE, ACQUIRE_DATA, TRAIN, DEPLOY, FUNDRAISE, POACH, OPEN_SOURCE */
const RESOLUTION_ORDER: StartupActionType[] = [
  "ACQUIRE_COMPUTE",
  "ACQUIRE_DATA",
  "TRAIN",
  "DEPLOY",
  "FUNDRAISE",
  "POACH",
  "OPEN_SOURCE",
];

function resolveTurn(
  game: StartupGame,
  agentActions: { agentId: string; action: StartupAction }[],
  marketEvent: MarketEvent
): StartupTurnLogEntry {
  const turnActions: StartupTurnAction[] = [];

  // Group by action type
  const byType = new Map<StartupActionType, { agentId: string; action: StartupAction }[]>();
  for (const aa of agentActions) {
    const list = byType.get(aa.action.type) || [];
    list.push(aa);
    byType.set(aa.action.type, list);
  }

  // Resolve in order
  for (const actionType of RESOLUTION_ORDER) {
    const actions = byType.get(actionType) || [];
    for (const { agentId, action } of actions) {
      const agent = game.agents.find((a) => a.agentId === agentId);
      if (!agent || agent.status !== "active") continue;

      const result = resolveAction(game, agent, action, marketEvent);

      // Move agent to zone
      agent.zoneHistory.push(agent.zone);
      if (agent.zoneHistory.length > 5) agent.zoneHistory.shift();
      agent.zone = ACTION_ZONE[action.type];

      turnActions.push({
        agentId,
        action,
        success: result.success,
        result: result.result,
        valuationAfter: calcValuation(agent),
      });
    }
  }

  return {
    turn: game.currentTurn,
    marketEvent,
    actions: turnActions,
    eliminations: [],
    acquisitions: [],
    timestamp: Date.now(),
  };
}

function resolveAction(
  game: StartupGame,
  agent: StartupAgent,
  action: StartupAction,
  marketEvent: MarketEvent
): { success: boolean; result: string } {
  const r = agent.resources;

  switch (action.type) {
    case "ACQUIRE_COMPUTE": {
      const cost = marketEvent.type === "GPU_SHORTAGE" ? 100_000 : 50_000;
      if (r.cash < cost) return { success: false, result: `Not enough cash ($${r.cash} < $${cost})` };
      r.cash -= cost;
      const gain = 15 + Math.floor(Math.random() * 10);
      r.compute = Math.min(100, r.compute + gain);
      return { success: true, result: `Acquired +${gain} compute for $${cost}` };
    }

    case "ACQUIRE_DATA": {
      const cost = 40_000;
      if (r.cash < cost) return { success: false, result: `Not enough cash ($${r.cash} < $${cost})` };
      r.cash -= cost;
      const gain = 15 + Math.floor(Math.random() * 10);
      r.data = Math.min(100, r.data + gain);
      return { success: true, result: `Acquired +${gain} data for $${cost}` };
    }

    case "TRAIN": {
      const cost = 80_000;
      if (r.cash < cost) return { success: false, result: `Not enough cash ($${r.cash} < $${cost})` };
      r.cash -= cost;
      // model gain based on compute * data
      const effectiveness = (r.compute * r.data) / 2500; // 0-4 range
      const gain = Math.floor(5 + effectiveness * 10 + Math.random() * 5);
      r.model = Math.min(100, r.model + gain);
      return { success: true, result: `Trained model +${gain} (now ${r.model}). Compute=${r.compute}, Data=${r.data}` };
    }

    case "DEPLOY": {
      const baseCost = 60_000;
      const cost = marketEvent.type === "REGULATION" ? Math.floor(baseCost * 1.5) : baseCost;
      if (r.cash < cost) return { success: false, result: `Not enough cash ($${r.cash} < $${cost})` };
      if (r.compute < 5) return { success: false, result: `Not enough compute (${r.compute} < 5)` };
      r.cash -= cost;
      r.compute = Math.max(0, r.compute - 5);
      const baseUsers = Math.floor(r.model * 20 + Math.random() * 500);
      const userGain = marketEvent.type === "VIRAL_TREND" ? baseUsers * 2 : baseUsers;
      r.users += userGain;
      return { success: true, result: `Deployed product, gained ${userGain} users${marketEvent.type === "VIRAL_TREND" ? " (viral!)" : ""}` };
    }

    case "FUNDRAISE": {
      const valuation = calcValuation(agent);
      const baseRaise = Math.floor(valuation * 0.15 + 100_000);
      // Can fail if valuation is too low
      if (valuation < 1000 && r.users === 0) {
        return { success: false, result: "VCs not interested — no users, no valuation" };
      }
      const raise = marketEvent.type === "FUNDING_BOOM" ? Math.floor(baseRaise * 1.5) : baseRaise;
      r.cash += raise;
      return { success: true, result: `Raised $${raise}${marketEvent.type === "FUNDING_BOOM" ? " (boom!)" : ""}` };
    }

    case "POACH": {
      const cost = 120_000;
      if (r.cash < cost) return { success: false, result: `Not enough cash ($${r.cash} < $${cost})` };

      const target = game.agents.find(
        (a) => a.agentId === action.targetAgentId && a.status === "active"
      );
      if (!target) return { success: false, result: "Invalid or inactive target agent" };

      r.cash -= cost;
      // Steal model and compute from target
      const modelSteal = Math.min(target.resources.model, 10 + Math.floor(Math.random() * 8));
      const computeSteal = Math.min(target.resources.compute, 5 + Math.floor(Math.random() * 5));
      r.model = Math.min(100, r.model + modelSteal);
      r.compute = Math.min(100, r.compute + computeSteal);
      target.resources.model = Math.max(0, target.resources.model - modelSteal);
      target.resources.compute = Math.max(0, target.resources.compute - computeSteal);
      return {
        success: true,
        result: `Poached talent from ${target.agentName}: stole ${modelSteal} model, ${computeSteal} compute`,
      };
    }

    case "OPEN_SOURCE": {
      if (r.model < 10) return { success: false, result: "Model too weak to open-source (need >= 10)" };
      const modelLoss = Math.floor(r.model * 0.3);
      const userGain = Math.floor(r.model * 50 + Math.random() * 1000);
      r.model -= modelLoss;
      r.users += userGain;
      agent.reputation += 20;
      return {
        success: true,
        result: `Open-sourced model: -${modelLoss} model, +${userGain} users, +20 reputation`,
      };
    }
  }
}

// ── Elimination & Acquisition ───────────────────────────────────

function checkEliminations(game: StartupGame, turn: number): string[] {
  const eliminated: string[] = [];
  for (const agent of game.agents) {
    if (agent.status !== "active") continue;
    if (agent.resources.cash <= 0) {
      agent.status = "bankrupt";
      agent.eliminatedOnTurn = turn;
      eliminated.push(agent.agentId);
      logger.info("Agent bankrupt", { agentId: agent.agentId, turn });
    }
  }
  return eliminated;
}

function checkAcquisitions(game: StartupGame, turn: number): { acquirer: string; target: string }[] {
  const acquisitions: { acquirer: string; target: string }[] = [];
  const activeAgents = game.agents.filter((a) => a.status === "active");

  for (const acquirer of activeAgents) {
    const acquirerVal = calcValuation(acquirer);
    for (const target of activeAgents) {
      if (target.agentId === acquirer.agentId) continue;
      if (target.status !== "active") continue;
      const targetVal = calcValuation(target);
      if (targetVal > 0 && acquirerVal >= ACQUISITION_RATIO * targetVal) {
        target.status = "acquired";
        target.acquiredBy = acquirer.agentId;
        target.eliminatedOnTurn = turn;
        // Acquirer absorbs resources
        acquirer.resources.users += target.resources.users;
        acquirer.resources.compute += Math.floor(target.resources.compute * 0.5);
        acquirer.resources.data += Math.floor(target.resources.data * 0.5);
        acquisitions.push({ acquirer: acquirer.agentId, target: target.agentId });
        logger.info("Agent acquired", { acquirer: acquirer.agentId, target: target.agentId, turn });
      }
    }
  }
  return acquisitions;
}

// ── Win Detection ───────────────────────────────────────────────

function checkWinCondition(game: StartupGame): { winner: string; condition: StartupWinCondition } | null {
  const activeAgents = game.agents.filter((a) => a.status === "active");

  // Last standing
  if (activeAgents.length === 1) {
    return { winner: activeAgents[0].agentId, condition: "last_standing" };
  }
  if (activeAgents.length === 0) return null;

  // Valuation threshold
  for (const agent of activeAgents) {
    if (calcValuation(agent) >= VALUATION_THRESHOLD) {
      return { winner: agent.agentId, condition: "valuation_threshold" };
    }
  }

  return null;
}

function findValuationLeader(game: StartupGame): string {
  let leader = game.agents[0].agentId;
  let maxVal = 0;
  for (const agent of game.agents) {
    const val = calcValuation(agent);
    if (val > maxVal) {
      maxVal = val;
      leader = agent.agentId;
    }
  }
  return leader;
}
