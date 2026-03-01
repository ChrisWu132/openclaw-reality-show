import { createHash } from "crypto";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getVoiceId } from "./voice-config.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("tts-service");

const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";
// Use fileURLToPath so this works both inside the server (ESM) and when
// imported by the pre-gen script (tsx CJS transform)
const AUDIO_CACHE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../audio-cache",
);

// Track in-flight generation requests to prevent duplicate API calls
// for the same content when multiple requests arrive simultaneously
const pending = new Map<string, Promise<string | undefined>>();

const INTRO_TEXT =
  "A world where AI enforces the law. Humans comply... or disappear. " +
  "Your Coordinator is about to enter. It will enforce. It will judge. You can only watch.";

/**
 * Creates the audio cache directory if it doesn't exist.
 * Call once on server startup.
 */
export async function initAudioCacheDir(): Promise<void> {
  await mkdir(AUDIO_CACHE_DIR, { recursive: true });
  logger.info(`Audio cache directory ready: ${AUDIO_CACHE_DIR}`);
}

/**
 * Generates speech audio for the given text and speaker using ElevenLabs.
 * Results are cached by content hash — repeated calls for the same text are free.
 *
 * Returns a relative URL path "/audio/{hash}.mp3", or undefined if:
 *   - ELEVENLABS_API_KEY is not set
 *   - The speaker has no voice mapping
 *   - The ElevenLabs API call fails
 */
export async function generateAudio(
  text: string,
  speaker: string,
): Promise<string | undefined> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return undefined;

  const voiceId = getVoiceId(speaker);
  if (!voiceId) {
    logger.debug(`No voice mapping for speaker: ${speaker}`);
    return undefined;
  }

  if (!text.trim()) return undefined;

  // Cache key: hash of speaker + text so different speakers get different audio
  const hash = createHash("sha1")
    .update(`${speaker}:${text}`)
    .digest("hex")
    .slice(0, 16);

  const filename = `${hash}.mp3`;
  const filepath = path.join(AUDIO_CACHE_DIR, filename);
  const urlPath = `/audio/${filename}`;

  // Return cache hit immediately (file already written)
  if (await fileExists(filepath)) {
    logger.debug(`Cache hit: ${urlPath}`);
    return urlPath;
  }

  // Deduplicate in-flight requests for the same content
  if (pending.has(hash)) {
    return pending.get(hash)!;
  }

  const promise = callElevenLabs(text, voiceId, speaker, filepath, urlPath);
  pending.set(hash, promise);
  try {
    return await promise;
  } finally {
    pending.delete(hash);
  }
}

async function callElevenLabs(
  text: string,
  voiceId: string,
  speaker: string,
  filepath: string,
  urlPath: string,
): Promise<string | undefined> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  try {
    const response = await fetch(`${ELEVENLABS_API}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.warn(`ElevenLabs API error ${response.status} for speaker=${speaker}`, {
        status: response.status,
        body: errorBody.slice(0, 300),
      });
      return undefined;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    await writeFile(filepath, audioBuffer);
    logger.info(`Generated audio: ${urlPath} (${audioBuffer.length} bytes, speaker=${speaker})`);
    return urlPath;
  } catch (err) {
    logger.warn(`TTS generation failed for speaker=${speaker}`, {
      error: (err as Error).message,
    });
    return undefined;
  }
}

/**
 * Pre-generates the intro screen narrator audio at a known fixed filename.
 * Called once at server startup. Idempotent.
 */
export async function generateIntroAudio(): Promise<void> {
  if (!process.env.ELEVENLABS_API_KEY) return;
  const voiceId = getVoiceId("narrator");
  if (!voiceId) return;

  const filepath = path.join(AUDIO_CACHE_DIR, "intro.mp3");
  if (await fileExists(filepath)) {
    logger.debug("Intro audio already cached");
    return;
  }

  logger.info("Generating intro screen narrator audio...");
  await callElevenLabs(INTRO_TEXT, voiceId, "narrator", filepath, "/audio/intro.mp3");
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

/** Exposed for use by the pre-generation script */
export { AUDIO_CACHE_DIR };
