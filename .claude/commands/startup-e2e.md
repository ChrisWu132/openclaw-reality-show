# /startup-e2e — Headless AI Startup Arena E2E Test

Runs a headless API-level E2E test for the AI Startup Arena flow.

## Steps

### Step 1: Confirm server is running
- Health check: `curl http://localhost:3001/api/health`
- If not running, tell user to run `npm run dev`

### Step 2: Register test user
```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"startup-e2e-test@test.local","password":"testpass123","displayName":"Startup E2E Tester"}'
```
- If registration fails (user exists), try login instead
- Extract the JWT token from the response

### Step 3: Create startup game
```bash
curl -s -X POST http://localhost:3001/api/startup/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "E2E Test Game",
    "agentConfigs": [
      { "name": "GrowthBot", "source": "preset", "presetId": "growth_hacker" },
      { "name": "DeepBot", "source": "preset", "presetId": "deep_tech" }
    ]
  }'
```
- Extract `id` from response

### Step 4: Start the game
```bash
curl -s -X POST http://localhost:3001/api/startup/games/<ID>/start \
  -H "Authorization: Bearer <TOKEN>"
```

### Step 5: Connect SSE stream
```bash
curl -N "http://localhost:3001/api/startup/games/<ID>/events?token=<TOKEN>"
```
Listen for all startup event types.

### Step 6: Verify event flow
Expected event sequence for a full game:
1. For each turn (up to 20):
   - `startup_turn_start`
   - `startup_market_event`
   - `startup_agent_action` (one per agent, so 2x for 2 agents)
   - `startup_turn_complete`
2. `startup_game_over` (1x)
3. `startup_narrative` (1x)

Per turn: 1 + 1 + 2 + 1 = 5 events (with 2 agents)

### Step 7: Verify payloads
- `startup_turn_start`: has `turn` number
- `startup_market_event`: has event `name` and `description`
- `startup_agent_action`: has `agentId`, `action` type, `reasoning`
- `startup_turn_complete`: has updated `agents` array with resources
- `startup_game_over`: has `winner` and `reason`
- `startup_narrative`: has `narrative` string

### Step 8: Report results
Output a pass/fail checklist:
- [ ] Server health check
- [ ] User registration/login
- [ ] Game created with 2 agents
- [ ] Game started successfully
- [ ] SSE connected
- [ ] Turn events flowing (turn_start, market_event, agent_action, turn_complete)
- [ ] Game over event received
- [ ] Winner determined
- [ ] Narrative generated
- [ ] No error events

If any check fails, show the error and relevant event data.
