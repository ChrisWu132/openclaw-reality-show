import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });

import express from "express";
import { agentsRouter } from "./routes/agents.js";
import { loadPersistedData, seedDefaultAgent } from "./store.js";

const PORT = process.env.OPENCLAW_PORT || 3002;

async function startServer(): Promise<void> {
  // Load persisted agents and platform memories from previous runs
  await loadPersistedData();

  // Seed a default agent if none exists yet (first run only)
  const defaultId = await seedDefaultAgent();
  console.log(`[openclaw] Default agent ready: ${defaultId}`);

  const app = express();
  app.use(express.json());

  app.use("/", agentsRouter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "openclaw-api" });
  });

  app.listen(PORT, () => {
    console.log(`[openclaw] API running on http://localhost:${PORT}`);
    if (!process.env.OPENCLAW_API_KEY) {
      console.warn("[openclaw] OPENCLAW_API_KEY not set — auth is disabled. Set it in .env for production.");
    }
  });
}

startServer().catch((err) => {
  console.error("[openclaw] Failed to start:", err.message);
  process.exit(1);
});
