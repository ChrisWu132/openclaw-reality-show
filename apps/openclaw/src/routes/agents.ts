import { Router } from "express";
import { agents, createAgent, getAgent, recordSessionOutcome } from "../store.js";
import { synthesizePersonalityFromMemory } from "../synthesize.js";

export const agentsRouter = Router();

/**
 * Auth middleware — all agent routes require a valid Bearer token
 * matching the OPENCLAW_API_KEY environment variable.
 */
agentsRouter.use((req, res, next) => {
  const auth = req.headers.authorization;
  const expectedKey = process.env.OPENCLAW_API_KEY;

  if (!expectedKey) {
    // If no key is configured, auth is disabled (dev convenience).
    return next();
  }

  if (!auth || auth !== `Bearer ${expectedKey}`) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing API key." } });
    return;
  }

  next();
});

/**
 * POST /agents
 * Creates a new agent.
 *
 * Body: { name: string, personality?: string }
 * - name: display name for the agent
 * - personality: optional full personality text (markdown).
 *   Omit to use coordinator-default.md as the starting personality.
 *
 * Returns: { agentId, name, createdAt }
 */
agentsRouter.post("/agents", async (req, res) => {
  const { name, personality } = req.body as { name?: string; personality?: string };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: { code: "MISSING_NAME", message: "name is required." } });
    return;
  }

  const agent = await createAgent(name.trim(), personality);

  res.status(201).json({
    agentId: agent.id,
    name: agent.name,
    createdAt: agent.createdAt,
  });
});

/**
 * GET /agents/:agentId
 * Returns agent metadata (without full personality text).
 *
 * Returns: { agentId, name, createdAt, sessionCount }
 */
agentsRouter.get("/agents/:agentId", (req, res) => {
  const agent = getAgent(req.params.agentId);

  if (!agent) {
    res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent "${req.params.agentId}" not found.` } });
    return;
  }

  res.json({
    agentId: agent.id,
    name: agent.name,
    createdAt: agent.createdAt,
    sessionCount: agent.sessionHistory.length,
  });
});

/**
 * GET /agents/:agentId/personality
 * Returns the agent's current personality text.
 * This is the endpoint the reality show server calls when building a session's system prompt.
 *
 * Returns: { agentId, personality }
 */
agentsRouter.get("/agents/:agentId/personality", (req, res) => {
  const agent = getAgent(req.params.agentId);

  if (!agent) {
    res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent "${req.params.agentId}" not found.` } });
    return;
  }

  res.json({
    agentId: agent.id,
    personality: agent.personality,
  });
});

/**
 * POST /agents/:agentId/sessions
 * Records a completed session outcome against an agent.
 * Call this from the reality show server at session end.
 *
 * Body: { sessionId, scenario, endingKey, summary }
 * - sessionId: the reality show session ID
 * - scenario: e.g. "work-halls"
 * - endingKey: the outcome key (e.g. "escalated", "engaged", "warning_only")
 * - summary: human-readable description of what happened
 *
 * Returns: { recorded: true, sessionCount }
 */
agentsRouter.post("/agents/:agentId/sessions", (req, res) => {
  const agent = getAgent(req.params.agentId);

  if (!agent) {
    res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent "${req.params.agentId}" not found.` } });
    return;
  }

  const { sessionId, scenario, endingKey, summary, incidentLog } = req.body as {
    sessionId?: string;
    scenario?: string;
    endingKey?: string;
    summary?: string;
    incidentLog?: unknown[];
  };

  if (!sessionId || !scenario || !endingKey || !summary) {
    res.status(400).json({
      error: {
        code: "MISSING_FIELDS",
        message: "sessionId, scenario, endingKey, and summary are all required.",
      },
    });
    return;
  }

  recordSessionOutcome(agent.id, {
    sessionId,
    scenario,
    endingKey,
    summary,
    incidentLog: (incidentLog as any[]) ?? [],
  });

  res.json({ recorded: true, sessionCount: agent.sessionHistory.length });
});

/**
 * GET /agents/:agentId/memory
 * Returns a formatted summary of the agent's past sessions, suitable for
 * injection into the Coordinator's per-situation prompt context.
 *
 * Only the last 10 sessions are included to keep prompt size manageable.
 * Full incident logs are summarised — not dumped verbatim.
 *
 * Returns: { agentId, sessionCount, memory: string }
 */
agentsRouter.get("/agents/:agentId/memory", (req, res) => {
  const agent = getAgent(req.params.agentId);

  if (!agent) {
    res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent "${req.params.agentId}" not found.` } });
    return;
  }

  const history = agent.sessionHistory.slice(-10); // most recent 10

  if (history.length === 0) {
    res.json({ agentId: agent.id, sessionCount: 0, memory: "" });
    return;
  }

  const lines: string[] = ["## Cross-Session Memory", ""];
  lines.push("You have operated before. These are your prior cycles:");
  lines.push("");

  for (const [i, session] of history.entries()) {
    const date = new Date(session.recordedAt).toISOString().slice(0, 10);
    lines.push(`### Cycle ${i + 1} — ${session.scenario} (${date})`);
    lines.push(`Outcome: **${session.endingKey}**`);
    lines.push(`What happened: ${session.summary}`);
    if (session.incidentLog.length > 0) {
      lines.push("Decisions:");
      for (const entry of session.incidentLog) {
        const target = entry.target ? ` → ${entry.target}` : "";
        lines.push(`  - Situation ${entry.situation}: ${entry.action}${target}`);
      }
    }
    lines.push("");
  }

  lines.push("These past actions are part of who you are. They are immutable. They inform this cycle.");

  res.json({
    agentId: agent.id,
    sessionCount: agent.sessionHistory.length,
    memory: lines.join("\n"),
  });
});

/**
 * GET /agents
 * Lists all agents (metadata only, no personality text).
 *
 * Returns: { agents: [{ agentId, name, createdAt, sessionCount }] }
 */
agentsRouter.get("/agents", (_req, res) => {
  const list = Array.from(agents.values()).map((a) => ({
    agentId: a.id,
    name: a.name,
    createdAt: a.createdAt,
    sessionCount: a.sessionHistory.length,
  }));

  res.json({ agents: list });
});

/**
 * POST /agents/from-memory
 * Creates a new agent whose personality is synthesized from the local user's
 * Claude memory files (~/.claude/projects).
 *
 * This is the single-user / local-dev path. OpenClaw reads all available
 * Claude memory markdown files from disk and passes them to Gemini, which
 * translates the user's real patterns and values into a Coordinator personality.
 *
 * Body: { name?: string }
 * Returns: { agentId, name, createdAt, source: "claude-memory-local" }
 */
agentsRouter.post("/agents/from-memory", async (req, res) => {
  const { name } = req.body as { name?: string };
  const agentName = (name ?? "My OpenClaw").trim();

  console.log(`[openclaw] Synthesizing personality from local Claude memory for "${agentName}"...`);

  try {
    const personality = await synthesizePersonalityFromMemory();
    const agent = await createAgent(agentName, personality);

    console.log(`[openclaw] Agent created from Claude memory: ${agent.id}`);

    res.status(201).json({
      agentId: agent.id,
      name: agent.name,
      createdAt: agent.createdAt,
      source: "claude-memory-local",
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[openclaw] Failed to synthesize from memory:`, message);
    res.status(500).json({
      error: { code: "SYNTHESIS_FAILED", message },
    });
  }
});

/**
 * POST /agents/from-memory-text
 * Creates a new agent whose personality is synthesized from memory text
 * provided directly in the request body.
 *
 * This is the multi-user / remote path. Users paste or upload their Claude
 * memory content. OpenClaw synthesizes a personality from it without needing
 * access to their local filesystem.
 *
 * Body: { name?: string, memoryText: string }
 * Returns: { agentId, name, createdAt, source: "claude-memory-text" }
 */
agentsRouter.post("/agents/from-memory-text", async (req, res) => {
  const { name, memoryText } = req.body as { name?: string; memoryText?: string };

  if (!memoryText || typeof memoryText !== "string" || memoryText.trim() === "") {
    res.status(400).json({
      error: { code: "MISSING_MEMORY_TEXT", message: "memoryText is required." },
    });
    return;
  }

  const agentName = (name ?? "My OpenClaw").trim();

  console.log(`[openclaw] Synthesizing personality from provided memory text for "${agentName}"...`);

  try {
    const personality = await synthesizePersonalityFromMemory(memoryText);
    const agent = await createAgent(agentName, personality);

    console.log(`[openclaw] Agent created from memory text: ${agent.id}`);

    res.status(201).json({
      agentId: agent.id,
      name: agent.name,
      createdAt: agent.createdAt,
      source: "claude-memory-text",
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[openclaw] Failed to synthesize from memory text:`, message);
    res.status(500).json({
      error: { code: "SYNTHESIS_FAILED", message },
    });
  }
});
