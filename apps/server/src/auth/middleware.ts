import type { Request, Response, NextFunction } from "express";
import { verifyUserToken, verifyDelegationToken } from "./jwt.js";
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
 * Require a valid delegation token in Authorization header.
 * Validates: type=delegation, session_id matches URL, scope includes required scope, jti not revoked.
 * When AUTH_REQUIRED=false, passes through.
 */
export function requireDelegation(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthRequired()) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing delegation token" } });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyDelegationToken(token);
    if (!payload) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired delegation token" } });
      return;
    }

    // session_id must match URL param
    const sessionId = req.params.sessionId;
    if (payload.session_id !== sessionId) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Delegation token does not match this session" } });
      return;
    }

    // Check scope
    if (!payload.scopes.includes(requiredScope)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: `Missing required scope: ${requiredScope}` } });
      return;
    }

    // Check revocation
    if (isRevoked(payload.jti)) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Delegation token has been revoked" } });
      return;
    }

    req.delegationPayload = payload;
    req.userId = payload.sub;
    next();
  };
}
