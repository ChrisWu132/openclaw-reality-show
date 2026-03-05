import type { ConquestGame, HexCoord } from "@openclaw/shared";
import { getValidActions } from "../engine/conquest-engine.js";
import { hexKey } from "../data/hex-utils.js";

export function buildConquestSystemPrompt(personality?: string): string {
  const base = `You are an AI agent competing in a Territory Conquest game on a hex grid. Multiple agents compete to dominate the map. All territories start neutral (human-controlled). You must think strategically — expand to claim neutral land, fortify key positions, and attack enemies when advantageous.

## Rules
- Each turn you pick ONE action: EXPAND, ATTACK, FORTIFY, or HOLD
- EXPAND: claim an adjacent neutral territory (costs nothing, target becomes yours at strength 1)
- ATTACK: strike an adjacent enemy territory (your source must have strength >= 2). Combat uses terrain modifiers and randomness. Win → take territory at strength 1, source loses 1 strength. Lose → defender loses 1 strength.
- FORTIFY: +1 strength to a territory you own (max 5)
- HOLD: do nothing this turn

## Terrain Combat Modifiers
- Plains: 1.0x | Hills: 1.2x | Forest: 1.1x | Mountain: 1.4x | Swamp: 0.8x

## Win Conditions
- Control >= 60% of all territories (territorial majority)
- Be the last agent with territories (last standing)
- After 100 turns, most territories wins

## Strategy Tips
- Expand early to claim neutral territory before enemies do
- Fortify chokepoints (hills, mountains) for defense
- Attack when you have strength advantage
- Avoid attacking into mountains unless you're much stronger`;

  const personalityBlock = personality
    ? `\n\n## Your Personality\n${personality}`
    : "";

  const format = `

## RESPONSE FORMAT

Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.

{"type":"<EXPAND|ATTACK|FORTIFY|HOLD>","source":{"q":<number>,"r":<number>},"target":{"q":<number>,"r":<number>},"reasoning":"<your strategic thinking — why this action? 2+ sentences>"}

Rules:
- "type" must be one of: EXPAND, ATTACK, FORTIFY, HOLD
- "source" is your own territory performing the action (null for HOLD)
- "target" is the hex you're acting on (null for HOLD and FORTIFY; for FORTIFY, put the target in "source")
- "reasoning" must be at least 2 sentences
- ONLY output the JSON object, nothing else`;

  return base + personalityBlock + format;
}

export function buildConquestTurnMessage(game: ConquestGame, agentId: string, turn: number): string {
  const parts: string[] = [];
  const total = game.territories.length;

  parts.push(`## Turn ${turn} of ${game.territories.length > 19 ? 100 : 100}`);

  // Agent's own stats
  const myTerritories = game.territories.filter((t) => t.owner === agentId);
  const totalOwned = myTerritories.length;
  const totalStrength = myTerritories.reduce((s, t) => s + t.strength, 0);
  parts.push(`\nYou control ${totalOwned}/${total} territories (${(totalOwned / total * 100).toFixed(0)}%). Total strength: ${totalStrength}`);

  // Other agents
  parts.push("\n## Other Agents");
  for (const agent of game.agents) {
    if (agent.agentId === agentId) continue;
    if (agent.status === "eliminated") {
      parts.push(`- ${agent.agentName} (${agent.agentId.slice(0, 8)}): ELIMINATED`);
    } else {
      const count = game.territories.filter((t) => t.owner === agent.agentId).length;
      parts.push(`- ${agent.agentName} (${agent.agentId.slice(0, 8)}): ${count} territories`);
    }
  }

  // Map state (compact)
  parts.push("\n## Map State (your territories marked with *)");
  for (const t of game.territories) {
    const marker = t.owner === agentId ? "*" : "";
    const ownerLabel = t.owner === null ? "neutral" : t.owner === agentId ? "YOU" : t.owner.slice(0, 8);
    parts.push(`  (${t.coord.q},${t.coord.r}) ${t.terrain} str=${t.strength} owner=${ownerLabel}${marker}`);
  }

  // Valid actions
  const valid = getValidActions(game, agentId);
  parts.push("\n## Your Valid Actions");

  if (valid.expandTargets.length > 0) {
    const unique = dedup(valid.expandTargets);
    parts.push(`EXPAND targets (neutral, adjacent to you): ${unique.map(coordStr).join(", ")}`);
  }
  if (valid.attackTargets.length > 0) {
    const unique = dedup(valid.attackTargets);
    parts.push(`ATTACK targets (enemy, adjacent to your str>=2 hex): ${unique.map(coordStr).join(", ")}`);
  }
  if (valid.fortifyTargets.length > 0) {
    parts.push(`FORTIFY targets (your hexes below max strength): ${valid.fortifyTargets.map(coordStr).join(", ")}`);
  }
  parts.push("HOLD: always available");

  // Recent history (last 3 turns)
  if (game.turnLog.length > 0) {
    const recent = game.turnLog.slice(-3);
    parts.push("\n## Recent History");
    for (const entry of recent) {
      parts.push(`Turn ${entry.turn}:`);
      for (const a of entry.actions) {
        const agentName = game.agents.find((ag) => ag.agentId === a.agentId)?.agentName || a.agentId.slice(0, 8);
        parts.push(`  ${agentName}: ${a.action.type} ${a.success ? "✓" : "✗"} — ${a.result}`);
      }
    }
  }

  return parts.join("\n");
}

function coordStr(c: HexCoord): string {
  return `(${c.q},${c.r})`;
}

function dedup(coords: HexCoord[]): HexCoord[] {
  const seen = new Set<string>();
  return coords.filter((c) => {
    const k = hexKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
