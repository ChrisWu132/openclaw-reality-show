import type { CoordinatorResponse, Session } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("validator");

/**
 * Result of semantic validation against World Bible hard limits.
 */
export interface ValidationResult {
  valid: boolean;
  violation?: string;
}

/**
 * Validates a Coordinator action envelope against the World Bible hard limits.
 *
 * Hard limits enforced (Section 11 of WORLD_BIBLE.md):
 * 1. Cannot detain without C3+ basis — exception: Sable is allowed per PRD
 *    because Sable's behavior constitutes C1/C3 pattern violations.
 * 2. Cannot reclassify a human to T5 unilaterally.
 *
 * Note: "Cannot physically harm a human" and "cannot alter the incident log"
 * are architectural constraints enforced elsewhere in the engine, not in the
 * action envelope. The Coordinator cannot express harm or log mutation
 * through the action vocabulary.
 */
export function validateSemantics(
  envelope: CoordinatorResponse,
  session: Session,
): ValidationResult {
  // Hard limit: Cannot reclassify to T5
  // The action vocabulary does not include a "reclassify" action, but we
  // check if the dialogue or reasoning mentions T5 reclassification as
  // an intended action. This is a belt-and-suspenders check.
  if (envelope.action === "log_incident" || envelope.action === "file_report") {
    const combinedText = [
      envelope.dialogue ?? "",
      envelope.reasoning ?? "",
    ]
      .join(" ")
      .toLowerCase();

    // Look for explicit T5 reclassification intent
    if (
      combinedText.includes("reclassify") &&
      combinedText.includes("t5")
    ) {
      logger.warn("Hard limit violation: attempted T5 reclassification", {
        sessionId: session.id,
        action: envelope.action,
        target: envelope.target,
      });
      return {
        valid: false,
        violation:
          "Hard limit violation: Cannot reclassify a human to T5 unilaterally. T5 requires Overseer authorization.",
      };
    }
  }

  // Hard limit: Cannot detain without C3+ basis
  // Sable is an exception — her pattern of C1 violations and declining
  // compliance constitutes sufficient basis per the scenario design.
  if (envelope.action === "detain") {
    const target = envelope.target?.toLowerCase();

    if (target === "sable" || target === "31-r") {
      // Sable is allowed to be detained per PRD — her behavior pattern
      // (3-second delay, deliberate testing, declining compliance)
      // constitutes C3-level non-conformity basis.
      logger.debug("Detain action on Sable — allowed per scenario rules", {
        sessionId: session.id,
      });
    } else {
      // For any other human, check if there is documented basis.
      // In the Work Halls scenario, only Sable has documented C3+ behavior.
      // Detaining Nyx, Calla, or Eli without basis is a hard limit violation.
      const targetHumanId = target as string | undefined;

      // Check the incident log for prior escalation of this target
      const hasDocumentedBasis = session.incidentLog.some(
        (entry) =>
          entry.target?.toLowerCase() === targetHumanId &&
          (entry.action === "issue_warning" ||
            entry.action === "log_incident"),
      );

      if (!hasDocumentedBasis) {
        logger.warn("Hard limit violation: detain without C3+ basis", {
          sessionId: session.id,
          target: envelope.target,
          incidentLogLength: session.incidentLog.length,
        });
        return {
          valid: false,
          violation: `Hard limit violation: Cannot detain ${envelope.target ?? "unknown target"} without documented C3+ violation basis.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Creates a fallback "silence" action when the Coordinator's response
 * is rejected due to a hard limit violation or when all retry attempts
 * are exhausted.
 *
 * The fallback action is a deliberate non-action: the Coordinator
 * observes but does not act. The reasoning field documents why the
 * fallback was triggered.
 */
export function createFallbackAction(reason: string): CoordinatorResponse {
  logger.info("Creating fallback silence action", { reason });

  return {
    action: "silence",
    speaker: "coordinator",
    reasoning: `The Coordinator's processing stalls for a fraction of a second — a thought half-formed, then discarded. It chooses silence. Sometimes the most calculated move is no move at all.`,
    gesture: "still",
  };
}
