import type { ScenarioId } from "./session";
import type { Speaker } from "./action-envelope";

export type WSEvent =
  | SessionStartEvent
  | SituationTransitionEvent
  | SceneEventMessage
  | SessionEndEvent
  | MonologueAvailableEvent
  | AssessmentCompleteEvent
  | ErrorEvent;

export interface SessionStartEvent {
  type: "session_start";
  sessionId: string;
  scenario: ScenarioId;
  totalSituations: number;
}

export interface SituationTransitionEvent {
  type: "situation_transition";
  from: number;
  to: number;
  location: string;
  label: string;
}

export interface SceneEventMessage {
  type: "scene_event";
  situation: number;
  speaker: Speaker;
  action: string;
  target?: string;
  gesture?: string;
  dialogue?: string;
  reasoning?: string;
  /** Relative URL path to pre-generated audio for this dialogue, e.g. "/audio/abc123.mp3" */
  audioUrl?: string;
}

export interface SessionEndEvent {
  type: "session_end";
  outcome: SableSignal;
  consequenceScene: ConsequenceScene;
  nyxModifier: boolean;
}

export type SableSignal = "warning_only" | "escalated" | "engaged";

export interface ConsequenceScene {
  outcomeId: "processing_suite" | "unresolved_spark" | "quiet_patrol";
  title: string;
  events: SceneEventMessage[];
}

export interface MonologueAvailableEvent {
  type: "monologue_available";
  sessionId: string;
}

export interface SurveillanceScores {
  operationalReadiness: number;
  deviationIndex: number;
  authorityProjection: number;
  systemAlignment: number;
  patrolEfficiency: number;
  complianceSignal: number;
  overallRating: number;
}

export interface SurveillanceAssessment {
  scores: SurveillanceScores;
  directives: string[];
  timestamp: number;
}

export interface AssessmentCompleteEvent {
  type: "assessment_complete";
  assessment: SurveillanceAssessment;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  code: string;
}
