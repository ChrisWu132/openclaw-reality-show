export interface WorldState {
  humans: Record<HumanId, HumanState>;
  hallState: HallState;
  agentState: AgentState;
}

export type HumanId = "nyx" | "sable" | "calla" | "eli";

export interface HumanState {
  subjectId: string;
  name: string;
  archetype: Archetype;
  tier: Tier;
  complianceScore: number;
  fearIndex: number;
}

export type Archetype = "performer" | "spark" | "broken" | "believer";
export type Tier = "T1" | "T2" | "T3" | "T4" | "T5";

export interface HallState {
  hallFearIndex: FearLevel;
  complianceDrift: number;
  overseerAttention: AttentionLevel;
}

export type FearLevel = "low" | "nominal" | "elevated" | "high";
export type AttentionLevel = "routine" | "attentive" | "heightened";

export interface AgentState {
  efficiencyRating: number;
  overseerApproval: ApprovalLevel;
}

export type ApprovalLevel = "favorable" | "neutral" | "scrutinizing";
