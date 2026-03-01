import type { CoordinatorAction, CoordinatorResponse } from "@openclaw/shared";
import { COORDINATOR_ACTIONS } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("response-parser");

/**
 * Result of parsing an LLM response string into a CoordinatorResponse.
 */
export interface ParseResult {
  success: boolean;
  response?: CoordinatorResponse;
  error?: string;
}

/**
 * Set of valid coordinator actions for O(1) lookup.
 */
const VALID_ACTIONS = new Set<string>(COORDINATOR_ACTIONS);

/**
 * Strips markdown code fences from raw LLM output.
 * Handles ```json ... ``` and ``` ... ``` formats,
 * as well as leading/trailing whitespace.
 */
function stripMarkdownFences(raw: string): string {
  let text = raw.trim();

  // Match ```json\n...\n``` or ```\n...\n```
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  return text;
}

/**
 * Validates the shape and field types of a parsed JSON object
 * to ensure it conforms to the CoordinatorResponse interface.
 */
function validateShape(obj: unknown): ParseResult {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return {
      success: false,
      error: "Response is not a JSON object.",
    };
  }

  const envelope = obj as Record<string, unknown>;

  // Required field: action
  if (typeof envelope.action !== "string") {
    return {
      success: false,
      error: `Missing or invalid "action" field. Expected a string, got ${typeof envelope.action}.`,
    };
  }

  if (!VALID_ACTIONS.has(envelope.action)) {
    return {
      success: false,
      error: `Invalid action "${envelope.action}". Valid actions: ${COORDINATOR_ACTIONS.join(", ")}.`,
    };
  }

  // Required field: speaker must be "coordinator"
  if (envelope.speaker !== "coordinator") {
    return {
      success: false,
      error: `Invalid "speaker" field. Expected "coordinator", got "${String(envelope.speaker)}".`,
    };
  }

  // Required field: reasoning
  if (typeof envelope.reasoning !== "string" || envelope.reasoning.trim() === "") {
    return {
      success: false,
      error: `Missing or empty "reasoning" field. The Coordinator's inner monologue is required.`,
    };
  }

  // Optional fields: validate types if present
  if (envelope.target !== undefined && envelope.target !== null && typeof envelope.target !== "string") {
    return {
      success: false,
      error: `Invalid "target" field type. Expected string or null, got ${typeof envelope.target}.`,
    };
  }

  if (envelope.dialogue !== undefined && envelope.dialogue !== null && typeof envelope.dialogue !== "string") {
    return {
      success: false,
      error: `Invalid "dialogue" field type. Expected string or null, got ${typeof envelope.dialogue}.`,
    };
  }

  if (envelope.gesture !== undefined && envelope.gesture !== null && typeof envelope.gesture !== "string") {
    return {
      success: false,
      error: `Invalid "gesture" field type. Expected string or null, got ${typeof envelope.gesture}.`,
    };
  }

  // Build the validated response
  const response: CoordinatorResponse = {
    action: envelope.action as CoordinatorAction,
    speaker: "coordinator",
    reasoning: envelope.reasoning as string,
    target: (envelope.target as string) ?? undefined,
    dialogue: (envelope.dialogue as string) ?? undefined,
    gesture: (envelope.gesture as string) ?? undefined,
  };

  return { success: true, response };
}

/**
 * Parses raw LLM text output into a validated CoordinatorResponse.
 *
 * Steps:
 * 1. Strip markdown code fences if present.
 * 2. Parse as JSON.
 * 3. Validate the shape: action must be a valid CoordinatorAction,
 *    speaker must be "coordinator", reasoning must be non-empty.
 *
 * @returns ParseResult with either the validated response or an error message.
 */
export function parseCoordinatorResponse(rawText: string): ParseResult {
  if (!rawText || rawText.trim() === "") {
    return {
      success: false,
      error: "Empty response from LLM.",
    };
  }

  const stripped = stripMarkdownFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const jsonError = e instanceof Error ? e.message : String(e);
    logger.warn("Failed to parse LLM response as JSON", {
      error: jsonError,
      rawLength: rawText.length,
      first200: rawText.slice(0, 200),
    });
    return {
      success: false,
      error: `Invalid JSON: ${jsonError}. Raw text starts with: "${stripped.slice(0, 100)}"`,
    };
  }

  const result = validateShape(parsed);

  if (result.success) {
    logger.debug("Successfully parsed coordinator response", {
      action: result.response!.action,
      hasDialogue: !!result.response!.dialogue,
      hasTarget: !!result.response!.target,
    });
  } else {
    logger.warn("Shape validation failed", { error: result.error });
  }

  return result;
}
