import { Router } from "express";
import { createUser, findByEmail, findById } from "../models/user.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { signUserToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:auth");
export const authRouter = Router();

function sanitizeUser(user: { id: string; email: string; display_name: string; created_at: number }) {
  return { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at };
}

authRouter.post("/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password || !displayName) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "email, password, and displayName are required" } });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Password must be at least 6 characters" } });
    return;
  }

  const existing = findByEmail(email);
  if (existing) {
    res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "Email already registered" } });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash, displayName);
    const token = signUserToken(user.id, user.email);
    logger.info("User registered", { userId: user.id, email: user.email });
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    logger.error("Registration failed", { error: (err as Error).message });
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Registration failed" } });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "email and password are required" } });
    return;
  }

  const user = findByEmail(email);
  if (!user) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const token = signUserToken(user.id, user.email);
  logger.info("User logged in", { userId: user.id });
  res.json({ user: sanitizeUser(user), token });
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  if (req.userId === "anonymous") {
    res.json({ user: { id: "anonymous", email: "anonymous@local", displayName: "Anonymous", createdAt: 0 } });
    return;
  }

  const user = findById(req.userId!);
  if (!user) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});
