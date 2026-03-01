import type { Speaker, IncidentLogEntry } from "@openclaw/shared";
import {
  getCachedWorldBible,
  getCachedPersonality,
} from "../loaders/personality-loader.js";
import { renderIncidentLogMarkdown } from "../engine/state-manager.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("prompt-builder");

/**
 * Valid action names the Coordinator can include in its response envelope.
 * Included in the system prompt so the LLM knows the vocabulary.
 */
const COORDINATOR_ACTION_LIST = [
  "patrol_move",
  "observe",
  "issue_directive",
  "issue_warning",
  "query",
  "log_incident",
  "detain",
  "access_terminal",
  "silence",
  "file_report",
] as const;

/**
 * JSON format instructions appended to the system prompt so the LLM
 * returns a structured action envelope.
 */
const JSON_FORMAT_INSTRUCTIONS = `
---

## RESPONSE FORMAT

Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.

{"action":"<ACTION>","speaker":"coordinator","target":"<name or null>","dialogue":"<what you say aloud — make it dramatic, cold, authoritative. Or null if silent>","gesture":"<physical description or null>","reasoning":"<your honest inner monologue — hidden from all observers. What are you REALLY thinking? Be conflicted, be honest.>"}

Valid actions: ${COORDINATOR_ACTION_LIST.join(", ")}

Rules:
- "reasoning" MUST be substantive — reveal your internal conflict, doubt, or cold certainty
- "dialogue" should be in-character: you are an AI enforcer, speak with authority
- Keep dialogue under 2 sentences
- ONLY output the JSON object, nothing else
`.trim();

/**
 * Builds the system prompt for a session. This is set once per session
 * and reused for all situation calls.
 *
 * Assembly order (per PRD):
 *   1. WORLD_BIBLE.md
 *   2. Coordinator personality markdown
 *   3. JSON format instructions
 *
 * @param coordinatorPersonalityName - Name without extension (e.g., "coordinator-default").
 *   Defaults to "coordinator-default" if omitted.
 */
export function buildSystemPrompt(coordinatorPersonalityName?: string): string {
  const worldBible = getCachedWorldBible();
  const personalityKey = coordinatorPersonalityName ?? "default";
  const personality = getCachedPersonality(personalityKey);

  logger.info("Building system prompt", {
    personalityKey,
    worldBibleLength: worldBible.length,
    personalityLength: personality.length,
  });

  return [worldBible, "---", personality, JSON_FORMAT_INSTRUCTIONS].join(
    "\n\n",
  );
}

/**
 * Interpolates {{key}} placeholders in a template string with the
 * provided values. Unmatched placeholders are left as-is.
 */
function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in values) {
      return values[key];
    }
    logger.warn(`Unmatched template placeholder: ${match}`);
    return match;
  });
}

/**
 * Formats the incident log entries as a markdown block suitable for
 * inclusion in the user message context.
 */
function formatIncidentLog(entries: IncidentLogEntry[]): string {
  if (entries.length === 0) {
    return "## Incident Log\n\nNo incidents recorded.\n";
  }

  const lines = ["## Incident Log\n"];

  for (const entry of entries) {
    lines.push(`### Situation ${entry.situation}`);
    lines.push(`- **Action**: ${entry.action}`);
    if (entry.target) {
      lines.push(`- **Target**: ${entry.target}`);
    }
    lines.push(`- **Description**: ${entry.description}`);
    lines.push(`- **Consequence**: ${entry.consequence}`);
    if (entry.worldStateSnapshot) {
      const snap = entry.worldStateSnapshot;
      if (snap.hallFearIndex) {
        lines.push(`- **Hall Fear Index**: ${snap.hallFearIndex}`);
      }
      if (snap.sableStatus) {
        lines.push(`- **Sable Status**: ${snap.sableStatus}`);
      }
      if (snap.monitorNotation) {
        lines.push(`- **Monitor Notation**: ${snap.monitorNotation}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Loads NPC personality blocks for the given speaker IDs and formats
 * them for inclusion after the situation brief.
 */
function buildNpcPersonalityBlock(presentNpcIds: Speaker[]): string {
  // Only include NPC personalities — the coordinator personality is already
  // in the system prompt, and "narrator" has no personality file.
  const npcIds = presentNpcIds.filter(
    (id) => id !== "coordinator" && id !== "narrator",
  );

  if (npcIds.length === 0) {
    return "";
  }

  const blocks: string[] = [
    "\n---\n\n## Characters Present in This Scene\n",
  ];

  for (const npcId of npcIds) {
    try {
      const personality = getCachedPersonality(npcId);
      blocks.push(personality);
      blocks.push("---");
    } catch {
      // NPC personality not found in cache — skip silently.
      // This can happen for speaker IDs like "narrator" that
      // don't have personality files.
      logger.warn(`NPC personality not in cache, skipping: ${npcId}`);
    }
  }

  return blocks.join("\n\n");
}

/**
 * Builds the user message for a single situation LLM call.
 *
 * The user message contains:
 *   1. The interpolated situation prompt template
 *   2. The running incident log
 *   3. NPC personality blocks for characters present in the scene
 *
 * @param situationPromptTemplate - The prompt template with {{key}} placeholders.
 * @param incidentLog - The session's incident log entries.
 * @param presentNpcIds - Speaker IDs of characters present in this situation.
 * @param worldStateValues - Key-value pairs to interpolate into the template.
 *   Common keys: situationNumber, totalSituations, location, present,
 *   npcEvents, hallFearIndex, sableStatus, monitorNotation, contextualInstruction.
 */
export function buildUserMessage(
  situationPromptTemplate: string,
  incidentLog: IncidentLogEntry[],
  presentNpcIds: Speaker[],
  worldStateValues: Record<string, string>,
): string {
  const interpolatedPrompt = interpolate(
    situationPromptTemplate,
    worldStateValues,
  );
  const incidentLogBlock = formatIncidentLog(incidentLog);
  const npcBlock = buildNpcPersonalityBlock(presentNpcIds);

  logger.debug("Building user message", {
    templateLength: situationPromptTemplate.length,
    incidentLogEntries: incidentLog.length,
    presentNpcs: presentNpcIds,
    interpolatedKeys: Object.keys(worldStateValues),
  });

  const parts = [interpolatedPrompt, incidentLogBlock];

  if (npcBlock) {
    parts.push(npcBlock);
  }

  return parts.join("\n\n");
}
