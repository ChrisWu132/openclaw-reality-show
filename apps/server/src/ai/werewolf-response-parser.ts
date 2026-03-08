import type { DiscussionStatement, VoteAction } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("werewolf-response-parser");

const VALID_TONES = new Set([
  "accusatory", "defensive", "analytical", "emotional", "calm", "suspicious", "confident",
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

// ── Discussion Response Parser ─────────────────────────────────

export interface DiscussionParseResult {
  success: boolean;
  statement?: Omit<DiscussionStatement, "speakerId">;
  error?: string;
}

export function parseDiscussionResponse(rawText: string): DiscussionParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse discussion response", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    return { success: false, error: "Missing or empty 'text' field" };
  }

  const tone = typeof parsed.tone === "string" ? parsed.tone.toLowerCase() : "calm";
  const validTone = VALID_TONES.has(tone) ? tone : "calm";

  const accusation = typeof parsed.accusation === "string" && parsed.accusation.trim()
    ? parsed.accusation.trim()
    : undefined;

  return {
    success: true,
    statement: {
      text,
      tone: validTone as DiscussionStatement["tone"],
      accusation: accusation || undefined,
    },
  };
}

// ── Vote Response Parser ───────────────────────────────────────

export interface VoteParseResult {
  success: boolean;
  vote?: Omit<VoteAction, "voterId">;
  error?: string;
}

export function parseVoteResponse(rawText: string, eligibleTargetIds: string[]): VoteParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse vote response", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const targetId = typeof parsed.targetId === "string" ? parsed.targetId.trim() : "";
  if (!targetId) {
    return { success: false, error: "Missing 'targetId' field" };
  }

  if (!eligibleTargetIds.includes(targetId)) {
    return { success: false, error: `Invalid targetId "${targetId}". Must be one of: ${eligibleTargetIds.join(", ")}` };
  }

  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided";

  return {
    success: true,
    vote: { targetId, reasoning },
  };
}

// ── Night Action Response Parser ────────────────────────────────

export interface NightActionParseResult {
  success: boolean;
  targetId?: string;
  error?: string;
}

export function parseNightActionResponse(rawText: string, eligibleTargetIds: string[]): NightActionParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse night action response", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const targetId = typeof parsed.targetId === "string" ? parsed.targetId.trim() : "";
  if (!targetId) {
    return { success: false, error: "Missing 'targetId' field" };
  }

  if (!eligibleTargetIds.includes(targetId)) {
    return { success: false, error: `Invalid targetId "${targetId}". Must be one of: ${eligibleTargetIds.join(", ")}` };
  }

  return { success: true, targetId };
}

// ── Werewolf Night Discussion Parser ────────────────────────────

export interface WerewolfSuggestionParseResult {
  success: boolean;
  suggestion?: string;
  error?: string;
}

export function parseWerewolfSuggestion(rawText: string): WerewolfSuggestionParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM" };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    // If not valid JSON, just use the raw text as the suggestion
    return { success: true, suggestion: stripped.slice(0, 200) };
  }

  const suggestion = typeof parsed.suggestion === "string" ? parsed.suggestion : stripped;
  return { success: true, suggestion };
}
