import { useState, useRef, useCallback, useEffect } from "react";
import { useGameStore } from "../stores/gameStore";

interface DialogueEntry {
  speaker: string;
  text: string;
  action?: string;
  audioUrl?: string;
}

interface DialogueStreamState {
  displayText: string;
  isStreaming: boolean;
  /** Typewriter finished — waiting for user click to advance */
  doneStreaming: boolean;
  speaker: string | null;
  action: string | null;
}

interface DialogueStreamControls extends DialogueStreamState {
  streamDialogue: (speaker: string, fullText: string, action?: string, audioUrl?: string) => void;
  clearDialogue: () => void;
}

export function useDialogueStream(): DialogueStreamControls {
  const [displayText, setDisplayText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [doneStreaming, setDoneStreaming] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const setWaitingForClick = useGameStore((s) => s.setWaitingForClick);

  const charTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<DialogueEntry[]>([]);
  const isProcessingRef = useRef(false);

  const stopAllTimers = useCallback(() => {
    if (charTimerRef.current !== null) {
      clearTimeout(charTimerRef.current);
      charTimerRef.current = null;
    }
  }, []);

  const clearDialogue = useCallback(() => {
    stopAllTimers();
    setDisplayText("");
    setIsStreaming(false);
    setDoneStreaming(false);
    setSpeaker(null);
    setAction(null);
    queueRef.current = [];
    isProcessingRef.current = false;
    setWaitingForClick(false);
  }, [stopAllTimers, setWaitingForClick]);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;
    const entry = queueRef.current.shift()!;
    stopAllTimers();

    setSpeaker(entry.speaker);
    setAction(entry.action || null);
    setDisplayText("");
    setIsStreaming(true);
    setDoneStreaming(false);
    setWaitingForClick(false);

    // When voice audio is present, reveal text instantly so the user can read
    // along while the audio plays. The voice IS the pacing — no typewriter needed.
    if (entry.audioUrl) {
      setDisplayText(entry.text);
      setIsStreaming(false);
      setDoneStreaming(true);
      setWaitingForClick(true);
      return;
    }

    let index = 0;
    const charSpeed = 20; // ms per character (fallback when no audio)

    function showNextChar() {
      if (index < entry.text.length) {
        index++;
        setDisplayText(entry.text.slice(0, index));
        charTimerRef.current = setTimeout(showNextChar, charSpeed);
      } else {
        // Typewriter complete — signal waiting for click
        setIsStreaming(false);
        setDoneStreaming(true);
        setWaitingForClick(true);
      }
    }

    charTimerRef.current = setTimeout(showNextChar, charSpeed);
  }, [stopAllTimers, setWaitingForClick]);

  // Listen for advanceDialogue clicks — when waitingForClick goes from true to false
  // while we have a finished dialogue showing, clear current and process next
  const waitingForClick = useGameStore((s) => s.waitingForClick);
  const prevWaitingRef = useRef(false);

  useEffect(() => {
    // Detect transition from waiting → not waiting (i.e., user clicked)
    if (prevWaitingRef.current && !waitingForClick && doneStreaming) {
      // Clear current dialogue
      setDisplayText("");
      setSpeaker(null);
      setAction(null);
      setDoneStreaming(false);
      // Small gap then process next from internal queue
      setTimeout(() => processNext(), 150);
    }
    prevWaitingRef.current = waitingForClick;
  }, [waitingForClick, doneStreaming, processNext]);

  const streamDialogue = useCallback(
    (newSpeaker: string, fullText: string, newAction?: string, newAudioUrl?: string) => {
      queueRef.current.push({
        speaker: newSpeaker,
        text: fullText,
        action: newAction,
        audioUrl: newAudioUrl,
      });

      if (!isProcessingRef.current) {
        processNext();
      }
    },
    [processNext],
  );

  useEffect(() => {
    return () => {
      stopAllTimers();
    };
  }, [stopAllTimers]);

  return { displayText, isStreaming, doneStreaming, speaker, action, streamDialogue, clearDialogue };
}
