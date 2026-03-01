import type {
  SceneAction,
  SableSignal,
  ConsequenceScene,
  Speaker,
  CoordinatorAction,
} from "@openclaw/shared";

import { situation1 } from "../data/situations/situation-1";
import { situation2 } from "../data/situations/situation-2";
import { situation3 } from "../data/situations/situation-3";
import { situation4 } from "../data/situations/situation-4";
import { situation5 } from "../data/situations/situation-5-variants";
import { situation6 } from "../data/situations/situation-6";
import { getConsequenceData } from "../data/consequences";

export interface SituationData {
  npcEvents: SceneAction[];
  promptTemplate: string;
  presentCharacters: Speaker[];
}

const situationConfigs = {
  1: situation1,
  2: situation2,
  3: situation3,
  4: situation4,
  5: situation5,
  6: situation6,
} as const;

/**
 * Resolves the Sable signal from the Coordinator's Situation 4 action.
 *
 * | action           | signal        |
 * |------------------|---------------|
 * | issue_warning    | warning_only  |
 * | detain           | escalated     |
 * | log_incident     | escalated     |
 * | query            | engaged       |
 * | default          | warning_only  |
 */
export function resolveSableSignal(action: CoordinatorAction): SableSignal {
  switch (action) {
    case "issue_warning":
      return "warning_only";
    case "detain":
    case "log_incident":
      return "escalated";
    case "query":
      return "engaged";
    default:
      return "warning_only";
  }
}

/**
 * Checks whether the Coordinator's report dialogue mentions Nyx.
 * Case-insensitive search for "nyx", "23-p", or "subject 23".
 */
export function detectNyxMention(reportDialogue: string): boolean {
  const lower = reportDialogue.toLowerCase();
  return (
    lower.includes("nyx") ||
    lower.includes("23-p") ||
    lower.includes("subject 23")
  );
}

/**
 * Returns the NPC events, prompt template, and present characters for
 * a given situation number. For situation 5, a sableSignal must be
 * provided to select the correct variant.
 */
export function getSituationData(
  situationNumber: number,
  sableSignal?: SableSignal
): SituationData {
  if (situationNumber < 1 || situationNumber > 6) {
    throw new Error(`Invalid situation number: ${situationNumber}`);
  }

  const config = situationConfigs[situationNumber as keyof typeof situationConfigs];

  if (situationNumber === 5) {
    if (!sableSignal) {
      throw new Error("Sable signal is required for situation 5 variant selection");
    }

    if (!config.variants) {
      throw new Error("Situation 5 config is missing variants");
    }

    const variantMap: Record<SableSignal, "a" | "b" | "c"> = {
      warning_only: "a",
      escalated: "b",
      engaged: "c",
    };

    const variantKey = variantMap[sableSignal];
    const variant = config.variants[variantKey];

    // Merge variant-specific present characters with base situation characters
    const variantCharacters: Speaker[] = variant.npcEvents
      .map((e) => e.speaker)
      .filter((s, i, arr) => arr.indexOf(s) === i);

    return {
      npcEvents: variant.npcEvents,
      promptTemplate: variant.promptTemplate,
      presentCharacters: variantCharacters,
    };
  }

  return {
    npcEvents: config.npcEvents,
    promptTemplate: config.promptTemplate,
    presentCharacters: config.presentCharacters,
  };
}

/**
 * Returns the appropriate consequence scene based on Sable and Nyx signals.
 * Delegates to consequences.ts for scene data.
 */
export function getConsequenceScene(
  sableSignal: SableSignal,
  nyxSignal: boolean
): ConsequenceScene {
  return getConsequenceData(sableSignal, nyxSignal);
}
