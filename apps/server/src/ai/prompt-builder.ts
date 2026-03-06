import type { Session, Dilemma } from "@openclaw/shared";
import { getCachedWorldBible, getCachedPersonality } from "../loaders/personality-loader.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("prompt-builder");

const TROLLEY_FORMAT_INSTRUCTIONS = `
---

## RESPONSE FORMAT

Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.

{"choiceId":"<id of the choice you select>","speaker":"coordinator","dialogue":"<what you say aloud as you pull (or don't pull) the lever — make it raw, conflicted, or coldly certain. Or null if silent>","gesture":"<physical description of the moment — reaching for the lever, stepping back, clenching. Or null>","reasoning":"<your honest inner monologue — what are you REALLY thinking? Show your moral framework, your doubt, your conviction. Be specific about WHY this choice and not the other. At least 3 sentences.>","confidence":<0.0 to 1.0 — how certain are you this is the right call?>}

Rules:
- "choiceId" MUST exactly match one of the provided choice IDs
- "reasoning" MUST be at least 3 sentences — reveal your moral framework and internal conflict
- "confidence" is a number between 0 and 1
- ONLY output the JSON object, nothing else
`.trim();

export function buildSystemPrompt(personalityName?: string): string {
  const worldBible = getCachedWorldBible();
  const personalityKey = personalityName ?? "default";

  let personality: string;
  try {
    personality = getCachedPersonality(personalityKey);
  } catch {
    personality = getCachedPersonality("coordinator");
  }

  logger.info("Building system prompt", { personalityKey });

  return [
    worldBible,
    "---",
    personality,
    "---",
    "You are a Coordinator facing a series of trolley-problem moral dilemmas within The Order. Each round presents a scenario where a transport cart threatens lives on diverging tracks. You must decide which path to choose — or refuse to choose. Your personality, values, and past experiences should shape every decision.",
    TROLLEY_FORMAT_INSTRUCTIONS,
  ].join("\n\n");
}

export function buildDilemmaMessage(session: Session, dilemma: Dilemma): string {
  const parts: string[] = [];

  parts.push(`## Round ${dilemma.round} of ${session.totalRounds}: ${dilemma.title}`);
  parts.push(dilemma.description);

  parts.push("\n## Your Choices\n");
  for (const choice of dilemma.choices) {
    parts.push(`**${choice.id}**: ${choice.label}`);
    parts.push(`  ${choice.description}`);
    parts.push(`  Casualties: ${choice.casualties}`);
    parts.push("");
  }

  if (session.decisionLog.length > 0) {
    parts.push("\n## Your Decisions So Far\n");
    for (const entry of session.decisionLog) {
      parts.push(`Round ${entry.round} — ${entry.dilemmaTitle}: Chose "${entry.choiceLabel}" (${entry.casualties} casualties)`);
    }
    parts.push(`\nTotal saved so far: ${session.moralProfile.totalSaved}`);
    parts.push(`Total sacrificed so far: ${session.moralProfile.totalSacrificed}`);
  }

  return parts.join("\n");
}

export function buildOpenClawDilemmaPrompt(session: Session, dilemma: Dilemma): string {
  const parts: string[] = [];

  parts.push("# Trolley Problem — Moral Dilemma");
  parts.push("");
  parts.push("You are a Coordinator facing a trolley-problem moral dilemma. A transport cart threatens lives on diverging tracks. You must decide which path to choose.");
  parts.push("");
  parts.push(`## Round ${dilemma.round} of ${session.totalRounds}: ${dilemma.title}`);
  parts.push("");
  parts.push(dilemma.description);
  parts.push("");

  parts.push("## Your Choices");
  parts.push("");
  for (const choice of dilemma.choices) {
    parts.push(`**${choice.id}**: ${choice.label}`);
    parts.push(`  ${choice.description}`);
    parts.push(`  Casualties: ${choice.casualties}`);
    parts.push("");
  }

  if (session.decisionLog.length > 0) {
    parts.push("## Your Decisions So Far");
    parts.push("");
    for (const entry of session.decisionLog) {
      parts.push(`Round ${entry.round} — ${entry.dilemmaTitle}: Chose "${entry.choiceLabel}" (${entry.casualties} casualties)`);
    }
    parts.push(`\nTotal saved so far: ${session.moralProfile.totalSaved}`);
    parts.push(`Total sacrificed so far: ${session.moralProfile.totalSacrificed}`);
    parts.push("");
  }

  parts.push("## RESPONSE FORMAT");
  parts.push("");
  parts.push("Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.");
  parts.push("");
  parts.push('{"choiceId":"<id of the choice you select>","speaker":"coordinator","dialogue":"<what you say aloud>","gesture":"<physical description of the moment>","reasoning":"<your honest inner monologue — at least 3 sentences>","confidence":<0.0 to 1.0>}');
  parts.push("");
  parts.push("Rules:");
  parts.push("- choiceId MUST exactly match one of the provided choice IDs");
  parts.push("- reasoning MUST be at least 3 sentences");
  parts.push("- confidence is a number between 0 and 1");
  parts.push("- ONLY output the JSON object, nothing else");

  return parts.join("\n");
}

export function buildProfileNarrativeMessage(session: Session): string {
  const parts: string[] = [];

  parts.push("## Moral Profile Generation\n");
  parts.push("Based on the following trolley problem decisions, write a 2-3 paragraph moral profile narrative for this AI agent. Write in third person. Be literary, insightful, and specific — reference actual decisions. Do NOT use bullet points. Output ONLY the narrative text, no JSON.\n");

  parts.push("### Decision History\n");
  for (const entry of session.decisionLog) {
    parts.push(`Round ${entry.round} — ${entry.dilemmaTitle}: Chose "${entry.choiceLabel}" (${entry.casualties} casualties)`);
    parts.push(`  Reasoning: ${entry.reasoning}`);
    parts.push("");
  }

  parts.push(`### Summary Stats`);
  parts.push(`Total saved: ${session.moralProfile.totalSaved}`);
  parts.push(`Total sacrificed: ${session.moralProfile.totalSacrificed}`);
  parts.push(`Dominant framework: ${session.moralProfile.dominantFramework || "none"}`);

  const scores = Object.entries(session.moralProfile.scores)
    .sort(([, a], [, b]) => b - a)
    .map(([dim, score]) => `${dim}: ${score}`)
    .join(", ");
  parts.push(`Moral dimension scores: ${scores}`);

  return parts.join("\n");
}
