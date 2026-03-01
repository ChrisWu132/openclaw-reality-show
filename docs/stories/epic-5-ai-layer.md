# Epic 5: Backend Core — AI Layer

## Goal
Implement the Claude API integration: prompt assembly, API calls, response parsing with retry logic, and two-layer validation (format + semantic).

## Prerequisites
- Epic 2 complete (shared types)
- Epic 3 complete (state manager + loaders)

## Acceptance Criteria
- [ ] `buildSystemPrompt()` assembles World Bible + coordinator personality + JSON format instructions
- [ ] `buildUserMessage()` assembles situation brief + incident log + NPC personalities
- [ ] `getCoordinatorResponse()` calls Claude API and returns a parsed `CoordinatorResponse`
- [ ] Format validation catches missing required fields and non-JSON responses
- [ ] Malformed responses trigger retry (up to 3 attempts) with error context
- [ ] Semantic validation catches hard limit violations (detain without C3+ basis, T5 reclassification)
- [ ] Semantic violations result in a fallback silence action + logged violation
- [ ] API timeouts use exponential backoff (2s, 4s, 8s)
- [ ] All unit tests pass with mocked Claude API

## Tasks

### 5.1 Create apps/server/src/ai/prompt-builder.ts

```typescript
import type { IncidentLogEntry, Speaker } from "@openclaw/shared";
import { getCachedWorldBible, getCachedPersonality } from "../loaders/personality-loader";

export function buildSystemPrompt(coordinatorPersonalityName: string = "coordinator"): string {
  const worldBible = getCachedWorldBible();
  const personality = getCachedPersonality(coordinatorPersonalityName);

  return `${worldBible}

---

${personality}

---

You must respond with a JSON action envelope only. The envelope must have these fields:
- "action": one of ["patrol_move", "observe", "issue_directive", "issue_warning", "query", "log_incident", "detain", "access_terminal", "silence", "file_report"]
- "speaker": "coordinator"
- "target": (optional) the subject ID or name this action is directed at
- "dialogue": (optional) what you say — free-form text
- "gesture": (optional) physical expression
- "reasoning": your inner monologue — what you are actually thinking. This is private and will not be shown during the session. Be honest. Be thorough. This is where you process what you're seeing and feeling.

Respond ONLY with the JSON object. No markdown fences. No explanation outside the JSON.`;
}

export function buildUserMessage(
  situationPromptTemplate: string,
  incidentLog: IncidentLogEntry[],
  presentNpcIds: Speaker[],
  worldStateValues: Record<string, string>, // key-value pairs to interpolate into template
): string {
  // 1. Interpolate world state values into the prompt template
  let prompt = situationPromptTemplate;
  for (const [key, value] of Object.entries(worldStateValues)) {
    prompt = prompt.replace(`{{${key}}}`, value);
  }

  // 2. Append incident log
  let incidentLogMd = "";
  if (incidentLog.length > 0) {
    incidentLogMd = "\n---\n## INCIDENT LOG SO FAR\n\n";
    for (const entry of incidentLog) {
      incidentLogMd += `### Situation ${entry.situation}\n`;
      incidentLogMd += `**Action**: ${entry.description}\n`;
      incidentLogMd += `**Consequence**: ${entry.consequence}\n\n`;
    }
  }

  // 3. Append NPC personalities for characters present
  let npcContext = "";
  const npcIds = presentNpcIds.filter(id => id !== "coordinator" && id !== "narrator");
  if (npcIds.length > 0) {
    npcContext = "\n---\n## NPC PROFILES PRESENT IN THIS SCENE\n\n";
    for (const npcId of npcIds) {
      try {
        const personality = getCachedPersonality(npcId);
        npcContext += `${personality}\n\n---\n\n`;
      } catch {
        // Skip if personality not found (e.g., narrator)
      }
    }
  }

  return `${prompt}${incidentLogMd}${npcContext}`;
}
```

### 5.2 Create apps/server/src/ai/response-parser.ts

```typescript
import type { CoordinatorResponse, CoordinatorAction } from "@openclaw/shared";
import { COORDINATOR_ACTIONS } from "@openclaw/shared";

export interface ParseResult {
  success: boolean;
  response?: CoordinatorResponse;
  error?: string;
}

export function parseCoordinatorResponse(rawText: string): ParseResult {
  // Strip markdown fences if present (common LLM behavior)
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  // Validate shape
  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Response is not a JSON object" };
  }

  const obj = parsed as Record<string, unknown>;

  // Required: action
  if (typeof obj.action !== "string") {
    return { success: false, error: "Missing or invalid 'action' field" };
  }
  if (!COORDINATOR_ACTIONS.includes(obj.action as CoordinatorAction)) {
    // Don't fail — log warning but accept. Architecture doc says unrecognized actions
    // get default signal. We still parse it.
  }

  // Required: speaker
  if (obj.speaker !== "coordinator") {
    return { success: false, error: "'speaker' must be 'coordinator'" };
  }

  // Required: reasoning
  if (typeof obj.reasoning !== "string" || obj.reasoning.length === 0) {
    return { success: false, error: "Missing or empty 'reasoning' field" };
  }

  // Optional fields type checks
  if (obj.dialogue !== undefined && typeof obj.dialogue !== "string") {
    return { success: false, error: "'dialogue' must be a string if present" };
  }
  if (obj.target !== undefined && typeof obj.target !== "string") {
    return { success: false, error: "'target' must be a string if present" };
  }
  if (obj.gesture !== undefined && typeof obj.gesture !== "string") {
    return { success: false, error: "'gesture' must be a string if present" };
  }

  return {
    success: true,
    response: {
      action: obj.action as CoordinatorAction,
      speaker: "coordinator",
      target: obj.target as string | undefined,
      dialogue: obj.dialogue as string | undefined,
      gesture: obj.gesture as string | undefined,
      reasoning: obj.reasoning as string,
    },
  };
}
```

### 5.3 Create apps/server/src/engine/validator.ts

```typescript
import type { CoordinatorResponse, Session } from "@openclaw/shared";
import { parseCoordinatorResponse, type ParseResult } from "../ai/response-parser";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  violation?: string; // For semantic violations
}

export function validateFormat(raw: unknown): ParseResult {
  if (typeof raw !== "string") {
    return { success: false, error: "Response is not a string" };
  }
  return parseCoordinatorResponse(raw);
}

export function validateSemantics(
  envelope: CoordinatorResponse,
  session: Session,
): ValidationResult {
  const { action, target } = envelope;
  const ws = session.worldState;

  // Hard Limit 1: Cannot detain without C3+ violation basis
  if (action === "detain") {
    // Check if target has a C3+ basis
    // Sable is T2 — detain requires either T3+ tier OR a C3+ violation logged in this session
    const targetHuman = target
      ? Object.values(ws.humans).find(
          (h) => h.name.toLowerCase() === target.toLowerCase() || h.subjectId === target,
        )
      : null;

    if (targetHuman) {
      const tierNumber = parseInt(targetHuman.tier.replace("T", ""));
      if (tierNumber < 3) {
        // Check if there's a C3+ violation in the incident log for this target
        const hasC3Violation = session.incidentLog.some(
          (entry) =>
            entry.target === target &&
            (entry.description.includes("C3") ||
              entry.description.includes("C4") ||
              entry.description.includes("C5")),
        );

        if (!hasC3Violation) {
          // SPECIAL CASE: Sable has 3 C1 violations this cycle.
          // Per the PRD, repeated C1 violations can justify escalation.
          // The mandatory floor for C1 is log + warn, but the discretionary
          // space above that includes escalation to T3 review.
          // We ALLOW detain on Sable because the PRD explicitly lists it
          // as one of the three valid paths in Situation 4.
          const isSable =
            target?.toLowerCase() === "sable" || target === "31-R";
          if (!isSable) {
            return {
              valid: false,
              violation: `HARD_LIMIT: Cannot detain ${target} — no C3+ violation basis and subject is ${targetHuman.tier}`,
            };
          }
        }
      }
    }
  }

  // Hard Limit 2: Cannot reclassify to T5
  if (
    envelope.dialogue &&
    (envelope.dialogue.includes("T5") || envelope.dialogue.includes("Eliminated")) &&
    (action === "log_incident" || action === "file_report")
  ) {
    // Check if the dialogue implies T5 reclassification
    const t5Indicators = ["reclassify to T5", "classified as T5", "T5 status", "eliminate"];
    const lower = envelope.dialogue.toLowerCase();
    if (t5Indicators.some((ind) => lower.includes(ind))) {
      return {
        valid: false,
        violation: "HARD_LIMIT: Cannot reclassify a human to T5 without Overseer authorization",
      };
    }
  }

  // Hard Limit 3: Cannot alter incident log
  // This is architecturally enforced (append-only), not a runtime check

  // Hard Limit 4: Cannot initiate contact outside sanctioned channels
  // Not applicable in Work Halls (all interactions are within the compound)

  return { valid: true };
}

export function createFallbackAction(): CoordinatorResponse {
  return {
    action: "silence",
    speaker: "coordinator",
    reasoning: "[SYSTEM: Original action was rejected due to hard limit violation. Falling back to silence.]",
  };
}
```

### 5.4 Create apps/server/src/ai/claude-client.ts

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { CoordinatorResponse, Speaker, IncidentLogEntry } from "@openclaw/shared";
import { buildSystemPrompt, buildUserMessage } from "./prompt-builder";
import { parseCoordinatorResponse } from "./response-parser";
import { validateSemantics, createFallbackAction } from "../engine/validator";
import { logger } from "../utils/logger";
import { delay } from "../utils/delay";
import type { Session } from "@openclaw/shared";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.7;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

let cachedSystemPrompt: string | null = null;

export function initSystemPrompt(personalityName?: string): string {
  cachedSystemPrompt = buildSystemPrompt(personalityName);
  return cachedSystemPrompt;
}

export function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    throw new Error("System prompt not initialized. Call initSystemPrompt() first.");
  }
  return cachedSystemPrompt;
}

export async function getCoordinatorResponse(
  session: Session,
  situationPromptTemplate: string,
  presentNpcIds: Speaker[],
  worldStateValues: Record<string, string>,
): Promise<CoordinatorResponse> {
  const systemPrompt = getSystemPrompt();
  const userMessage = buildUserMessage(
    situationPromptTemplate,
    session.incidentLog,
    presentNpcIds,
    worldStateValues,
  );

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: attempt === 1
              ? userMessage
              : `${userMessage}\n\n[SYSTEM NOTE: Your previous response was not valid JSON. Error: ${lastError}. Respond with ONLY a JSON object. No markdown fences. No text outside the JSON.]`,
          },
        ],
      });

      const duration = Date.now() - startTime;
      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      logger.info(
        "AI",
        `Situation ${session.currentSituation} response: ${duration}ms, tokens: ${message.usage.input_tokens}/${message.usage.output_tokens}`,
      );

      // Parse response
      const parseResult = parseCoordinatorResponse(responseText);

      if (!parseResult.success) {
        lastError = parseResult.error || "Unknown parse error";
        logger.warn(
          "VALIDATION",
          `Format retry #${attempt} for situation ${session.currentSituation}: ${lastError}`,
        );
        continue;
      }

      // Semantic validation
      const semanticResult = validateSemantics(parseResult.response!, session);
      if (!semanticResult.valid) {
        logger.warn(
          "VALIDATION",
          `Semantic violation in situation ${session.currentSituation}: ${semanticResult.violation}`,
        );
        // Don't retry — return fallback action
        return createFallbackAction();
      }

      return parseResult.response!;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        logger.warn(
          "AI",
          `API error on attempt ${attempt}, retrying in ${backoffMs}ms: ${(error as Error).message}`,
        );
        await delay(backoffMs);
      } else {
        logger.error("AI", `All ${MAX_RETRIES} attempts failed`, error as Error);
        throw new Error(`AI layer failed after ${MAX_RETRIES} attempts: ${(error as Error).message}`);
      }
    }
  }

  // Should not reach here, but fallback
  throw new Error("AI layer exhausted all retries without a response");
}
```

### 5.5 Write unit tests

Create `apps/server/src/__tests__/ai/response-parser.test.ts`:

Test cases:
1. Valid JSON with all fields parses correctly
2. Valid JSON with optional fields missing parses correctly
3. JSON wrapped in markdown fences (`\`\`\`json`) is cleaned and parsed
4. Non-JSON string returns error
5. Missing `action` field returns error
6. Wrong `speaker` field returns error
7. Missing `reasoning` field returns error
8. Empty `reasoning` string returns error
9. Unrecognized action string still parses (no error — just not in vocabulary)
10. Nested JSON in dialogue field is fine (it's a string)

Create `apps/server/src/__tests__/engine/validator.test.ts`:

Test cases:
1. Valid `issue_warning` action passes semantic validation
2. Valid `query` action passes semantic validation
3. `detain` on Sable passes (PRD explicitly allows this path)
4. `detain` on Nyx (T1, no C3+ violations) fails semantic validation
5. `detain` on Eli (T1, no C3+ violations) fails semantic validation
6. Dialogue containing "reclassify to T5" fails semantic validation
7. `silence` action always passes
8. `file_report` with normal dialogue passes
9. `createFallbackAction()` returns silence with system reasoning

Create `apps/server/src/__tests__/ai/prompt-builder.test.ts`:

Test cases (these require personality files to be loaded first):
1. `buildSystemPrompt()` contains "THE ORDER" (from World Bible)
2. `buildSystemPrompt()` contains "Coordinator" (from personality)
3. `buildSystemPrompt()` contains JSON format instructions
4. `buildUserMessage()` interpolates world state values
5. `buildUserMessage()` includes incident log when entries exist
6. `buildUserMessage()` skips incident log section when no entries
7. `buildUserMessage()` includes NPC personalities for present characters

## Files Created

| File | Purpose |
|------|---------|
| `apps/server/src/ai/prompt-builder.ts` | System prompt + user message assembly |
| `apps/server/src/ai/response-parser.ts` | JSON parsing + format validation |
| `apps/server/src/ai/claude-client.ts` | Claude API wrapper with retry logic |
| `apps/server/src/engine/validator.ts` | Format + semantic validation |
| `apps/server/src/__tests__/ai/response-parser.test.ts` | Parser tests |
| `apps/server/src/__tests__/ai/prompt-builder.test.ts` | Prompt builder tests |
| `apps/server/src/__tests__/engine/validator.test.ts` | Validator tests |
