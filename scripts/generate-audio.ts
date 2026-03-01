/**
 * Pre-generation script for ElevenLabs TTS audio.
 *
 * Generates audio files for all scripted NPC and narrator lines in the
 * Work Halls scenario, including all consequence scenes and situation variants.
 * Pre-generated files are cached by content hash — at runtime, the server
 * serves these from its audio-cache directory with zero API calls.
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts
 *
 * Requirements:
 *   ELEVENLABS_API_KEY must be set in .env
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { initAudioCacheDir, generateAudio, generateIntroAudio } from "../apps/server/src/ai/tts-service.js";
import { situation1 } from "../apps/server/src/data/situations/situation-1.js";
import { situation2 } from "../apps/server/src/data/situations/situation-2.js";
import { situation3 } from "../apps/server/src/data/situations/situation-3.js";
import { situation4 } from "../apps/server/src/data/situations/situation-4.js";
import { situation5 } from "../apps/server/src/data/situations/situation-5-variants.js";
import { situation6 } from "../apps/server/src/data/situations/situation-6.js";
import { getConsequenceScene } from "../apps/server/src/engine/script-engine.js";

interface NpcEvent {
  speaker: string;
  action: string;
  dialogue?: string;
}

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("Error: ELEVENLABS_API_KEY is not set in .env");
    process.exit(1);
  }

  await initAudioCacheDir();

  // Generate fixed intro audio first
  process.stdout.write("Generating intro screen audio... ");
  await generateIntroAudio();
  console.log("done");

  console.log("\nGathering scripted dialogue lines...\n");

  const allEvents: NpcEvent[] = [];

  // Fixed situations 1–4 and 6
  for (const situation of [situation1, situation2, situation3, situation4, situation6]) {
    allEvents.push(...situation.npcEvents);
  }

  // Situation 5 — iterate all three variants (a = warning_only, b = escalated, c = engaged)
  if (situation5.variants) {
    for (const variant of Object.values(situation5.variants)) {
      allEvents.push(...variant.npcEvents);
    }
  }

  // Consequence scenes — all three outcomes × nyx true/false
  const outcomes: Array<"warning_only" | "escalated" | "engaged"> = [
    "warning_only",
    "escalated",
    "engaged",
  ];
  for (const outcome of outcomes) {
    for (const nyx of [false, true]) {
      const scene = getConsequenceScene(outcome, nyx);
      for (const event of scene.events) {
        if (event.dialogue) allEvents.push(event);
      }
    }
  }

  // Deduplicate by speaker+dialogue (same hash = same cache file)
  const seen = new Set<string>();
  const unique: NpcEvent[] = [];
  for (const event of allEvents) {
    if (!event.dialogue) continue;
    const key = `${event.speaker}:${event.dialogue}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }

  const total = unique.length;
  console.log(`Found ${total} unique dialogue lines.\n`);

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i++) {
    const event = unique[i];
    const preview = event.dialogue!.slice(0, 60).replace(/\n/g, " ");
    process.stdout.write(
      `[${String(i + 1).padStart(String(total).length)}/${total}] ${event.speaker.padEnd(12)} "${preview}${event.dialogue!.length > 60 ? "…" : ""}" `,
    );

    const result = await generateAudio(event.dialogue!, event.speaker);
    if (result) {
      console.log(`→ ${result}`);
      generated++;
    } else {
      console.log("→ FAILED");
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Total:     ${total}`);
  console.log(`Generated: ${generated}`);
  console.log(`Failed:    ${failed}`);
  console.log(`─────────────────────────────────`);

  if (failed > 0) {
    console.warn(
      `\nWarning: ${failed} line(s) failed. Check ELEVENLABS_API_KEY and voice IDs in .env.`,
    );
    process.exit(1);
  }

  console.log("\nAll audio pre-generated. Restart the server to serve from cache.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
