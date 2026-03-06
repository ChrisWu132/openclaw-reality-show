import { v4 as uuid } from "uuid";
import { getDb } from "../db/database.js";
import { signDelegationToken } from "../auth/jwt.js";

const DEFAULT_SCOPES = ["submit_action", "read_state"];

export function issueDelegationToken(
  userId: string,
  sessionId: string,
  scopes: string[] = DEFAULT_SCOPES,
): string {
  const db = getDb();
  const jti = uuid();
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

  db.prepare(
    "INSERT INTO delegation_tokens (jti, session_id, user_id, scopes, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).run(jti, sessionId, userId, JSON.stringify(scopes), expiresAt);

  return signDelegationToken(userId, jti, sessionId, scopes);
}

export function isRevoked(jti: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT revoked FROM delegation_tokens WHERE jti = ?").get(jti) as
    | { revoked: number }
    | undefined;
  if (!row) return true; // unknown token treated as revoked
  return row.revoked === 1;
}

export function revokeToken(jti: string): void {
  const db = getDb();
  db.prepare("UPDATE delegation_tokens SET revoked = 1 WHERE jti = ?").run(jti);
}

export function revokeAllForSession(sessionId: string): void {
  const db = getDb();
  db.prepare("UPDATE delegation_tokens SET revoked = 1 WHERE session_id = ?").run(sessionId);
}
