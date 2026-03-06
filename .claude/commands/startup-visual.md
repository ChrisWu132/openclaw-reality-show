# /startup-visual — AI Startup Arena Visual Audit

Runs the Playwright visual test for AI Startup Arena, reads screenshots, and outputs improvement suggestions.

## Steps

### Step 1: Confirm prerequisites
- Confirm `test-startup-visual.mjs` exists and is syntactically correct
- Confirm dev server is running: `curl http://localhost:3001/api/health`
- If server is not running, tell user to run `npm run dev`

### Step 2: Run the test
- Clean old screenshots: `rm -rf screenshots/startup-v1`
- Run: `node test-startup-visual.mjs`
- Expected: 12-15 screenshots + 1 .webm video in `screenshots/startup-v1/`

### Step 3: Read key frames
Read the following screenshots using the Read tool:
1. Login: `01-login-screen`, `02-after-login`
2. Mode select: `04-mode-select`
3. Startup lobby: `05-startup-lobby`, `06-startup-lobby-ready`
4. Game initial: `07-game-initial`
5. Quarter captures: `08-game-q1` through `12-game-q5`
6. Late game / results: `13-game-late`, `14-game-results`

### Step 4: Evaluate each frame
For each screenshot, check:
- **Agent cards**: Are they readable? Resource bars visible? Action history clear?
- **Bubble map**: Is the ecosystem map updating? Are bubbles sized correctly?
- **Valuation chart**: Is it visible and scaling properly? Line colors distinguishable?
- **Market event banner**: Is it appearing? Text readable? Color coding correct?
- **Reasoning spotlight**: Is the typewriter animation visible? Text readable?
- **Turn log**: Are entries readable? Scrolling working? Color coding for events?
- **Thinking indicator**: Does "AI DECIDING" appear during agent turns?
- **Results screen**: Is the narrative displayed? Standings table readable? Action distribution chart?
- **General**: Font sizes adequate? Layout balanced? No overlapping elements?

### Step 5: Output findings
Format findings as:
1. Each issue with screenshot number as evidence
2. Prioritized: P0 (blocks experience) > P1 (hurts readability) > P2 (polish)
3. Specific fix suggestion + file to modify
4. Enter plan mode and wait for user confirmation before implementing fixes
