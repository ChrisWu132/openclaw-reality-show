import type { SurveillanceAssessment } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("presaige");

const BASE_URL = "https://api.presaige.ai/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 60_000;

interface PresaigeScores {
  presaige_score: number;
  readiness_score: number;
  wow_factor: number;
  elite_score: number;
  buzz_index: number;
  elite_engagement_score: number;
  benchmark_score: number;
}

function getApiKey(): string | null {
  return process.env.PRESAIGE_API_KEY || null;
}

async function presaigeFetch(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("PRESAIGE_API_KEY not set");

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Presaige ${res.status}: ${body}`);
  }
  return res;
}

async function uploadImage(imageBuffer: Buffer): Promise<string> {
  // Step 1: Get signed upload URL
  const uploadRes = await presaigeFetch("/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "scene-capture.png",
      content_type: "image/png",
    }),
  });
  const { upload_url, asset_key } = await uploadRes.json() as {
    upload_url: string;
    asset_key: string;
  };

  logger.info("Got upload URL", { asset_key });

  // Step 2: PUT the image to the signed URL
  await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: new Uint8Array(imageBuffer),
  });

  logger.info("Image uploaded", { asset_key });
  return asset_key;
}

async function pollJob<T>(pollPath: string): Promise<T> {
  const start = Date.now();
  let interval = POLL_INTERVAL_MS;

  while (Date.now() - start < MAX_POLL_TIME_MS) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await presaigeFetch(pollPath);
    const data = await res.json() as { status: string; [key: string]: unknown };

    if (data.status === "complete") {
      return data as T;
    }
    if (data.status === "failed") {
      throw new Error(`Presaige job failed: ${(data as { error?: string }).error || "unknown"}`);
    }

    // Exponential backoff: 2s → 3s → 4.5s, capped at 8s
    interval = Math.min(interval * 1.5, 8000);
  }

  throw new Error("Presaige polling timeout");
}

async function submitScore(assetKey: string): Promise<PresaigeScores> {
  const res = await presaigeFetch("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_key: assetKey, extended: true }),
  });
  const { poll_url } = await res.json() as { poll_url: string };
  logger.info("Score job submitted", { poll_url });

  const result = await pollJob<{ scores: PresaigeScores }>(poll_url);
  return result.scores;
}

async function submitRecommendations(assetKey: string): Promise<string[]> {
  const res = await presaigeFetch("/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_key: assetKey }),
  });
  const { poll_url } = await res.json() as { poll_url: string };
  logger.info("Recommendations job submitted", { poll_url });

  const result = await pollJob<{
    result: { summary: string[] };
  }>(poll_url);

  return result.result?.summary ?? [];
}

/**
 * Full assessment pipeline: upload screenshot → score + recommend (parallel) → return mapped result.
 * Returns null if PRESAIGE_API_KEY is unset or any step fails.
 */
export async function assessScene(imageBuffer: Buffer): Promise<SurveillanceAssessment | null> {
  if (!getApiKey()) {
    logger.info("PRESAIGE_API_KEY not set — skipping assessment");
    return null;
  }

  try {
    const assetKey = await uploadImage(imageBuffer);

    // Run score and recommendations in parallel
    const [scores, directives] = await Promise.all([
      submitScore(assetKey),
      submitRecommendations(assetKey),
    ]);

    logger.info("Assessment complete", { scores });

    // Remap social-media scores → in-universe Order terminology
    return {
      scores: {
        operationalReadiness: scores.readiness_score,
        deviationIndex: scores.wow_factor,
        authorityProjection: scores.elite_engagement_score,
        systemAlignment: scores.presaige_score,
        patrolEfficiency: scores.benchmark_score,
        complianceSignal: scores.buzz_index,
        overallRating: scores.elite_score,
      },
      directives,
      timestamp: Date.now(),
    };
  } catch (err) {
    logger.error("Presaige assessment failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
