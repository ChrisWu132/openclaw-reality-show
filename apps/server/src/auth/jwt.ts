import jwt from "jsonwebtoken";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("jwt");

function getUserSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

function getDelegationSecret(): string {
  return process.env.JWT_DELEGATION_SECRET || getUserSecret() + "-delegation";
}

export interface UserTokenPayload {
  sub: string;
  email: string;
  type: "user";
}

export interface DelegationTokenPayload {
  sub: string;
  jti: string;
  session_id: string;
  scopes: string[];
  aud: string;
  type: "delegation";
}

export function signUserToken(userId: string, email: string): string {
  const payload: UserTokenPayload = { sub: userId, email, type: "user" };
  return jwt.sign(payload, getUserSecret(), { expiresIn: "24h" });
}

export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getUserSecret()) as UserTokenPayload;
    if (decoded.type !== "user") return null;
    return decoded;
  } catch (err) {
    logger.debug("User token verification failed", { error: (err as Error).message });
    return null;
  }
}

export function signDelegationToken(
  userId: string,
  jti: string,
  sessionId: string,
  scopes: string[],
): string {
  const payload: DelegationTokenPayload = {
    sub: userId,
    jti,
    session_id: sessionId,
    scopes,
    aud: "game-control",
    type: "delegation",
  };
  return jwt.sign(payload, getDelegationSecret(), { expiresIn: "30m" });
}

export function verifyDelegationToken(token: string): DelegationTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getDelegationSecret()) as DelegationTokenPayload;
    if (decoded.type !== "delegation") return null;
    return decoded;
  } catch (err) {
    logger.debug("Delegation token verification failed", { error: (err as Error).message });
    return null;
  }
}
