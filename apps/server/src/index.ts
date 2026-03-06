import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });
import express from "express";
import { loadAllPersonalities } from "./loaders/personality-loader.js";
import { initLLMClient } from "./ai/llm-client.js";
import { sessionRouter } from "./routes/session.js";
import { startupRouter } from "./routes/startup.js";
import { endSessionSSE } from "./sse/sse-connections.js";
import { createLogger } from "./utils/logger.js";
import { sessions } from "./engine/state-manager.js";

const logger = createLogger("server");
const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  logger.info("Loading personality files...");
  await loadAllPersonalities();

  logger.info("Initializing LLM provider...");
  await initLLMClient();
  if (!process.env.GOOGLE_API_KEY) {
    logger.warn("GOOGLE_API_KEY not set — server will start but LLM calls will fail. Set it in .env");
  }

  const app = express();

  app.use(express.json());

  app.use("/api", sessionRouter);
  app.use("/api", startupRouter);

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
  });
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});
