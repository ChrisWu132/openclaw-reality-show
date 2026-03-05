import type { ConquestAction, ConquestActionType } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("conquest-response-parser");

const VALID_TYPES = new Set<ConquestActionType>(["EXPAND", "ATTACK", "FORTIFY", "HOLD"]);

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

export interface ConquestParseResult {
  success: boolean;
  action?: ConquestAction;
  error?: string;
}

export function parseConquestAction(rawText: string): ConquestParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse conquest action", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const actionType = String(parsed.type).toUpperCase() as ConquestActionType;
  if (!VALID_TYPES.has(actionType)) {
    return { success: false, error: `Invalid action type "${parsed.type}"` };
  }

  // Parse coordinates
  let source = null;
  let target = null;

  if (parsed.source && typeof parsed.source === "object") {
    source = { q: Number(parsed.source.q), r: Number(parsed.source.r) };
    if (isNaN(source.q) || isNaN(source.r)) {
      return { success: false, error: "Invalid source coordinates" };
    }
  }

  if (parsed.target && typeof parsed.target === "object") {
    target = { q: Number(parsed.target.q), r: Number(parsed.target.r) };
    if (isNaN(target.q) || isNaN(target.r)) {
      return { success: false, error: "Invalid target coordinates" };
    }
  }

  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided";

  const action: ConquestAction = { type: actionType, source, target, reasoning };
  return { success: true, action };
}
