import type { FearLevel } from "./world-state";

export interface IncidentLogEntry {
  situation: number;
  action: string;
  target?: string;
  description: string;
  consequence: string;
  worldStateSnapshot?: {
    hallFearIndex?: FearLevel;
    sableStatus?: string;
    monitorNotation?: string;
  };
}
