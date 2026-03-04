import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { v4 as uuid } from "uuid";
import { evolvePersonality, buildPlatformObservation } from "./evolve.js";
import type { IncidentLogEntry } from "./evolve.js";

/**
 * Project root resolved from this file's location:
 *   src/ -> openclaw/ -> apps/ -> project root
 */
const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..");
const DEFAULT_PERSONALITY_PATH = resolve(PROJECT_ROOT, "personalities", "coordinator-default.md");

/**
 * Persistence directory — written next to this app so it stays inside the monorepo.
 * All agent and platform data is stored here across restarts.
 */
const DATA_DIR = resolve(import.meta.dirname, "..", "data");
const AGENTS_FILE = resolve(DATA_DIR, "agents.json");
const PLATFORM_FILE = resolve(DATA_DIR, "platform.json");

export interface Agent {
  id: string;
  name: string;
  personality: string;
  createdAt: number;
  /** Session outcomes appended over time, newest last. */
  sessionHistory: SessionOutcome[];
}

export interface SessionOutcome {
  sessionId: string;
  scenario: string;
  endingKey: string;
  summary: string;
  incidentLog: IncidentLogEntry[];
  recordedAt: number;
}

/** In-memory agent store. Keyed by agent ID. */
export const agents = new Map<string, Agent>();

/**
 * OpenClaw's own accumulated memories — observations across all agents and sessions.
 * Persisted to disk so they survive restarts.
 */
export const platformMemories: string[] = [];

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Writes the current agent store and platform memories to disk.
 * Called after every mutation. Errors are logged but do not throw —
 * an in-memory state that fails to persist is better than a crashed server.
 */
async function persist(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const agentsData = Array.from(agents.values());
    await Promise.all([
      writeFile(AGENTS_FILE, JSON.stringify(agentsData, null, 2), "utf-8"),
      writeFile(PLATFORM_FILE, JSON.stringify({ memories: platformMemories }, null, 2), "utf-8"),
    ]);
  } catch (err) {
    console.error("[openclaw] Failed to persist data to disk:", (err as Error).message);
  }
}

/**
 * Loads agents and platform memories from disk on startup.
 * If no data files exist yet, starts with an empty store (first run).
 */
export async function loadPersistedData(): Promise<void> {
  try {
    const raw = await readFile(AGENTS_FILE, "utf-8");
    const agentsData: Agent[] = JSON.parse(raw);
    for (const agent of agentsData) {
      agents.set(agent.id, agent);
    }
    console.log(`[openclaw] Loaded ${agents.size} agent(s) from disk`);
  } catch {
    // No agents file yet — first run
  }

  try {
    const raw = await readFile(PLATFORM_FILE, "utf-8");
    const platformData: { memories: string[] } = JSON.parse(raw);
    platformMemories.push(...platformData.memories);
    console.log(`[openclaw] Loaded ${platformMemories.length} platform memory entries from disk`);
  } catch {
    // No platform file yet — first run
  }
}

// ---------------------------------------------------------------------------
// Agent operations
// ---------------------------------------------------------------------------

/**
 * Loads the default coordinator personality from the local markdown file.
 * Used to seed new agents when no custom personality is provided.
 */
export async function loadDefaultPersonality(): Promise<string> {
  return readFile(DEFAULT_PERSONALITY_PATH, "utf-8");
}

/**
 * Seeds a default agent if none exists yet.
 * On subsequent startups, the persisted version is loaded instead.
 * Returns the agent ID.
 */
export async function seedDefaultAgent(): Promise<string> {
  // Already loaded from disk — no need to re-seed
  if (agents.has("agent-default")) {
    console.log("[openclaw] Default agent already exists (loaded from disk)");
    return "agent-default";
  }

  const personality = await loadDefaultPersonality();
  const agent: Agent = {
    id: "agent-default",
    name: "The Coordinator (Default)",
    personality,
    createdAt: Date.now(),
    sessionHistory: [],
  };
  agents.set(agent.id, agent);
  await persist();
  return agent.id;
}

/**
 * Creates a new agent with the given name and optional personality text.
 * Falls back to coordinator-default.md if no personality is supplied.
 */
export async function createAgent(name: string, personality?: string): Promise<Agent> {
  const resolvedPersonality = personality ?? await loadDefaultPersonality();
  const agent: Agent = {
    id: uuid(),
    name,
    personality: resolvedPersonality,
    createdAt: Date.now(),
    sessionHistory: [],
  };
  agents.set(agent.id, agent);
  await persist();
  return agent;
}

/**
 * Returns an agent by ID, or undefined if not found.
 */
export function getAgent(agentId: string): Agent | undefined {
  return agents.get(agentId);
}

/**
 * Records a completed session outcome against an agent, then triggers
 * personality evolution asynchronously.
 *
 * Evolution is fire-and-forget — the HTTP response returns immediately
 * while Gemini rewrites the personality in the background. The next
 * session will see the evolved personality.
 *
 * Also appends an observation to OpenClaw's platform memory so future
 * evolution calls can draw on patterns across all agents.
 */
export function recordSessionOutcome(
  agentId: string,
  outcome: Omit<SessionOutcome, "recordedAt">,
): void {
  const agent = agents.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const fullOutcome: SessionOutcome = { ...outcome, recordedAt: Date.now() };
  agent.sessionHistory.push(fullOutcome);

  // Add to OpenClaw's own platform memory
  const observation = buildPlatformObservation(agent.name, outcome);
  platformMemories.push(observation);

  // Persist the new session history and platform memory immediately,
  // before evolution completes — so the record survives even if evolution fails
  persist().catch((err) => {
    console.error("[openclaw] Failed to persist after session record:", err.message);
  });

  // Trigger personality evolution in the background — do not await
  triggerEvolution(agent, fullOutcome).catch((err) => {
    console.error(`[openclaw] Personality evolution failed for agent ${agentId}:`, err.message);
  });
}

/**
 * Calls Gemini to evolve the agent's personality, then updates it in the store
 * and persists to disk.
 * Runs asynchronously — callers should not await this directly.
 */
async function triggerEvolution(agent: Agent, outcome: SessionOutcome): Promise<void> {
  console.log(`[openclaw] Evolving personality for agent "${agent.name}" (${agent.id})...`);

  const updatedPersonality = await evolvePersonality({
    agentName: agent.name,
    currentPersonality: agent.personality,
    sessionOutcome: {
      sessionId: outcome.sessionId,
      scenario: outcome.scenario,
      endingKey: outcome.endingKey,
      summary: outcome.summary,
      incidentLog: outcome.incidentLog,
    },
    platformMemories: [...platformMemories],
  });

  agent.personality = updatedPersonality;

  // Persist the evolved personality
  await persist();

  console.log(
    `[openclaw] Personality evolved and saved for agent "${agent.name}" — ` +
    `${updatedPersonality.length} chars, session ${agent.sessionHistory.length} total, ` +
    `${platformMemories.length} platform observations`,
  );
}
