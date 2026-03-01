# Epic 10: Frontend — Consequence Scene + Monologue Reveal

## Goal
Implement the consequence scene display (narrated ending) and the post-game monologue viewer where spectators step through the Coordinator's hidden inner reasoning for each situation.

## Prerequisites
- Epic 9 complete (live play UI)
- Epic 6 complete (backend monologue endpoint)

## Acceptance Criteria
- [ ] After `session_end` event, the scene transitions to full-screen consequence narration
- [ ] Consequence text appears line by line with 2-second intervals
- [ ] Consequence scene uses white text on dark background (no sprites)
- [ ] Nyx modifier text appears at the end of any consequence scene when `nyxModifier` is true
- [ ] After consequence scene, "Reveal inner monologue" button appears
- [ ] Clicking "Reveal" fetches monologue via GET /api/session/:id/monologue
- [ ] Monologue viewer shows one situation at a time — situation label + reasoning text
- [ ] Next/Previous navigation between the 6 monologue entries
- [ ] "Watch another" button at the end returns to scenario picker
- [ ] All transitions feel smooth (fade in/out)

## Tasks

### 10.1 Create apps/web/src/components/ui/ConsequenceScene.tsx

Full-screen narrated consequence:

```typescript
import { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";

export function ConsequenceScene() {
  const consequenceScene = useGameStore((s) => s.consequenceScene);
  const nyxModifier = useGameStore((s) => s.nyxModifier);
  const setPhase = useGameStore((s) => s.setPhase);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showRevealButton, setShowRevealButton] = useState(false);

  if (!consequenceScene) return null;

  // Get all dialogue lines from consequence events
  const lines = consequenceScene.events
    .filter((e) => e.dialogue)
    .map((e) => e.dialogue!);

  // Reveal lines one by one with 2-second intervals
  useEffect(() => {
    if (visibleLines < lines.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // All lines shown — show reveal button after 3 seconds
      const timer = setTimeout(() => setShowRevealButton(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a1a",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: "700px",
        width: "100%",
      }}>
        {/* Outcome title */}
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          color: "#4a90d9",
          marginBottom: "30px",
          opacity: visibleLines > 0 ? 1 : 0,
          transition: "opacity 1s",
        }}>
          {consequenceScene.title}
        </div>

        {/* Narration lines */}
        {lines.slice(0, visibleLines).map((line, i) => (
          <p key={i} style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "10px",
            color: "#e8e8e0",
            lineHeight: "2.2",
            marginBottom: "16px",
            opacity: 1,
            animation: "fadeIn 1s ease-in",
          }}>
            {line}
          </p>
        ))}

        {/* Reveal button */}
        {showRevealButton && (
          <button
            onClick={() => setPhase("monologue")}
            style={{
              marginTop: "40px",
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid #4a90d9",
              color: "#4a90d9",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "10px",
              cursor: "pointer",
              animation: "fadeIn 1s ease-in",
            }}
          >
            Reveal inner monologue.
          </button>
        )}
      </div>
    </div>
  );
}
```

### 10.2 Create apps/web/src/hooks/useMonologue.ts

```typescript
import { useState } from "react";
import { getMonologue } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export function useMonologue() {
  const sessionId = useGameStore((s) => s.sessionId);
  const setMonologue = useGameStore((s) => s.setMonologue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMonologue() {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const entries = await getMonologue(sessionId);
      setMonologue(entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return { fetchMonologue, isLoading, error };
}
```

### 10.3 Create apps/web/src/components/ui/MonologueViewer.tsx

Sequential read-only viewer:

```typescript
import { useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";
import { useMonologue } from "../../hooks/useMonologue";

export function MonologueViewer() {
  const entries = useGameStore((s) => s.monologueEntries);
  const currentIndex = useGameStore((s) => s.currentMonologueIndex);
  const nextMonologue = useGameStore((s) => s.nextMonologue);
  const previousMonologue = useGameStore((s) => s.previousMonologue);
  const reset = useGameStore((s) => s.reset);
  const { fetchMonologue, isLoading } = useMonologue();

  // Fetch monologue on mount if not already loaded
  useEffect(() => {
    if (entries.length === 0) {
      fetchMonologue();
    }
  }, []);

  if (isLoading || entries.length === 0) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a1a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "10px",
        color: "#a0a0a0",
      }}>
        Loading inner monologue...
      </div>
    );
  }

  const current = entries[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === entries.length - 1;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a1a",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
    }}>
      <div style={{ maxWidth: "700px", width: "100%" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: "#a0a0a0",
          }}>
            INNER MONOLOGUE
          </div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: "#4a90d9",
          }}>
            {currentIndex + 1} / {entries.length}
          </div>
        </div>

        {/* Situation label */}
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "12px",
          color: "#4a90d9",
          marginBottom: "20px",
        }}>
          Situation {current.situation}: {current.label}
        </div>

        {/* Reasoning text */}
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "14px",
          color: "#e8e8e0",
          lineHeight: "2",
          marginBottom: "40px",
          padding: "20px",
          background: "rgba(74, 144, 217, 0.05)",
          border: "1px solid rgba(74, 144, 217, 0.1)",
          borderRadius: "4px",
          whiteSpace: "pre-wrap",
        }}>
          {current.reasoning}
        </div>

        {/* Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <button
            onClick={previousMonologue}
            disabled={isFirst}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${isFirst ? "#333" : "#4a90d9"}`,
              color: isFirst ? "#333" : "#4a90d9",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              cursor: isFirst ? "default" : "pointer",
            }}
          >
            Previous
          </button>

          {isLast ? (
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #4a90d9",
                color: "#4a90d9",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                cursor: "pointer",
              }}
            >
              Watch another
            </button>
          ) : (
            <button
              onClick={nextMonologue}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #4a90d9",
                color: "#4a90d9",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                cursor: "pointer",
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 10.4 Update App.tsx

Add consequence and monologue phases:

```typescript
import { useGameStore } from "../../stores/gameStore";
import { ScenarioPicker } from "../ui/ScenarioPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";
import { ConsequenceScene } from "../ui/ConsequenceScene";
import { MonologueViewer } from "../ui/MonologueViewer";

export function App() {
  const phase = useGameStore((s) => s.phase);

  switch (phase) {
    case "picker":
      return <ScenarioPicker />;
    case "connecting":
      return <LoadingScreen />;
    case "playing":
      return <GameContainer />;
    case "consequence":
      return <ConsequenceScene />;
    case "monologue":
      return <MonologueViewer />;
    default:
      return <ScenarioPicker />;
  }
}
```

### 10.5 Add CSS animation keyframes

Add to `global.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/ConsequenceScene.tsx` | Narrated ending display |
| `apps/web/src/hooks/useMonologue.ts` | Monologue data fetching |
| `apps/web/src/components/ui/MonologueViewer.tsx` | Post-game reasoning stepper |
