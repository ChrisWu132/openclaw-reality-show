import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";

// Actions that produce no on-screen dialogue and need no audio
const HIDDEN_ACTIONS = new Set(["patrol_move", "access_terminal"]);

/**
 * Plays TTS voice audio when a new scene event arrives that has an audioUrl.
 *
 * Key invariant: lastIndexRef must be reset to 0 whenever sceneEvents resets
 * (i.e. when the game phase resets between sessions). Otherwise the index check
 * `sceneEvents.length <= lastIndexRef.current` will always be true on the second
 * and subsequent sessions, silencing all narration.
 */
export function useNarration(isMuted: boolean): void {
  const sceneEvents = useGameStore((s) => s.sceneEvents);
  const phase = useGameStore((s) => s.phase);
  const lastIndexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  // Reset when sceneEvents clears (new session or game reset)
  useEffect(() => {
    if (sceneEvents.length === 0 && lastIndexRef.current > 0) {
      lastIndexRef.current = 0;
      stopAudio();
    }
  }, [sceneEvents.length]);

  // Reset tracker when phase returns to picker/intro (between sessions)
  useEffect(() => {
    if (phase === "picker" || phase === "intro") {
      lastIndexRef.current = 0;
      stopAudio();
    }
  }, [phase]);

  useEffect(() => {
    if (sceneEvents.length === 0) return;
    if (sceneEvents.length <= lastIndexRef.current) return;

    const latest = sceneEvents[sceneEvents.length - 1];
    lastIndexRef.current = sceneEvents.length;

    // Skip events with no dialogue or hidden action types
    if (!latest.dialogue || HIDDEN_ACTIONS.has(latest.action)) return;

    // Skip if no audio URL (TTS disabled or generation failed)
    if (!latest.audioUrl) return;

    stopAudio();
    if (isMuted) return;

    const audio = new Audio(latest.audioUrl);
    audio.volume = 0.85;
    audioRef.current = audio;
    audio.play().catch(() => {
      // Browser autoplay policy: silently ignore — text typewriter still shows
    });
  }, [sceneEvents, isMuted]);

  // Stop audio on unmount
  useEffect(() => {
    return stopAudio;
  }, []);
}
