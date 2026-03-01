import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "openclaw-mute";
const MUSIC_SRC   = "/music/under-the-bridge_XpTBgJ2X.mp3";

export function useBackgroundMusic(): {
  isMuted:      boolean;
  toggleMute:   () => void;
  triggerStart: () => void;
} {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const triggerStart = useCallback(() => {
    if (audioRef.current) {
      if (!isMutedRef.current) audioRef.current.play().catch(() => {});
      return;
    }
    const audio       = new Audio(MUSIC_SRC);
    audio.loop        = true;
    audio.volume      = 0.2;
    audio.muted       = isMutedRef.current;
    audioRef.current  = audio;
    audio.play().catch(() => {});
  }, []);

  // Attempt autoplay on mount; fall back to first-interaction if browser blocks it
  useEffect(() => {
    const audio      = new Audio(MUSIC_SRC);
    audio.loop       = true;
    audio.volume     = 0.2;
    audio.muted      = isMutedRef.current;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Autoplay blocked — wait for first user interaction
      const events = ["click", "keydown", "pointerdown"] as const;
      const handle = () => {
        if (audioRef.current && !isMutedRef.current) {
          audioRef.current.play().catch(() => {});
        }
        events.forEach((e) => document.removeEventListener(e, handle));
      };
      events.forEach((e) => document.addEventListener(e, handle));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    if (audioRef.current) audioRef.current.muted = next;
  }, []);

  return { isMuted, toggleMute, triggerStart };
}
