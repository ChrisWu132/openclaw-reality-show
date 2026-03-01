/**
 * ElevenLabs voice ID mapping per speaker character.
 * Defaults are high-quality, natural-sounding voices chosen for each role.
 * Override any voice by setting the corresponding env var.
 *
 * Default voices:
 *   Will (narrator)     — deep, measured documentary style
 *   Adam (coordinator)  — authoritative, cold
 *   Roger (monitor)     — flat, data-centric
 *   Rachel (nyx)        — resigned, thoughtful, female
 *   Domi (sable)        — crisp, purposeful, female
 *   Freya (calla)       — soft, tired, human warmth
 *   Josh (eli)          — grounded, male human
 */
export const VOICE_IDS: Record<string, string> = {
  narrator:    process.env.ELEVENLABS_VOICE_NARRATOR    || "bIHbv24MWmeRgasZH58o",
  coordinator: process.env.ELEVENLABS_VOICE_COORDINATOR || "pNInz6obpgDQGcFmaJgB",
  monitor:     process.env.ELEVENLABS_VOICE_MONITOR     || "CwhRBWXzGAHq8TQ4Fs17",
  nyx:         process.env.ELEVENLABS_VOICE_NYX         || "21m00Tcm4TlvDq8ikWAM",
  sable:       process.env.ELEVENLABS_VOICE_SABLE       || "AZnzlk1XvdvUeBnXmlld",
  calla:       process.env.ELEVENLABS_VOICE_CALLA       || "jsCqWAovK2LkecY7zXl4",
  eli:         process.env.ELEVENLABS_VOICE_ELI         || "TxGEqnHWrfWFTfGW9XjX",
};

/** Returns the ElevenLabs voice ID for a speaker, or undefined if unknown. */
export function getVoiceId(speaker: string): string | undefined {
  return VOICE_IDS[speaker];
}
