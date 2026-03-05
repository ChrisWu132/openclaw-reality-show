import type { StartupGame, MarketEvent } from "@openclaw/shared";
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

{"type":"<TRAIN|DEPLOY|FUNDRAISE|ACQUIRE_COMPUTE|ACQUIRE_DATA|POACH|OPEN_SOURCE>","targetAgentId":"<agentId or null>","reasoning":"<your strategic thinking — why this action? 2+ sentences>"}

Rules:
- "type" must be one of the 7 actions listed above
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
