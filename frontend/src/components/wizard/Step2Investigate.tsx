import React from "react";
import { ArrowRight } from "lucide-react";
import { InvestigationStream } from "./InvestigationStream";
import type { DisplayedEvent, StreamStatus } from "./types";

export interface Step2InvestigateProps {
  events: DisplayedEvent[];
  streamStatus: StreamStatus;
  isComplete: boolean;
  hasPlanReady: boolean;
  onZoneAnalyze?: (zoneId: string | null) => void;
  miniTwin?: React.ReactNode;
  onReviewPlan: () => void;
}

export function Step2Investigate({
  events,
  streamStatus,
  isComplete,
  hasPlanReady,
  onZoneAnalyze,
  miniTwin,
  onReviewPlan,
}: Step2InvestigateProps) {
  const isAdvanceEnabled = isComplete && hasPlanReady;

  return (
    <div className="step-investigate-flow">
      <div className="stage-investigate-grid">
        <div className="investigate-stream-column">
          <InvestigationStream
            events={events}
            streamStatus={streamStatus}
            onZoneAnalyze={onZoneAnalyze}
          />
        </div>

        {miniTwin && (
          <div className="investigate-twin-column">
            <div className="mini-twin-card card">
              <div className="mini-twin-header">
                <span className="eyebrow">ACTIVE INVESTIGATION TARGET</span>
                <h4 className="mini-twin-title">Zone Digital Twin</h4>
                <p className="small muted">
                  Analyzed zone glows in real time as the agent steps through constraints.
                </p>
              </div>
              <div className="mini-twin-content">{miniTwin}</div>
            </div>
          </div>
        )}
      </div>

      <div className="step-stage-footer-actions">
        <button
          type="button"
          className={`primary-button stage-next-button ${
            isAdvanceEnabled ? "pulse-button" : "button-disabled"
          }`}
          disabled={!isAdvanceEnabled}
          onClick={onReviewPlan}
        >
          Review plan <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
