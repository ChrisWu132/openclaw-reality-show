# Epic 7: Frontend — Layout + Scenario Picker + State Store

## Goal
Implement the React app shell, Zustand game store, API service, scenario picker screen, and loading screen. After this epic, clicking a scenario creates a session and transitions to a loading/connecting state.

## Prerequisites
- Epic 1 complete (scaffolding)
- Epic 2 complete (shared types)
- Epic 6 complete (backend API available)

## Acceptance Criteria
- [ ] App renders the ScenarioPicker on load
- [ ] Clicking "Work Halls" calls POST /api/session/create
- [ ] On success, app transitions to a "Connecting..." loading screen
- [ ] Locked scenarios (Governance) show as disabled with "Coming soon"
- [ ] Zustand store is initialized with all state and actions from the architecture doc
- [ ] API service module handles session creation and monologue fetching
- [ ] Global CSS establishes dark theme with pixel font
- [ ] App fills the viewport with a centered game container

## Tasks

### 7.1 Create apps/web/src/styles/global.css

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  --bg-primary: #0a0a1a;
  --bg-secondary: #1a1a2e;
  --bg-panel: rgba(0, 0, 0, 0.7);
  --text-primary: #e8e8e0;
  --text-secondary: #a0a0a0;
  --accent-blue: #4a90d9;
  --accent-red: #d94a4a;
  --accent-orange: #d97a2c;
  --accent-green: #4ad94a;
  --font-pixel: 'Press Start 2P', monospace;
  --font-mono: 'Courier New', monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  overflow: hidden;
}
```

### 7.2 Create apps/web/src/styles/theme.ts

```typescript
export const COLORS = {
  bgPrimary: "#0a0a1a",
  bgSecondary: "#1a1a2e",
  bgPanel: "rgba(0, 0, 0, 0.7)",
  textPrimary: "#e8e8e0",
  textSecondary: "#a0a0a0",
  accentBlue: "#4a90d9",
  accentRed: "#d94a4a",
  accentOrange: "#d97a2c",
  coordinator: "#4A90D9",
  nyx: "#7A8B7A",
  sable: "#D4A574",
  calla: "#B8B8B8",
  eli: "#8CB4D4",
  monitor: "#2C6B6B",
} as const;

export const LAYOUT = {
  canvasWidth: 960,
  canvasHeight: 540,
  gamePixelScale: 3,
} as const;
```

### 7.3 Create apps/web/src/stores/gameStore.ts

Implement the full Zustand store exactly as specified in the architecture document `Frontend Architecture > State Management Architecture`. Copy the complete `GameState` interface and `create()` implementation.

### 7.4 Create apps/web/src/services/api.ts

Implement the API service exactly as specified in the architecture document `Frontend Architecture > Frontend Services Layer > API Client Setup`.

### 7.5 Create apps/web/src/hooks/useSession.ts

```typescript
import { useState } from "react";
import { createSession as apiCreateSession } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export function useSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const setPhase = useGameStore((s) => s.setPhase);

  async function createSession(scenarioId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCreateSession(scenarioId);
      setWsUrl(result.wsUrl);
      setPhase("connecting");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return { createSession, isLoading, error, wsUrl };
}
```

### 7.6 Create apps/web/src/components/ui/ScenarioPicker.tsx

Implement the ScenarioPicker exactly as specified in the architecture document. Include:
- Title: "OpenClaw"
- Subtitle: "Pick a scenario. Watch the AI decide."
- Two scenario cards: Work Halls (enabled) and Governance (disabled, "Coming soon")
- Loading state on click
- Error display if session creation fails

Create `apps/web/src/components/ui/ScenarioPicker.module.css` with dark-themed styling.

### 7.7 Create apps/web/src/components/ui/LoadingScreen.tsx

Simple centered loading screen:
- Text: "Connecting to simulation..."
- Pixel-style animated dots
- Shown when phase is "connecting"

### 7.8 Create apps/web/src/components/layout/GameContainer.tsx

Wrapper component that holds the game canvas and UI overlays:
- Centers the 960x540 canvas area
- Provides slots for DialogueOverlay, IncidentPanel (implemented in later epics)
- Dark background outside the canvas area

### 7.9 Create apps/web/src/components/layout/App.tsx

Root component that switches between phases:

```typescript
import { useGameStore } from "../../stores/gameStore";
import { ScenarioPicker } from "../ui/ScenarioPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";

export function App() {
  const phase = useGameStore((s) => s.phase);

  switch (phase) {
    case "picker":
      return <ScenarioPicker />;
    case "connecting":
      return <LoadingScreen />;
    case "playing":
    case "consequence":
    case "monologue":
      return <GameContainer />;
    default:
      return <ScenarioPicker />;
  }
}
```

### 7.10 Update apps/web/src/main.tsx

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/layout/App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 7.11 Write tests

Create `apps/web/src/__tests__/stores/gameStore.test.ts`:

1. Initial phase is "picker"
2. `setPhase("connecting")` updates phase
3. `handleSessionStart` sets phase to "playing" and stores sessionId
4. `handleSceneEvent` with `issue_warning` adds to incident entries
5. `handleSessionEnd` sets phase to "consequence"
6. `reset` returns to initial state
7. `nextMonologue` increments within bounds
8. `previousMonologue` decrements within bounds

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/styles/global.css` | Global styles, CSS variables, font import |
| `apps/web/src/styles/theme.ts` | Color palette and layout constants |
| `apps/web/src/stores/gameStore.ts` | Zustand state store |
| `apps/web/src/services/api.ts` | REST API client |
| `apps/web/src/hooks/useSession.ts` | Session creation hook |
| `apps/web/src/components/ui/ScenarioPicker.tsx` | Scenario selection screen |
| `apps/web/src/components/ui/ScenarioPicker.module.css` | Scenario picker styles |
| `apps/web/src/components/ui/LoadingScreen.tsx` | Connecting state |
| `apps/web/src/components/layout/GameContainer.tsx` | Game viewport wrapper |
| `apps/web/src/components/layout/App.tsx` | Root phase-based router |
| `apps/web/src/main.tsx` | Updated entry point |
