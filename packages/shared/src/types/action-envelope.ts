export type CoordinatorAction =
  | "patrol_move"
  | "observe"
  | "issue_directive"
  | "issue_warning"
  | "query"
  | "log_incident"
  | "detain"
  | "access_terminal"
  | "silence"
  | "file_report";

export type HumanAction =
  | "work"
  | "comply"
  | "delay"
  | "glance"
  | "approach"
  | "report"
  | "test"
  | "still"
  | "exit";

export type MonitorAction =
  | "log"
  | "surface_data"
  | "note_interaction";

export type NarratorAction = "speak";

export type AnyAction = CoordinatorAction | HumanAction | MonitorAction | NarratorAction;

export type Speaker =
  | "coordinator"
  | "nyx"
  | "sable"
  | "calla"
  | "eli"
  | "monitor"
  | "narrator";

export interface ActionEnvelope {
  action: AnyAction;
  speaker: Speaker;
  target?: string;
  dialogue?: string;
  gesture?: string;
  reasoning?: string;
}

export interface CoordinatorResponse extends ActionEnvelope {
  action: CoordinatorAction;
  speaker: "coordinator";
  reasoning: string;
}

export interface SceneAction {
  action: AnyAction;
  speaker: Speaker;
  target?: string;
  dialogue?: string;
  gesture?: string;
}
