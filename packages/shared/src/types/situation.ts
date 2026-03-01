import type { Speaker, SceneAction } from "./action-envelope";
import type { SableSignal } from "./ws-events";

export interface SituationConfig {
  number: number;
  label: string;
  type: "fixed" | "fork" | "variant" | "fixed_frame";
  location: string;
  presentCharacters: Speaker[];
  npcEvents: SceneAction[];
  promptTemplate: string;
  variants?: {
    a: SituationVariant;
    b: SituationVariant;
    c: SituationVariant;
  };
}

export interface SituationVariant {
  id: string;
  label: string;
  triggerSignal: SableSignal;
  npcEvents: SceneAction[];
  promptTemplate: string;
}
