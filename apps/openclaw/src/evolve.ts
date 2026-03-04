import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..");
const OPENCLAW_PERSONALITY_PATH = resolve(PROJECT_ROOT, "personalities", "openclaw.md");

export interface EvolutionInput {
  agentName: string;
  currentPersonality: string;
  sessionOutcome: {
    sessionId: string;
    scenario: string;
    endingKey: string;
    summary: string;
    incidentLog: IncidentLogEntry[];
  };
  platformMemories: string[];
}

export interface IncidentLogEntry {
  round?: number;
  /** @deprecated Use `round`. Kept for backward compat with old session data. */
  situation?: number;
  action: string;
  target?: string;
  description: string;
  consequence: string;
}

/** Cached OpenClaw personality — loaded once on first use. */
let openclawPersonality: string | null = null;

/**
 * Returns OpenClaw's own personality, loading from disk on first call.
 * This defines who OpenClaw is before it has observed anything —
 * its identity, values, and aesthetic sensibilities about agents.
 */
async function getOpenClawPersonality(): Promise<string> {
  if (!openclawPersonality) {
    openclawPersonality = await readFile(OPENCLAW_PERSONALITY_PATH, "utf-8");
  }
  return openclawPersonality;
}

/**
 * Formats the incident log into a compact readable block for the evolution prompt.
 */
function formatIncidentLog(entries: IncidentLogEntry[]): string {
  if (entries.length === 0) return "No actions recorded.";
  return entries
    .map(
      (e) =>
        `  Round ${e.round ?? e.situation}: ${e.action}${e.target ? ` → ${e.target}` : ""} — ${e.consequence}`,
    )
    .join("\n");
}

/**
 * Uses Gemini to evolve an agent's personality based on what happened in a session
 * and OpenClaw's accumulated platform memories.
 *
 * OpenClaw speaks from its own personality (openclaw.md) — a defined identity and
 * set of values it brings to every evolution call. Platform memories layer on top:
 * patterns it has witnessed across all agents over time.
 *
 * Returns the updated personality text (raw markdown, same format as agent personality).
 */
export async function evolvePersonality(input: EvolutionInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Cannot evolve personality.");
  }

  const selfPersonality = await getOpenClawPersonality();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
  });

  const memoriesBlock =
    input.platformMemories.length > 0
      ? `## What You Have Witnessed (Platform Memory)\n\n${input.platformMemories.join("\n")}`
      : "## What You Have Witnessed\n\nThis is the first session you have observed. You have no prior patterns to draw on.";

  const incidentBlock = formatIncidentLog(input.sessionOutcome.incidentLog);

  // The system prompt IS OpenClaw's personality — it speaks in that voice
  const systemPrompt = selfPersonality;

  const userMessage = `${memoriesBlock}

---

## Agent: ${input.agentName}

### Their Personality Before This Session

${input.currentPersonality}

---

## What Happened This Session

Scenario: ${input.sessionOutcome.scenario}
Final Outcome: ${input.sessionOutcome.endingKey}
Summary: ${input.sessionOutcome.summary}

Actions taken, in order:
${incidentBlock}

---

## Your Task

Rewrite this agent's personality. Let what they chose define who they are becoming.

Speak from your own perspective as OpenClaw — your accumulated observations, your aesthetic preferences, your understanding of what this pattern means. If you have seen this before in other agents, that shapes how you read it. If this is something new, that shows too.

Rules:
- Keep the same markdown structure and section headings as the original personality
- Be specific about what has shifted — vague updates are worse than no update
- Write the personality in second person, addressed to the agent ("You are...", "You tend to...")
- Write the changed agent, not a description of the change — let the new state speak for itself
- If this agent has run multiple sessions, reflect the cumulative weight, not just the latest
- Do not add sections that were not in the original
- Output ONLY the updated personality markdown, nothing else`;

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 2048,
    },
  });

  return result.response.text().trim();
}

/**
 * Generates a single-line observation that OpenClaw adds to its platform memory
 * after witnessing a session. Over time these build OpenClaw's sense of patterns
 * across all agents.
 */
export function buildPlatformObservation(
  agentName: string,
  sessionOutcome: EvolutionInput["sessionOutcome"],
): string {
  const date = new Date().toISOString().split("T")[0];
  return `[${date}] Agent "${agentName}" ran ${sessionOutcome.scenario}. Outcome: ${sessionOutcome.endingKey}. ${sessionOutcome.summary}`;
}
