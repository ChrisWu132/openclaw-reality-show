import { Router } from "express";
import { getSession } from "../engine/state-manager.js";
import { getSessionWs } from "../ws/ws-server.js";
import { assessScene } from "../integrations/presaige-client.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("assessment-route");

export const assessmentRouter = Router();

/**
 * POST /api/session/:sessionId/assess
 * Body: { screenshot: "data:image/png;base64,..." }
 *
 * Fires off a Presaige assessment asynchronously.
 * When results arrive, emits assessment_complete via WebSocket
 * and stores the assessment on the session object.
 */
assessmentRouter.post("/session/:sessionId/assess", (req, res) => {
  const { sessionId } = req.params;
  const { screenshot } = req.body as { screenshot?: string };

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.status !== "ended") {
    res.status(400).json({ error: "Session has not ended yet" });
    return;
  }
  if (!screenshot || !screenshot.startsWith("data:image/png;base64,")) {
    res.status(400).json({ error: "Invalid screenshot data" });
    return;
  }

  // Respond immediately — assessment runs in background
  res.json({ jobStarted: true });

  // Decode base64 → Buffer and run assessment
  const base64Data = screenshot.replace(/^data:image\/png;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  assessScene(imageBuffer)
    .then((assessment) => {
      if (!assessment) {
        logger.info("No assessment returned (API key missing or call failed)", { sessionId });
        return;
      }

      // Store on session
      session.assessment = assessment;

      // Push via WebSocket
      const ws = getSessionWs(sessionId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: "assessment_complete",
          assessment,
        }));
        logger.info("Assessment sent via WebSocket", { sessionId });
      } else {
        logger.warn("WebSocket not available for assessment delivery", { sessionId });
      }
    })
    .catch((err) => {
      logger.error("Assessment pipeline error", {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
});
