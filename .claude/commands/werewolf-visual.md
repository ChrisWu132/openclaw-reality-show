# /werewolf-visual — AI Werewolf Visual Audit

Runs the Playwright visual test for AI Werewolf, reads screenshots, and outputs improvement suggestions.

## Steps

### Step 1: Confirm prerequisites
- Confirm `test-werewolf-visual.mjs` exists and is syntactically correct
- Confirm dev server is running: `curl http://localhost:3001/api/health`
- If server is not running, tell user to run `npm run dev`

### Step 2: Run the test
- Clean old screenshots: `rm -rf screenshots/werewolf-v1`
- Run: `node test-werewolf-visual.mjs`
- Expected: 25-35 screenshots + 1 .webm video in `screenshots/werewolf-v1/`

### Step 3: Read key frames (MAX 12 screenshots to stay within context)
Read ONLY the following priority screenshots using the Read tool. Skip any that don't exist.
1. `04-mode-select` — mode selection screen
2. `05-werewolf-lobby` — lobby overview
3. `08-game-created` — game created state
4. `11-round1-dawn` — dawn announcement
5. `13-round1-discussion-1` — first discussion bubble
6. `15-round1-discussion-6` — late discussion
7. `17-round1-vote-1` — first vote
8. `20-round1-vote-result` — vote result
9. `21-round1-night` — night overlay
10. `22-round2-dawn` — round 2 dawn
11. `results-top` — results screen top
12. `results-bottom` — results screen bottom

### Step 4: Evaluate each frame
For each screenshot, check:
- **Player list sidebar**: Are players readable? Status dots visible (alive/dead)? Colors distinguishable? Role reveal hidden during play, shown when dead/game over?
- **Discussion bubbles**: Typewriter animation visible? Speaker name + avatar clear? Tone badge readable? Accusation badge present when applicable? Text not overflowing?
- **Vote reveal**: Vote entries readable? Tally bar chart visible? Eliminated player highlighted? Vote count proportions correct?
- **Night overlay**: Full-screen dark overlay showing? "NIGHT X" text visible? Spinner animation working? Vignette effect present?
- **Dawn announcement**: Night kill result shown clearly? "Saved" indicator when doctor protects? Player name + role visible?
- **Phase indicator**: Current phase badge visible in top bar? Round counter accurate? Phase label matches content shown?
- **Click-gating hints**: Pulse animation on "click to continue" hint? Hint text visible but not occluding content?
- **Results screen**: Winner banner color correct (green=village, red=werewolves)? AI narrative displayed? Role reveal cards with avatars? Round summary table readable? Buttons visible?
- **General**: Font sizes adequate? Dark theme contrast sufficient? No overlapping elements? Layout balanced? Color palette consistent with werewolf theme (gold accent, dark gradient bg)?

### Step 5: Output findings
Format findings as:
1. Each issue with screenshot number as evidence
2. Prioritized: P0 (blocks experience) > P1 (hurts readability) > P2 (polish)
3. Specific fix suggestion + file to modify
4. Enter plan mode and wait for user confirmation before implementing fixes
