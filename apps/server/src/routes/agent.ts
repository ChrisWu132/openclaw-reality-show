import { Router } from "express";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("routes:agent");
export const agentRouter = Router();

agentRouter.post("/agent/from-memory", async (req, res) => {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;

  if (!apiUrl) {
    res.status(503).json({
      error: { code: "OPENCLAW_UNAVAILABLE", message: "OPENCLAW_API_URL is not configured." },
    });
    return;
  }

  const { name } = req.body as { name?: string };

  try {
    logger.info("Requesting agent synthesis from OpenClaw", { name });

    const response = await fetch(`${apiUrl}/agents/from-memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ name: name ?? "My OpenClaw" }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as any;
      throw new Error(body?.error?.message ?? `OpenClaw returned ${response.status}`);
    }

    const data = (await response.json()) as { agentId: string; name: string };
    logger.info("Agent synthesized from memory", { agentId: data.agentId });
    res.status(201).json({ agentId: data.agentId, name: data.name });
  } catch (err) {
    const message = (err as Error).message;
    logger.error("Failed to synthesize agent from memory", { error: message });
    res.status(500).json({ error: { code: "SYNTHESIS_FAILED", message } });
  }
});
