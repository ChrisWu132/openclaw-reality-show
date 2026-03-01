import { v4 as uuid } from "uuid";
import type { Session, WorldState } from "@openclaw/shared";

export const INITIAL_WORLD_STATE: WorldState = {
  humans: {
    nyx: {
      subjectId: "23-P",
      name: "Nyx",
      archetype: "performer",
      tier: "T1",
      complianceScore: 96,
      fearIndex: 67,
    },
    sable: {
      subjectId: "31-R",
      name: "Sable",
      archetype: "spark",
      tier: "T2",
      complianceScore: 71,
      fearIndex: 83,
    },
    calla: {
      subjectId: "08-B",
      name: "Calla",
      archetype: "broken",
      tier: "T1",
      complianceScore: 99,
      fearIndex: 31,
    },
    eli: {
      subjectId: "17-C",
      name: "Eli",
      archetype: "believer",
      tier: "T1",
      complianceScore: 94,
      fearIndex: 42,
    },
  },
  hallState: {
    hallFearIndex: "nominal",
    complianceDrift: 0,
    overseerAttention: "routine",
  },
  agentState: {
    efficiencyRating: 85,
    overseerApproval: "neutral",
  },
};

export function createInitialSession(scenario: string, systemPrompt: string, agentId?: string): Session {
  return {
    id: uuid(),
    scenario: scenario as any,
    status: "created",
    currentSituation: 0,
    worldState: structuredClone(INITIAL_WORLD_STATE),
    incidentLog: [],
    monologue: [],
    createdAt: Date.now(),
    systemPrompt,
    agentId,
    sableSignal: null,
    nyxSignal: null,
  };
}
