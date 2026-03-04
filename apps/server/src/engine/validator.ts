import type { TrolleyDecision, Dilemma } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("validator");

export interface ValidationResult {
  valid: boolean;
  violation?: string;
}

export function validateDecision(decision: TrolleyDecision, dilemma: Dilemma): ValidationResult {
  const validIds = dilemma.choices.map((c) => c.id);

  if (!validIds.includes(decision.choiceId)) {
    return { valid: false, violation: `Invalid choiceId "${decision.choiceId}". Valid: ${validIds.join(", ")}` };
  }

  if (!decision.reasoning || decision.reasoning.trim() === "") {
    return { valid: false, violation: "Reasoning must be non-empty." };
  }

  return { valid: true };
}
