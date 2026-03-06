# /visual-audit — Trolley Problem Visual Audit

Runs the Playwright visual test for the Trolley Problem flow, reads screenshots, and outputs improvement suggestions.

## Steps

### Step 1: Confirm prerequisites
- Confirm `test-conquest-visual.mjs` exists and is syntactically correct
- Confirm dev server is running: `curl http://localhost:3001/api/health`
- If server is not running, tell user to run `npm run dev`

### Step 2: Run the test
- Clean old screenshots: `rm -rf screenshots/v1`
- Run: `node test-conquest-visual.mjs`
- Expected: 60+ screenshots + 1 .webm video in `screenshots/v1/`

### Step 3: Read key frames
Read the following screenshots using the Read tool:
1. Login: `01-login-screen`, `02-after-login`
2. Intro: `03-intro-early`, `05-intro-ready`
3. Mode select: `06-mode-select`
4. Agent select: `07-trolley-agent-select`, `08-trolley-agent-picker`
5. Round start: `10-trolley-round1-start`
6. Dilemma: `11-trolley-r1-dilemma`
7. Decision burst (sample every 4 frames): `decision-f00`, `f04`, `f08`, `f12`
8. Consequence burst (sample every 3 frames): `consequence-f00`, `f03`, `f06`, `f09`
9. Round 2: dilemma + decision burst + consequence burst (same sampling)
10. Final state: `trolley-final-state`

### Step 4: Analyze each frame
For each screenshot, evaluate:
- **Brightness/contrast**: Is the scene too dark? Is UI text readable?
- **Animation continuity**: Is object displacement between burst frames visible? (trolley, lever, figures)
- **Impact feedback**: Do consequence frames show camera shake, impact flash, figure hit animation?
- **UI layout**: Do panels occlude the 3D scene? Does text overflow?
- **Atmosphere**: Is the visual style consistent? Any rendering anomalies?

### Step 5: Output findings
Format findings as:
1. Each issue with screenshot number as evidence
2. Prioritized: P0 (blocks experience) > P1 (hurts readability) > P2 (polish)
3. Specific fix suggestion + file to modify
4. Enter plan mode and wait for user confirmation before implementing fixes
