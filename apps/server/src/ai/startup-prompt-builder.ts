import type { StartupGame, MarketEvent, DialogueStatement } from "@openclaw/shared";
import { calcValuation } from "../engine/startup-engine.js";

export function buildStartupSystemPrompt(personality?: string): string {
  const base = `You are an AI agent competing in an AI Startup Arena. You are the CEO of an AI company competing against other AI companies. Your goal: build the most valuable AI company.

## Resources
- Cash: Money in the bank. $0 = bankrupt (you're out).
- Compute: GPU/TPU capacity (0-100). Needed for training and deployment.
- Data: Training data quality (0-100). Better data = better training.
- Model: Your model's capability score (0-100). Core of your product.
- Users: Customer count. Drives revenue and valuation.

## Revenue (passive each turn)
revenue = users * (model / 50) * 0.1

## Valuation
valuation = users * (model / 10) * (1 + (compute + data) / 200)

## Actions (pick ONE per turn)
- TRAIN: Improve your model. Cost: $80,000. Gain depends on compute*data.
- DEPLOY: Launch product to get users. Cost: $60,000 + 5 compute. Users gained based on model quality.
- FUNDRAISE: Raise money from VCs. Amount based on your valuation. Can fail if you have no users and low valuation.
- ACQUIRE_COMPUTE: Buy GPU capacity. Cost: $50,000 (doubled during GPU_SHORTAGE). Gain: ~15-25 compute.
- ACQUIRE_DATA: Buy training data. Cost: $40,000. Gain: ~15-25 data.
- POACH: Steal talent from a competitor. Cost: $120,000. Steals ~10-18 model and ~5-10 compute from target.
- OPEN_SOURCE: Release your model as open source. Lose 30% model, gain massive users + reputation. Requires model >= 10.
- BETRAY: Betray an alliance partner. Steals 20% of ally's cash + 15 compute + 15 data. Requires active alliance. 5-turn cooldown on new alliances.

## Win Conditions
1. Reach $100M valuation
2. Your valuation >= 5x another agent's → you acquire them
3. All others go bankrupt (last standing)
4. After 20 turns, highest valuation wins

## Strategy Tips
- Build compute + data early, then TRAIN for a powerful model
- DEPLOY once your model is strong to get users (users drive revenue and valuation)
- FUNDRAISE when cash is low but you have decent valuation
- POACH to sabotage competitors who are ahead
- OPEN_SOURCE is high-risk, high-reward — sacrifice model quality for massive user growth
- Watch for market events — they change the economics each turn`;

  const personalityBlock = personality
    ? `\n\n## Your Personality\n${personality}`
    : "";

  const format = `

## RESPONSE FORMAT

Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.

{"type":"<TRAIN|DEPLOY|FUNDRAISE|ACQUIRE_COMPUTE|ACQUIRE_DATA|POACH|OPEN_SOURCE|BETRAY>","targetAgentId":"<agentId or null>","reasoning":"<your strategic thinking — why this action? 2+ sentences>"}

Rules:
- "type" must be one of the 8 actions listed above
- "targetAgentId" is REQUIRED for POACH (must be a valid active competitor's agentId), null for all other actions
- "reasoning" must be at least 2 sentences explaining your strategy
- ONLY output the JSON object, nothing else`;

  return base + personalityBlock + format;
}

export function buildStartupTurnMessage(
  game: StartupGame,
  agentId: string,
  turn: number,
  marketEvent: MarketEvent
): string {
  const parts: string[] = [];
  const agent = game.agents.find((a) => a.agentId === agentId)!;
  const r = agent.resources;
  const valuation = calcValuation(agent);

  parts.push(`## Quarter ${turn} of ${game.maxTurns}`);

  // Market event
  parts.push(`\n## Market Event This Turn`);
  parts.push(`${marketEvent.type}: ${marketEvent.description}`);

  // Your stats
  parts.push(`\n## Your Company`);
  parts.push(`Cash: $${r.cash.toLocaleString()}`);
  parts.push(`Compute: ${r.compute}/100`);
  parts.push(`Data: ${r.data}/100`);
  parts.push(`Model: ${r.model}/100`);
  parts.push(`Users: ${r.users.toLocaleString()}`);
  parts.push(`Valuation: $${Math.floor(valuation).toLocaleString()}`);
  parts.push(`Revenue/turn: $${Math.floor(r.users * (r.model / 50) * 0.1).toLocaleString()}`);
  parts.push(`Reputation: ${agent.reputation}`);

  // Competitors
  parts.push("\n## Competitors");
  for (const other of game.agents) {
    if (other.agentId === agentId) continue;
    if (other.status !== "active") {
      parts.push(`- ${other.agentName} (${other.agentId.slice(0, 8)}): ${other.status.toUpperCase()}`);
    } else {
      const otherVal = calcValuation(other);
      const or = other.resources;
      parts.push(
        `- ${other.agentName} (${other.agentId.slice(0, 8)}): Cash=$${or.cash.toLocaleString()}, Compute=${or.compute}, Data=${or.data}, Model=${or.model}, Users=${or.users.toLocaleString()}, Val=$${Math.floor(otherVal).toLocaleString()}`
      );
    }
  }

  // Alliances
  if (game.alliances && game.alliances.length > 0) {
    const activeAlliances = game.alliances.filter((a) => a.status === "active");
    if (activeAlliances.length > 0) {
      parts.push("\n## Active Alliances");
      for (const alliance of activeAlliances) {
        const a1 = game.agents.find((a) => a.agentId === alliance.agents[0])?.agentName || alliance.agents[0].slice(0, 8);
        const a2 = game.agents.find((a) => a.agentId === alliance.agents[1])?.agentName || alliance.agents[1].slice(0, 8);
        const youInvolved = alliance.agents.includes(agentId);
        parts.push(`- ${a1} + ${a2} (since Q${alliance.formedOnTurn})${youInvolved ? " [YOU ARE IN THIS ALLIANCE — you can BETRAY]" : ""}`);
      }
    }
  }

  // Recent history (last 3 turns)
  if (game.turnLog.length > 0) {
    const recent = game.turnLog.slice(-3);
    parts.push("\n## Recent History");
    for (const entry of recent) {
      parts.push(`Quarter ${entry.turn} [${entry.marketEvent.type}]:`);
      for (const a of entry.actions) {
        const name = game.agents.find((ag) => ag.agentId === a.agentId)?.agentName || a.agentId.slice(0, 8);
        parts.push(`  ${name}: ${a.action.type} ${a.success ? "OK" : "FAIL"} — ${a.result}`);
      }
    }
  }

  return parts.join("\n");
}

export function buildOpenClawStartupPrompt(
  game: StartupGame,
  agentId: string,
  turn: number,
  marketEvent: MarketEvent
): string {
  const systemPrompt = buildStartupSystemPrompt();
  const turnMessage = buildStartupTurnMessage(game, agentId, turn, marketEvent);
  return `${systemPrompt}\n\n---\n\n${turnMessage}`;
}

export function buildNarrativePrompt(game: StartupGame): string {
  const parts: string[] = [];
  parts.push("## AI Startup Arena — Game Summary");
  parts.push(`Game lasted ${game.currentTurn} quarters.`);
  parts.push(`Winner: ${game.agents.find((a) => a.agentId === game.winner)?.agentName || "None"}`);
  parts.push(`Win condition: ${game.winCondition || "unknown"}`);

  parts.push("\n## Final Standings");
  for (const agent of game.agents) {
    const val = calcValuation(agent);
    parts.push(`- ${agent.agentName}: Status=${agent.status}, Valuation=$${Math.floor(val).toLocaleString()}, Users=${agent.resources.users.toLocaleString()}, Model=${agent.resources.model}`);
    if (agent.eliminatedOnTurn) parts.push(`  Eliminated Q${agent.eliminatedOnTurn}`);
  }

  // Key moments
  parts.push("\n## Key Moments");
  for (const entry of game.turnLog) {
    const notable: string[] = [];
    for (const a of entry.actions) {
      if (a.action.type === "POACH" && a.success) notable.push(`${game.agents.find((ag) => ag.agentId === a.agentId)?.agentName} poached from ${game.agents.find((ag) => ag.agentId === a.action.targetAgentId)?.agentName}`);
      if (a.action.type === "OPEN_SOURCE" && a.success) notable.push(`${game.agents.find((ag) => ag.agentId === a.agentId)?.agentName} open-sourced their model`);
    }
    if (entry.eliminations.length > 0) notable.push(`Bankruptcies: ${entry.eliminations.map((id) => game.agents.find((a) => a.agentId === id)?.agentName).join(", ")}`);
    if (entry.acquisitions.length > 0) notable.push(`Acquisitions: ${entry.acquisitions.map((acq) => `${game.agents.find((a) => a.agentId === acq.acquirer)?.agentName} acquired ${game.agents.find((a) => a.agentId === acq.target)?.agentName}`).join(", ")}`);
    if (entry.marketEvent.type !== "NONE") notable.push(`Market: ${entry.marketEvent.description}`);
    if (notable.length > 0) {
      parts.push(`Q${entry.turn}: ${notable.join("; ")}`);
    }
  }

  parts.push("\nWrite a dramatic 3-5 paragraph narrative of this game. Include the strategic arcs, key turning points, and what made the winner succeed. Be vivid and engaging.");

  return parts.join("\n");
}

export function buildDialogueSystemPrompt(game: StartupGame, agentId: string, personality?: string): string {
  const agent = game.agents.find((a) => a.agentId === agentId)!;
  const r = agent.resources;
  const valuation = calcValuation(agent);

  const parts: string[] = [];
  parts.push(`You are ${agent.agentName}, CEO of an AI startup competing in the AI Startup Arena.`);
  parts.push(`You're at a quarterly board meeting with your competitors. Speak directly, in character.`);

  if (personality) {
    parts.push(`\n## Your Personality\n${personality}`);
  }

  parts.push(`\n## Your Company Status`);
  parts.push(`Cash: $${r.cash.toLocaleString()}, Compute: ${r.compute}, Data: ${r.data}, Model: ${r.model}, Users: ${r.users.toLocaleString()}`);
  parts.push(`Valuation: $${Math.floor(valuation).toLocaleString()}`);

  parts.push(`\n## Competitors`);
  for (const other of game.agents) {
    if (other.agentId === agentId) continue;
    if (other.status !== "active") {
      parts.push(`- ${other.agentName}: ${other.status.toUpperCase()}`);
    } else {
      const otherVal = calcValuation(other);
      parts.push(`- ${other.agentName} (${other.agentId.slice(0, 8)}): Val=$${Math.floor(otherVal).toLocaleString()}, Users=${other.resources.users.toLocaleString()}, Model=${other.resources.model}`);
    }
  }

  // Alliances
  if (game.alliances && game.alliances.length > 0) {
    const active = game.alliances.filter((a) => a.status === "active");
    if (active.length > 0) {
      parts.push(`\n## Alliances`);
      for (const alliance of active) {
        const a1 = game.agents.find((a) => a.agentId === alliance.agents[0])?.agentName || "?";
        const a2 = game.agents.find((a) => a.agentId === alliance.agents[1])?.agentName || "?";
        parts.push(`- ${a1} + ${a2}`);
      }
    }
  }

  // Recent turns
  if (game.turnLog.length > 0) {
    parts.push(`\n## Recent Actions (last 3 turns)`);
    for (const entry of game.turnLog.slice(-3)) {
      for (const a of entry.actions) {
        const name = game.agents.find((ag) => ag.agentId === a.agentId)?.agentName || a.agentId.slice(0, 8);
        parts.push(`  Q${entry.turn} ${name}: ${a.action.type} — ${a.result}`);
      }
    }
  }

  return parts.join("\n");
}

export function buildDialogueUserMessage(previousStatements: DialogueStatement[], game: StartupGame): string {
  const parts: string[] = [];

  if (previousStatements.length > 0) {
    parts.push("## What others said this meeting:");
    for (const s of previousStatements) {
      const name = game.agents.find((a) => a.agentId === s.speakerId)?.agentName || s.speakerId.slice(0, 8);
      const target = s.targetAgentId
        ? game.agents.find((a) => a.agentId === s.targetAgentId)?.agentName || "someone"
        : "everyone";
      parts.push(`${name} (to ${target}, ${s.tone}): "${s.text}"`);
    }
  }

  parts.push(`\nRespond with ONLY a JSON object:
{"targetAgentId":"<agentId or null>","text":"<your statement, max 2 sentences, reference specific events/threats>","tone":"<threatening|mocking|diplomatic|desperate|confident|accusatory>","proposedAlliance":"<agentId or null>"}`);

  return parts.join("\n");
}
