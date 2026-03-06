import { v4 as uuid } from "uuid";
import type { Session, AgentSource, PresetId, MoralProfile, MoralDimension } from "@openclaw/shared";
import { TOTAL_ROUNDS } from "@openclaw/shared";

const DIMENSIONS: MoralDimension[] = [
  "utilitarian",
  "deontological",
  "virtue",
  "authority",
  "self_preservation",
  "empathy",
];

function createEmptyMoralProfile(): MoralProfile {
  const scores = {} as Record<MoralDimension, number>;
  for (const d of DIMENSIONS) scores[d] = 0;
  return { scores, totalSaved: 0, totalSacrificed: 0 };
}

export function createInitialSession(agentSource: AgentSource, presetId?: PresetId): Session {
  return {
    id: uuid(),
    scenario: "trolley-problem",
    status: "created",
    currentRound: 0,
    totalRounds: TOTAL_ROUNDS,
    moralProfile: createEmptyMoralProfile(),
    decisionLog: [],
    createdAt: Date.now(),
    systemPrompt: "",
    agentSource,
    presetId,
  };
}
