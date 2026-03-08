import type { StartupAction, StartupActionType, DialogueStatement, DialogueTone } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("startup-response-parser");

const VALID_TYPES = new Set<StartupActionType>([
  "TRAIN",
  "DEPLOY",
  "FUNDRAISE",
  "ACQUIRE_COMPUTE",
  "ACQUIRE_DATA",
  "POACH",
  "OPEN_SOURCE",
  "BETRAY",
]);

function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) text = text.slice(firstNewline + 1);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, text.lastIndexOf("```"));
  }
  return text.trim();
}

export interface StartupParseResult {
  success: boolean;
  action?: StartupAction;
  error?: string;
}

export function parseStartupAction(rawText: string): StartupParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse startup action", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const actionType = String(parsed.type).toUpperCase() as StartupActionType;
  if (!VALID_TYPES.has(actionType)) {
    return { success: false, error: `Invalid action type "${parsed.type}"` };
  }

  const targetAgentId =
    typeof parsed.targetAgentId === "string" && parsed.targetAgentId.trim()
      ? parsed.targetAgentId.trim()
      : null;

  if (actionType === "POACH" && !targetAgentId) {
    return { success: false, error: "POACH requires a targetAgentId" };
  }

  if (actionType === "BETRAY" && !targetAgentId) {
    return { success: false, error: "BETRAY requires a targetAgentId" };
  }

  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided";

  const action: StartupAction = { type: actionType, targetAgentId, reasoning };
  return { success: true, action };
}

// ── Dialogue Response Parser ─────────────────────────────────

const VALID_TONES = new Set<DialogueTone>([
  "threatening", "mocking", "diplomatic", "desperate", "confident", "accusatory",
]);

export interface DialogueParseResult {
  success: boolean;
  statement?: DialogueStatement;
  proposedAlliance?: string | null;
  error?: string;
}

export function parseDialogueResponse(rawText: string): DialogueParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty dialogue response" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse dialogue response", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    return { success: false, error: "Missing 'text' field" };
  }

  const tone = (typeof parsed.tone === "string" ? parsed.tone.toLowerCase() : "confident") as DialogueTone;
  const validTone = VALID_TONES.has(tone) ? tone : "confident";

  const targetAgentId =
    typeof parsed.targetAgentId === "string" && parsed.targetAgentId.trim()
      ? parsed.targetAgentId.trim()
      : null;

  const proposedAlliance =
    typeof parsed.proposedAlliance === "string" && parsed.proposedAlliance.trim()
      ? parsed.proposedAlliance.trim()
      : null;

  const statement: DialogueStatement = {
    speakerId: "", // filled by caller
    targetAgentId,
    text,
    tone: validTone,
  };

  return { success: true, statement, proposedAlliance };
}
