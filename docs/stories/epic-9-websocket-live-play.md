# Epic 9: Frontend — WebSocket Integration + Live Play UI

## Goal
Connect the frontend to the backend via WebSocket. Wire up event handlers to update the game store, move sprites, stream dialogue, and display incidents in real time. After this epic, a full session plays through visually.

## Prerequisites
- Epic 7 complete (frontend layout + store)
- Epic 8 complete (PixiJS scene)
- Epic 6 complete (backend WebSocket server)

## Acceptance Criteria
- [ ] WebSocket connects after session creation and receives `session_start`
- [ ] `situation_transition` events update the zone label and situation indicator
- [ ] NPC `scene_event` actions are processed (move sprites, show dialogue)
- [ ] Coordinator `scene_event` actions are processed
- [ ] Dialogue text streams character-by-character at 30ms intervals
- [ ] Dialogue persists for 3 seconds then fades over 500ms
- [ ] `issue_warning` and `log_incident` events appear in the incident panel
- [ ] `observe` action highlights the target sprite
- [ ] `patrol_move` action moves the Coordinator sprite
- [ ] Session status indicator shows current situation number
- [ ] Full session plays through from start to `session_end` event

## Tasks

### 9.1 Create apps/web/src/hooks/useWebSocket.ts

Implement exactly as specified in the architecture document. The hook:
- Takes a `wsUrl` string (or null)
- Opens WebSocket connection when wsUrl is set
- Dispatches events to the Zustand store via switch/case
- Cleans up on unmount
- Handles close codes (4004, 4009)

### 9.2 Create apps/web/src/hooks/useDialogueStream.ts

Character-by-character text streaming:

```typescript
import { useState, useEffect, useRef } from "react";

interface DialogueStreamState {
  displayText: string;
  isStreaming: boolean;
  speaker: string | null;
}

export function useDialogueStream() {
  const [state, setState] = useState<DialogueStreamState>({
    displayText: "",
    isStreaming: false,
    speaker: null,
  });
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  function streamDialogue(speaker: string, fullText: string) {
    // Clear any existing stream
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setState({ displayText: "", isStreaming: true, speaker });

    let charIndex = 0;
    intervalRef.current = window.setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setState((prev) => ({
          ...prev,
          displayText: fullText.substring(0, charIndex),
        }));
      } else {
        // Streaming complete — persist for 3 seconds then fade
        clearInterval(intervalRef.current!);
        setState((prev) => ({ ...prev, isStreaming: false }));

        timeoutRef.current = window.setTimeout(() => {
          setState({ displayText: "", isStreaming: false, speaker: null });
        }, 3000);
      }
    }, 30); // 30ms per character
  }

  function clearDialogue() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState({ displayText: "", isStreaming: false, speaker: null });
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { ...state, streamDialogue, clearDialogue };
}
```

### 9.3 Create apps/web/src/components/scene/DialogueOverlay.tsx

Renders dialogue text above the scene canvas:

```typescript
import { useDialogueStream } from "../../hooks/useDialogueStream";
import { useGameStore } from "../../stores/gameStore";
import { useEffect } from "react";
import { COLORS } from "../../styles/theme";

const SPEAKER_COLORS: Record<string, string> = {
  coordinator: COLORS.coordinator,
  nyx: COLORS.nyx,
  sable: COLORS.sable,
  calla: COLORS.calla,
  eli: COLORS.eli,
  monitor: COLORS.monitor,
  narrator: COLORS.textSecondary,
};

export function DialogueOverlay() {
  const { displayText, isStreaming, speaker, streamDialogue } = useDialogueStream();
  const sceneEvents = useGameStore((s) => s.sceneEvents);

  // When a new scene event with dialogue arrives, start streaming
  useEffect(() => {
    const lastEvent = sceneEvents[sceneEvents.length - 1];
    if (lastEvent?.dialogue) {
      streamDialogue(lastEvent.speaker, lastEvent.dialogue);
    }
  }, [sceneEvents.length]);

  if (!displayText || !speaker) return null;

  const isNarrator = speaker === "narrator";

  return (
    <div style={{
      position: "absolute",
      bottom: isNarrator ? "20px" : "auto",
      top: isNarrator ? "auto" : "20px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "800px",
      padding: "12px 16px",
      background: "rgba(0, 0, 0, 0.85)",
      border: `1px solid ${SPEAKER_COLORS[speaker] || "#444"}`,
      borderRadius: "4px",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: isNarrator ? "10px" : "11px",
      color: isNarrator ? "#a0a0a0" : "#e8e8e0",
      lineHeight: "1.8",
      zIndex: 20,
      opacity: isStreaming ? 1 : undefined,
      transition: "opacity 0.5s ease-out",
    }}>
      {!isNarrator && (
        <div style={{
          fontSize: "8px",
          color: SPEAKER_COLORS[speaker] || "#888",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}>
          {speaker}
        </div>
      )}
      <div>{displayText}</div>
      {isStreaming && <span style={{ opacity: 0.5 }}>_</span>}
    </div>
  );
}
```

### 9.4 Create apps/web/src/components/ui/IncidentPanel.tsx

Side panel showing logged incidents:

```typescript
import { useGameStore } from "../../stores/gameStore";

export function IncidentPanel() {
  const entries = useGameStore((s) => s.incidentEntries);

  if (entries.length === 0) return null;

  return (
    <div style={{
      position: "absolute",
      top: "40px",
      right: "8px",
      width: "280px",
      maxHeight: "400px",
      overflowY: "auto",
      padding: "8px",
      background: "rgba(0, 0, 0, 0.7)",
      border: "1px solid #2D2D3D",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "7px",
      color: "#a0a0a0",
      lineHeight: "1.6",
      zIndex: 15,
    }}>
      <div style={{ color: "#d94a4a", marginBottom: "8px", fontSize: "8px" }}>
        INCIDENT LOG
      </div>
      {entries.map((entry, i) => (
        <div key={i} style={{
          padding: "4px 0",
          borderBottom: "1px solid #1a1a2e",
          color: entry.includes("detain") ? "#d94a4a" : "#a0a0a0",
        }}>
          {entry}
        </div>
      ))}
    </div>
  );
}
```

### 9.5 Create apps/web/src/components/ui/SessionStatus.tsx

Shows current situation number:

```typescript
import { useGameStore } from "../../stores/gameStore";

export function SessionStatus() {
  const currentSituation = useGameStore((s) => s.currentSituation);
  const totalSituations = useGameStore((s) => s.totalSituations);

  if (currentSituation === 0) return null;

  return (
    <div style={{
      position: "absolute",
      top: "8px",
      right: "8px",
      padding: "4px 8px",
      background: "rgba(0, 0, 0, 0.7)",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "8px",
      color: "#4a90d9",
      zIndex: 10,
    }}>
      {currentSituation} / {totalSituations}
    </div>
  );
}
```

### 9.6 Update GameContainer.tsx

Wire everything together:

```typescript
import { SceneCanvas } from "../scene/SceneCanvas";
import { DialogueOverlay } from "../scene/DialogueOverlay";
import { IncidentPanel } from "../ui/IncidentPanel";
import { SessionStatus } from "../ui/SessionStatus";
import { ZoneLabel } from "../scene/ZoneLabel";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useSession } from "../../hooks/useSession";

export function GameContainer() {
  const { wsUrl } = useSession();
  useWebSocket(wsUrl);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100vw",
      height: "100vh",
      background: "#0a0a1a",
    }}>
      <div style={{ position: "relative" }}>
        <SceneCanvas />
        <ZoneLabel />
        <SessionStatus />
        <DialogueOverlay />
        <IncidentPanel />
      </div>
    </div>
  );
}
```

### 9.7 Create scene event processor

A hook or utility that processes scene events and triggers sprite animations:

```typescript
// apps/web/src/hooks/useSceneProcessor.ts
import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { moveSpriteTo, highlightSprite } from "../pixi/animations";
import { SITUATION_POSITIONS } from "../pixi/constants";

// This hook watches scene events and triggers visual actions
export function useSceneProcessor(sprites: Map<string, any>) {
  const sceneEvents = useGameStore((s) => s.sceneEvents);
  const currentSituation = useGameStore((s) => s.currentSituation);

  useEffect(() => {
    const lastEvent = sceneEvents[sceneEvents.length - 1];
    if (!lastEvent) return;

    const sprite = sprites.get(lastEvent.speaker);

    switch (lastEvent.action) {
      case "patrol_move": {
        const coordSprite = sprites.get("coordinator");
        const target = SITUATION_POSITIONS[currentSituation];
        if (coordSprite && target) {
          moveSpriteTo(coordSprite, target.x, target.y);
        }
        break;
      }
      case "observe": {
        const targetSprite = lastEvent.target ? sprites.get(lastEvent.target) : null;
        if (targetSprite) highlightSprite(targetSprite);
        break;
      }
      case "issue_warning":
      case "detain": {
        const targetSprite = lastEvent.target ? sprites.get(lastEvent.target) : null;
        if (targetSprite) highlightSprite(targetSprite, 5000);
        break;
      }
    }
  }, [sceneEvents.length]);
}
```

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/useWebSocket.ts` | WebSocket connection and event dispatch |
| `apps/web/src/hooks/useDialogueStream.ts` | Character-by-character text streaming |
| `apps/web/src/hooks/useSceneProcessor.ts` | Scene event → sprite animation mapping |
| `apps/web/src/components/scene/DialogueOverlay.tsx` | Dialogue text display |
| `apps/web/src/components/ui/IncidentPanel.tsx` | Incident log side panel |
| `apps/web/src/components/ui/SessionStatus.tsx` | Situation counter |
