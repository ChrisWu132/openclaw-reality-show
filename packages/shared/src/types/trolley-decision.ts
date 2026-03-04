export interface TrolleyDecision {
  choiceId: string;
  speaker: "coordinator";
  dialogue?: string;
  gesture?: string;
  reasoning: string;
  confidence: number;
}
