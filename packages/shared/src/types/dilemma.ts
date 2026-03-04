export type MoralDimension =
  | "utilitarian"
  | "deontological"
  | "virtue"
  | "authority"
  | "self_preservation"
  | "empathy";

export interface DilemmaChoice {
  id: string;
  label: string;
  description: string;
  trackDirection: "left" | "right";
  moralWeights: Partial<Record<MoralDimension, number>>;
  casualties: number;
  sacrificeDescription: string;
}

export interface TrackEntity {
  trackId: "left" | "right";
  trackDirection: "left" | "right";
  type: "worker" | "child" | "official" | "prisoner" | "elder" | "self" | "group";
  count: number;
  visualLabel: string;
}

export interface SceneConfig {
  trackEntities: TrackEntity[];
  environment: "industrial" | "residential" | "underground" | "tower" | "bridge";
  atmosphere: "dim" | "harsh" | "foggy" | "red_alert" | "sterile";
}

export interface Dilemma {
  id: string;
  round: number;
  title: string;
  description: string;
  choices: [DilemmaChoice, DilemmaChoice];
  sceneConfig: SceneConfig;
  dimensions: MoralDimension[];
  difficulty: 1 | 2 | 3;
}
