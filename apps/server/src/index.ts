import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { loadAllPersonalities } from "./loaders/personality-loader.js";
import { initLLMClient } from "./ai/llm-client.js";
import { sessionRouter } from "./routes/session.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { setupWebSocketServer } from "./ws/ws-server.js";
import { createLogger } from "./utils/logger.js";
import { sessions } from "./engine/state-manager.js";

const logger = createLogger("server");
const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  // Load all personality and world files
  logger.info("Loading personality files...");
  await loadAllPersonalities();

  // Initialize LLM provider
  logger.info("Initializing LLM provider...");
  await initLLMClient();
  if (!process.env.GOOGLE_API_KEY) {
    logger.warn("GOOGLE_API_KEY not set — server will start but LLM calls will fail. Set it in .env");
  }

  // Create Express app
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // REST API routes
  app.use("/api", sessionRouter);
  app.use("/api", scenariosRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", activeSessions: sessions.size });
  });

  // Setup WebSocket server
  setupWebSocketServer(server);

  // Session cleanup: delete sessions older than 30 minutes
  setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 30 * 60 * 1000;
    for (const [id, session] of sessions) {
      if (now - session.createdAt > MAX_AGE) {
        sessions.delete(id);
        logger.info(`Cleaned up expired session: ${id}`);
      }
    }
  }, 5 * 60 * 1000);

  server.listen(PORT, () => {
    logger.info(`OpenClaw server running on port ${PORT}`);
    logger.info(`LLM Provider: google`);
  });
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});
