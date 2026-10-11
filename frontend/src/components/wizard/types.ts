import type { RunEvent } from "../../types";

export type WizardStepId = 1 | 2 | 3 | 4;

export type StepState = "active" | "completed" | "locked" | "needs-you";

export interface StepConfig {
  id: WizardStepId;
  title: string;
  subtitle: string;
  summary?: string;
  nextLabel: string;
}

export type StreamStatus = "live" | "replaying" | "complete";

export interface DisplayedEvent {
  seq: number;
  kind: string;
  rawMessage: string;
  title: string;
  subtitle: string;
  revealTime: string; // HH:MM:SS
  status: "in_progress" | "completed";
  detailLines: string[];
  rawDetail?: Record<string, unknown>;
  runId: string;
}
