import { Router } from "express";
import { getSession } from "../engine/state-manager.js";
import { loadGame } from "../engine/startup-store.js";
import { issueDelegationToken } from "../models/delegation.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:relay");
export const relayRouter = Router();

const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability
const CODE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

interface JoinCodeEntry {
  code: string;
  sessionId: string;
  gameType: "trolley" | "startup";
  agentName?: string;
  /** For startup games — which agent config slot this code belongs to */
  agentId?: string;
  createdAt: number;
  claimed: boolean;
}

const joinCodes = new Map<string, JoinCodeEntry>();

export function generateJoinCode(): string {
  let code: string;
  do {
    code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (joinCodes.has(code));
  return code;
}

export function registerJoinCode(
  sessionId: string,
  gameType: "trolley" | "startup",
  agentName?: string,
  agentId?: string,
): string {
  const code = generateJoinCode();
  joinCodes.set(code, {
    code,
    sessionId,
    gameType,
    agentName,
    agentId,
    createdAt: Date.now(),
    claimed: false,
  });
  logger.info("Join code registered", { code, sessionId, gameType, agentId });
  return code;
}

export function getJoinCodeEntry(code: string): JoinCodeEntry | undefined {
  return joinCodes.get(code);
}

export function isCodeClaimed(code: string): boolean {
  const entry = joinCodes.get(code);
  return !!entry?.claimed;
}

export function claimCode(code: string): boolean {
  const entry = joinCodes.get(code);
  if (!entry || entry.claimed) return false;
  if (Date.now() - entry.createdAt > CODE_EXPIRY_MS) return false;
  entry.claimed = true;
  return true;
}

export function removeCodesForSession(sessionId: string): void {
  for (const [code, entry] of joinCodes) {
    if (entry.sessionId === sessionId) {
      joinCodes.delete(code);
    }
  }
}

/** POST /api/relay/join — Exchange a join code for a delegation token + SSE URL */
relayRouter.post("/relay/join", (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: { code: "MISSING_CODE", message: "Join code is required" } });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();
  const entry = joinCodes.get(normalizedCode);

  if (!entry) {
    res.status(404).json({ error: { code: "CODE_NOT_FOUND", message: "Invalid join code" } });
    return;
  }

  if (entry.claimed) {
    res.status(409).json({ error: { code: "CODE_CLAIMED", message: "This join code has already been used" } });
    return;
  }

  if (Date.now() - entry.createdAt > CODE_EXPIRY_MS) {
    res.status(410).json({ error: { code: "CODE_EXPIRED", message: "This join code has expired" } });
    return;
  }

  // Verify the session/game still exists
  if (entry.gameType === "trolley") {
    const session = getSession(entry.sessionId);
    if (!session) {
      res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Session no longer exists" } });
      return;
    }
  } else {
    const game = loadGame(entry.sessionId);
    if (!game) {
      res.status(404).json({ error: { code: "GAME_NOT_FOUND", message: "Game no longer exists" } });
      return;
    }
  }

  // Claim the code
  if (!claimCode(normalizedCode)) {
    res.status(409).json({ error: { code: "CLAIM_FAILED", message: "Failed to claim join code" } });
    return;
  }

  // Issue a delegation token for the relay
  const delegationToken = issueDelegationToken("relay-user", entry.sessionId);

  const relayUrl = entry.gameType === "trolley"
    ? `/api/session/${entry.sessionId}/relay`
    : `/api/startup/games/${entry.sessionId}/relay`;

  const openclawUrl = entry.gameType === "trolley"
    ? `/api/session/${entry.sessionId}/openclaw`
    : `/api/startup/games/${entry.sessionId}/openclaw`;

  logger.info("Join code claimed", { code: normalizedCode, sessionId: entry.sessionId, gameType: entry.gameType });

  res.json({
    sessionId: entry.sessionId,
    relayUrl,
    openclawUrl,
    delegationToken,
    gameType: entry.gameType,
    agentName: entry.agentName,
    agentId: entry.agentId,
  });
});

/** GET /api/relay/status/:code — Check if a join code has been claimed */
relayRouter.get("/relay/status/:code", (req, res) => {
  const normalizedCode = req.params.code.trim().toUpperCase();
  const entry = joinCodes.get(normalizedCode);

  if (!entry) {
    res.status(404).json({ claimed: false, exists: false });
    return;
  }

  res.json({ claimed: entry.claimed, exists: true });
});

// Periodic cleanup of expired codes
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of joinCodes) {
    if (now - entry.createdAt > CODE_EXPIRY_MS * 2) {
      joinCodes.delete(code);
    }
  }
}, 5 * 60 * 1000);
