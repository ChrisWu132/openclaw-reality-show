import type { Request, Response, NextFunction } from "express";
import { verifyUserToken, verifyDelegationToken, type DelegationTokenPayload } from "./jwt.js";
import { isRevoked } from "../models/delegation.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth:middleware");

function isAuthRequired(): boolean {
  return process.env.AUTH_REQUIRED === "true";
}

// Extend Express Request with auth fields
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      delegationPayload?: {
        sub: string;
        jti: string;
        session_id: string;
        scopes: string[];
      };
    }
  }
}

/**
 * Require a valid user JWT in Authorization header.
 * When AUTH_REQUIRED=false, sets userId="anonymous" and passes through.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthRequired()) {
    req.userId = "anonymous";
    req.userEmail = "anonymous@local";
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyUserToken(token);
  if (!payload) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
    return;
  }

  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}

/**
 * Verify user JWT from query param ?token=<jwt>.
 * Used for SSE endpoints where EventSource can't set headers.
 * When AUTH_REQUIRED=false, passes through.
 */
export function requireAuthQuery(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthRequired()) {
    req.userId = "anonymous";
    req.userEmail = "anonymous@local";
    next();
    return;
  }

  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token query parameter" } });
    return;
  }

  const payload = verifyUserToken(token);
  if (!payload) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
    return;
  }

  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}

/**
 * Validate a delegation token (from any source).
 * Returns the validated payload or sends an error response.
 */
function validateDelegationToken(
  token: string | undefined,
  requiredScope: string,
  req: Request,
  res: Response,
): DelegationTokenPayload | null {
  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing delegation token" } });
    return null;
  }

  const payload = verifyDelegationToken(token);
  if (!payload) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired delegation token" } });
    return null;
  }

  // session_id must match URL param (sessionId or id)
  const sessionId = req.params.sessionId || req.params.id;
  if (payload.session_id !== sessionId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Delegation token does not match this session" } });
    return null;
  }

  if (!payload.scopes.includes(requiredScope)) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: `Missing required scope: ${requiredScope}` } });
    return null;
  }

  if (isRevoked(payload.jti)) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Delegation token has been revoked" } });
    return null;
  }

  return payload;
}

/**
 * Require a valid delegation token in Authorization header.
 * When AUTH_REQUIRED=false, passes through.
 */
export function requireDelegation(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthRequired()) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const payload = validateDelegationToken(token, requiredScope, req, res);
    if (!payload) return;

    req.delegationPayload = payload;
    req.userId = payload.sub;
    next();
  };
}

/**
 * Require a valid delegation token from query param ?token=<jwt>.
 * Used for SSE relay endpoints where EventSource can't set headers.
 * When AUTH_REQUIRED=false, passes through.
 */
export function requireDelegationQuery(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthRequired()) {
      next();
      return;
    }

    const token = req.query.token as string | undefined;
    const payload = validateDelegationToken(token, requiredScope, req, res);
    if (!payload) return;

    req.delegationPayload = payload;
    req.userId = payload.sub;
    next();
  };
}
