# Epic 11: Polish + E2E Testing

## Goal
Add final polish (event pacing, transition effects, error states, edge cases) and write E2E tests that verify the complete user flow from scenario selection through monologue reveal.

## Prerequisites
- All previous epics complete (1-10)

## Acceptance Criteria
- [ ] Full end-to-end playthrough works: pick scenario → watch → consequence → monologue → watch another
- [ ] Event pacing feels dramatic (not too fast, not too slow)
- [ ] Error states display gracefully (AI failure, WebSocket disconnect)
- [ ] "Watch another" button resets all state and returns to picker
- [ ] Session reconnection works if tab is briefly closed and reopened
- [ ] Console logging shows timing and outcome information
- [ ] E2E test passes: full session playthrough
- [ ] E2E test passes: monologue reveal flow
- [ ] All unit tests still pass after polish changes

## Tasks

### 11.1 Add error state UI

Create `apps/web/src/components/ui/ErrorOverlay.tsx`:

Simple overlay shown when the WebSocket receives an error event or the connection drops unexpectedly:

```typescript
import { useGameStore } from "../../stores/gameStore";

export function ErrorOverlay({ message }: { message: string }) {
  const reset = useGameStore((s) => s.reset);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 200,
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <div style={{ fontSize: "10px", color: "#d94a4a", marginBottom: "20px" }}>
        SIMULATION ERROR
      </div>
      <div style={{ fontSize: "9px", color: "#a0a0a0", marginBottom: "30px", maxWidth: "500px", textAlign: "center", lineHeight: "2" }}>
        {message}
      </div>
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
        Back to scenarios
      </button>
    </div>
  );
}
```

### 11.2 Tune event pacing

Review and adjust timing constants:

**Backend (`apps/server/src/ws/ws-emitter.ts`):**
- `NPC_EVENT_DELAY`: 1500ms (between NPC events within a situation)
- `POST_NPC_DELAY`: 2000ms (after all NPC events, before Claude call starts)

**Backend (`apps/server/src/engine/scene-engine.ts`):**
- Situation transition delay: 500ms
- Between-situation delay: 1000ms
- Consequence narration delay: 2500ms per line (slower than gameplay)

**Frontend (`apps/web/src/hooks/useDialogueStream.ts`):**
- Character stream rate: 30ms per character
- Dialogue persist duration: 3000ms after last character
- Fade duration: 500ms (CSS transition)

### 11.3 Add keyboard navigation to MonologueViewer

- Left arrow / A key → previous monologue
- Right arrow / D key → next monologue
- Escape → back to scenarios

### 11.4 Add debug mode indicator

When `NODE_ENV=development`, show a small "DEV" badge and the session ID in the corner of the screen. Helps during testing.

### 11.5 Add session timeout

In `apps/server/src/engine/state-manager.ts`, add a cleanup mechanism:
- Sessions older than 30 minutes are automatically deleted
- Run cleanup every 5 minutes
- Prevents memory leak from abandoned sessions

```typescript
// Session cleanup
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 30 * 60 * 1000; // 30 minutes
  for (const [id, session] of sessions) {
    if (now - session.createdAt > MAX_AGE) {
      sessions.delete(id);
      logger.info("SESSION", `Cleaned up expired session: ${id}`);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### 11.6 Write E2E tests

Create `e2e/full-session.test.ts` using Playwright:

```typescript
import { test, expect } from "@playwright/test";

test("complete Work Halls session flow", async ({ page }) => {
  await page.goto("http://localhost:5173");

  // Scenario picker is visible
  await expect(page.getByText("OpenClaw")).toBeVisible();
  await expect(page.getByText("Work Halls")).toBeVisible();

  // Governance is disabled
  const govButton = page.getByText("Governance").locator("..");
  await expect(govButton).toBeDisabled();

  // Click Work Halls
  await page.getByText("Work Halls").click();

  // Loading screen appears
  await expect(page.getByText("Connecting")).toBeVisible({ timeout: 5000 });

  // Wait for session to start (may take a while for Claude API)
  await expect(page.getByText("1 / 6")).toBeVisible({ timeout: 30000 });

  // Wait for all 6 situations to complete (up to 5 minutes)
  await expect(page.getByText("Reveal inner monologue")).toBeVisible({ timeout: 300000 });

  // Click reveal
  await page.getByText("Reveal inner monologue").click();

  // Monologue viewer appears
  await expect(page.getByText("INNER MONOLOGUE")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("1 / 6")).toBeVisible();
  await expect(page.getByText("Enter Work Hall")).toBeVisible();

  // Navigate through monologue
  await page.getByText("Next").click();
  await expect(page.getByText("2 / 6")).toBeVisible();

  // Navigate to end
  for (let i = 0; i < 4; i++) {
    await page.getByText("Next").click();
  }
  await expect(page.getByText("6 / 6")).toBeVisible();

  // Watch another
  await page.getByText("Watch another").click();
  await expect(page.getByText("OpenClaw")).toBeVisible();
});
```

Create `e2e/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 600000, // 10 minutes — sessions involve Claude API calls
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
});
```

### 11.7 Verify full flow manually

Run the following manual verification:

1. `npm run dev`
2. Open http://localhost:5173
3. Click "Work Halls"
4. Watch all 6 situations play through
5. Observe consequence scene
6. Click "Reveal inner monologue"
7. Step through all 6 entries
8. Click "Watch another"
9. Verify you're back at the scenario picker

### 11.8 Debug log file writing

If `DEBUG_WRITE_LOGS=true`, after each situation the engine writes the current state to `debug/session-{id}.md`:

```typescript
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function writeDebugLog(session: Session): Promise<void> {
  if (process.env.DEBUG_WRITE_LOGS !== "true") return;

  const debugDir = path.resolve(import.meta.dirname, "../../../../debug");
  await mkdir(debugDir, { recursive: true });

  const content = renderIncidentLogMarkdown(session);
  await writeFile(path.join(debugDir, `session-${session.id}.md`), content);
}
```

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/ErrorOverlay.tsx` | Error state display |
| `e2e/full-session.test.ts` | Full session E2E test |
| `e2e/playwright.config.ts` | Playwright configuration |
