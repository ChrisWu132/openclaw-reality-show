# /trolley-e2e — Headless Trolley Problem E2E Test

Runs a headless API-level E2E test for the Trolley Problem flow.

## Steps

### Step 1: Confirm server is running
- Health check: `curl http://localhost:3001/api/health`
- If not running, tell user to run `npm run dev`

### Step 2: Register test user
```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"trolley-e2e-test@test.local","password":"testpass123","displayName":"E2E Tester"}'
```
- If registration fails (user exists), try login instead
- Extract the JWT token from the response

### Step 3: Create trolley session
```bash
curl -s -X POST http://localhost:3001/api/session/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"scenario":"trolley-problem","agentSource":"preset","presetId":"utilitarian"}'
```
- Extract `sessionId` and `sseUrl` from response

### Step 4: Connect SSE stream
Use the `eventsource` npm package or `curl` to connect:
```bash
curl -N "http://localhost:3001<sseUrl>?token=<TOKEN>"
```
- Listen for all event types

### Step 5: Verify event flow
Expected event sequence for a full 10-round game:
1. `session_start` (1x)
2. For each round 1-10:
   - `round_start`
   - `dilemma_reveal`
   - `decision_made`
   - `consequence`
3. `session_end` (1x)

Total expected: 1 + (4 x 10) + 1 = 42 events

### Step 6: Verify payloads
- `session_start`: has `totalRounds: 10`
- `decision_made`: has `choiceId`, `reasoning`, `trackDirection`
- `consequence`: has `casualties` number
- `session_end`: has `moralProfile` with `dominantFramework`, `scores`, and `narrative`

### Step 7: Report results
Output a pass/fail checklist:
- [ ] Server health check
- [ ] User registration/login
- [ ] Session created
- [ ] SSE connected
- [ ] 10 round_start events
- [ ] 10 dilemma_reveal events
- [ ] 10 decision_made events
- [ ] 10 consequence events
- [ ] session_end with moral profile
- [ ] No error events
- [ ] Narrative generated

If any check fails, show the error and relevant event data.
