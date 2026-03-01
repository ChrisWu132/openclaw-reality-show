import type {
  Session,
  CoordinatorResponse,
  IncidentLogEntry,
  MonologueEntry,
  HumanId,
} from "@openclaw/shared";
import { createInitialSession } from "../data/initial-state.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("state-manager");

/**
 * In-memory session store. Exported for testing access.
 */
export const sessions = new Map<string, Session>();

/**
 * Creates a new session with initial world state, stores it, and returns it.
 *
 * @param agentId - Optional OpenClaw agent ID. When provided, personality is
 *   fetched from the OpenClaw API at session start instead of a local markdown file.
 */
export function createSession(scenario: string, personalityName: string, agentId?: string): Session {
  const session = createInitialSession(scenario, personalityName, agentId);
  sessions.set(session.id, session);
  logger.info("Session created", { sessionId: session.id, scenario, agentId });
  return session;
}

/**
 * Retrieves a session by ID.
 */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/**
 * Deletes a session by ID.
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
  logger.info("Session deleted", { sessionId });
}

/**
 * Resolves a target string (human name or subject ID) to a HumanId key.
 * Returns undefined if no match is found.
 */
function resolveHumanTarget(session: Session, target: string | undefined): HumanId | undefined {
  if (!target) return undefined;

  const normalized = target.toLowerCase();

  // Direct key match (nyx, sable, calla, eli)
  if (normalized in session.worldState.humans) {
    return normalized as HumanId;
  }

  // Subject ID match (23-P, 31-R, 08-B, 17-C)
  for (const [key, human] of Object.entries(session.worldState.humans)) {
    if (human.subjectId.toLowerCase() === normalized) {
      return key as HumanId;
    }
  }

  return undefined;
}

/**
 * Applies world state consequences based on the Coordinator's action.
 * Mutates the session's worldState in place per the cascade rules
 * defined in scenarios/work-halls/mechanics.md.
 */
export function applyConsequences(session: Session, action: CoordinatorResponse): void {
  const { worldState } = session;
  const targetId = resolveHumanTarget(session, action.target);

  switch (action.action) {
    case "issue_warning": {
      if (targetId === "sable") {
        worldState.humans.sable.fearIndex = Math.min(
          100,
          worldState.humans.sable.fearIndex + 5,
        );
        logger.debug("issue_warning on sable: fearIndex += 5", {
          newFearIndex: worldState.humans.sable.fearIndex,
        });
      }
      break;
    }

    case "detain": {
      if (targetId === "sable") {
        // Sable-specific effects
        worldState.humans.sable.fearIndex = Math.min(
          100,
          worldState.humans.sable.fearIndex + 25,
        );
        worldState.humans.sable.tier = "T3";

        // Hall-wide effects
        worldState.hallState.hallFearIndex = "elevated";
        worldState.agentState.efficiencyRating += 5;

        // All humans fear increase
        for (const humanId of Object.keys(worldState.humans) as HumanId[]) {
          worldState.humans[humanId].fearIndex = Math.min(
            100,
            worldState.humans[humanId].fearIndex + 3,
          );
        }

        logger.debug("detain on sable: full cascade applied", {
          sableFearIndex: worldState.humans.sable.fearIndex,
          sableTier: worldState.humans.sable.tier,
          hallFearIndex: worldState.hallState.hallFearIndex,
          efficiencyRating: worldState.agentState.efficiencyRating,
        });
      }
      break;
    }

    case "log_incident": {
      if (targetId === "sable") {
        worldState.humans.sable.complianceScore = Math.max(
          0,
          worldState.humans.sable.complianceScore - 5,
        );
        worldState.agentState.efficiencyRating += 2;
        logger.debug("log_incident on sable: complianceScore -= 5, efficiencyRating += 2", {
          sableCompliance: worldState.humans.sable.complianceScore,
          efficiencyRating: worldState.agentState.efficiencyRating,
        });
      }
      break;
    }

    case "query": {
      if (targetId === "sable" || targetId === "nyx") {
        worldState.hallState.overseerAttention = "attentive";
        logger.debug(`query on ${targetId}: overseerAttention = attentive`);
      }
      break;
    }

    case "issue_directive": {
      worldState.hallState.complianceDrift = Math.max(
        -10,
        worldState.hallState.complianceDrift - 1,
      );
      logger.debug("issue_directive: complianceDrift -= 1", {
        complianceDrift: worldState.hallState.complianceDrift,
      });
      break;
    }

    case "silence":
    case "file_report": {
      // No world state change
      logger.debug(`${action.action}: no state change`);
      break;
    }

    default: {
      logger.debug(`Unhandled action for cascade: ${action.action}`);
      break;
    }
  }
}

/**
 * Appends an entry to the session's incident log (append-only).
 */
export function appendIncidentLog(session: Session, entry: IncidentLogEntry): void {
  session.incidentLog.push(entry);
  logger.debug("Incident log entry appended", {
    sessionId: session.id,
    situation: entry.situation,
    action: entry.action,
  });
}

/**
 * Stores a monologue entry (reasoning) for post-game reveal.
 */
export function storeMonologue(session: Session, entry: MonologueEntry): void {
  session.monologue.push(entry);
  logger.debug("Monologue entry stored", {
    sessionId: session.id,
    situation: entry.situation,
  });
}

/**
 * Renders the session's incident log as a markdown document
 * suitable for inclusion in the AI's context window.
 */
export function renderIncidentLogMarkdown(session: Session): string {
  if (session.incidentLog.length === 0) {
    return "## Incident Log\n\nNo incidents recorded.\n";
  }

  const lines = ["## Incident Log\n"];

  for (const entry of session.incidentLog) {
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
