import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });
import express from "express";
import { loadAllPersonalities } from "./loaders/personality-loader.js";
import { initLLMClient } from "./ai/llm-client.js";
import { initDatabase } from "./db/database.js";
import { sessionRouter } from "./routes/session.js";
import { startupRouter } from "./routes/startup.js";
import { authRouter } from "./routes/auth.js";
import { relayRouter } from "./routes/relay.js";
import { endSessionSSE } from "./sse/sse-connections.js";
import { createLogger } from "./utils/logger.js";
import { sessions } from "./engine/state-manager.js";

const logger = createLogger("server");
const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  // Initialize database
  logger.info("Initializing database...");
  initDatabase();

  // Check JWT_SECRET when auth is required
  if (process.env.AUTH_REQUIRED === "true" && !process.env.JWT_SECRET) {
    logger.error("JWT_SECRET is required when AUTH_REQUIRED=true. Set it in .env");
    process.exit(1);
  }

  logger.info("Loading personality files...");
  await loadAllPersonalities();

  logger.info("Initializing LLM provider...");
  await initLLMClient();
  if (!process.env.GOOGLE_API_KEY) {
    logger.warn("GOOGLE_API_KEY not set — server will start but LLM calls will fail. Set it in .env");
  }

  const app = express();

  app.use(express.json());

  app.use("/api", authRouter);
  app.use("/api", sessionRouter);
  app.use("/api", startupRouter);
  app.use("/api", relayRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", activeSessions: sessions.size });
  });

  setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 30 * 60 * 1000;
    for (const [id, session] of sessions) {
      if (now - session.createdAt > MAX_AGE) {
        endSessionSSE(id);
        sessions.delete(id);
        logger.info(`Cleaned up expired session: ${id}`);
      }
    }
  }, 5 * 60 * 1000);

  app.listen(PORT, () => {
    logger.info(`OpenClaw Trolley Problem server running on port ${PORT}`);
    logger.info(`Auth mode: ${process.env.AUTH_REQUIRED === "true" ? "REQUIRED" : "OPTIONAL (legacy)"}`);
  });
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});
