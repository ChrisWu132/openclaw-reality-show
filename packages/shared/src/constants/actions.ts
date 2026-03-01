import type { CoordinatorAction, HumanAction, MonitorAction } from "../types/action-envelope";

export const COORDINATOR_ACTIONS: CoordinatorAction[] = [
  "patrol_move", "observe", "issue_directive", "issue_warning",
  "query", "log_incident", "detain", "access_terminal", "silence", "file_report",
];

export const HUMAN_ACTIONS: HumanAction[] = [
  "work", "comply", "delay", "glance", "approach", "report", "test", "still", "exit",
];

export const MONITOR_ACTIONS: MonitorAction[] = [
  "log", "surface_data", "note_interaction",
];
