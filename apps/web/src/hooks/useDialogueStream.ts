import { useState, useRef, useCallback, useEffect } from "react";

interface DialogueEntry {
  speaker: string;
  text: string;
  action?: string;
}

interface DialogueStreamState {
  displayText: string;
  isStreaming: boolean;
  speaker: string | null;
  action: string | null;
}

interface DialogueStreamControls extends DialogueStreamState {
  streamDialogue: (speaker: string, fullText: string, action?: string) => void;
  clearDialogue: () => void;
}

/**
 * Calculate how long a dialogue should stay visible after streaming completes.
 * Based on text length — short lines stay shorter, long lines stay longer.
 */
function getHoldDuration(text: string): number {
  const words = text.split(/\s+/).length;
  // ~250ms per word, minimum 2.5s, maximum 8s
  return Math.max(2500, Math.min(8000, words * 250));
}

export function useDialogueStream(): DialogueStreamControls {
  const [displayText, setDisplayText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const charTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<DialogueEntry[]>([]);
  const isProcessingRef = useRef(false);

  const stopAllTimers = useCallback(() => {
    if (charTimerRef.current !== null) {
      clearTimeout(charTimerRef.current);
      charTimerRef.current = null;
    }
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const clearDialogue = useCallback(() => {
    stopAllTimers();
    setDisplayText("");
    setIsStreaming(false);
    setSpeaker(null);
    setAction(null);
    queueRef.current = [];
    isProcessingRef.current = false;
  }, [stopAllTimers]);

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

    let index = 0;
    const charSpeed = 20; // ms per character — faster than before

    function showNextChar() {
      if (index < entry.text.length) {
        index++;
        setDisplayText(entry.text.slice(0, index));
        charTimerRef.current = setTimeout(showNextChar, charSpeed);
      } else {
        setIsStreaming(false);
        const holdTime = getHoldDuration(entry.text);
        clearTimerRef.current = setTimeout(() => {
          // Fade out then process next
          setDisplayText("");
          setSpeaker(null);
          setAction(null);
          // Small gap between dialogues
          setTimeout(() => processNext(), 300);
        }, holdTime);
      }
    }

    charTimerRef.current = setTimeout(showNextChar, charSpeed);
  }, [stopAllTimers]);

  const streamDialogue = useCallback(
    (newSpeaker: string, fullText: string, newAction?: string) => {
      queueRef.current.push({
        speaker: newSpeaker,
        text: fullText,
        action: newAction,
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

  return { displayText, isStreaming, speaker, action, streamDialogue, clearDialogue };
}
