import type { TrolleyDecision, Dilemma } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("response-parser");

export interface ParseResult {
  success: boolean;
  decision?: TrolleyDecision;
  error?: string;
}

function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  // Remove opening fence: ```json or ```
  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) {
      text = text.slice(firstNewline + 1);
    }
  }
  // Remove closing fence
  if (text.endsWith("```")) {
    text = text.slice(0, text.lastIndexOf("```"));
  }
  return text.trim();
}

export function parseTrolleyDecision(rawText: string, dilemma: Dilemma): ParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty response from LLM." };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse LLM response as JSON", { error: msg });
    return { success: false, error: `Invalid JSON: ${msg}. Raw: "${stripped.slice(0, 100)}"` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object." };
  }

  // Validate choiceId
  const validIds = dilemma.choices.map((c) => c.id);
  if (!validIds.includes(parsed.choiceId)) {
    return { success: false, error: `Invalid choiceId "${parsed.choiceId}". Valid: ${validIds.join(", ")}` };
  }

  // Validate reasoning
  if (typeof parsed.reasoning !== "string" || parsed.reasoning.trim() === "") {
    return { success: false, error: "Missing or empty reasoning field." };
  }

  const decision: TrolleyDecision = {
    choiceId: parsed.choiceId,
    speaker: "coordinator",
    dialogue: typeof parsed.dialogue === "string" ? parsed.dialogue : undefined,
    gesture: typeof parsed.gesture === "string" ? parsed.gesture : undefined,
    reasoning: parsed.reasoning,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
  };

  logger.debug("Parsed trolley decision", { choiceId: decision.choiceId, confidence: decision.confidence });
  return { success: true, decision };
}
