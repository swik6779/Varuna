import React from "react";
import { Check, RotateCcw } from "lucide-react";
import type { WizardStepId, StepState } from "./types";

export interface StepRailProps {
  activeStep: WizardStepId;
  stepStates: Record<WizardStepId, StepState>;
  stepSummaries: Record<WizardStepId, string | undefined>;
  onSelectStep: (step: WizardStepId) => void;
  onResetDemo: () => void;
  className?: string;
}

const STEPS: { id: WizardStepId; label: string }[] = [
  { id: 1, label: "Simulate" },
  { id: 2, label: "Investigate" },
  { id: 3, label: "Review" },
  { id: 4, label: "Verify" },
];

export function StepRail({
  activeStep,
  stepStates,
  stepSummaries,
  onSelectStep,
  onResetDemo,
  className = "",
}: StepRailProps) {
  return (
    <aside className={`wizard-rail-container ${className}`}>
      <nav className="wizard-rail" aria-label="Simulation steps">
        <div className="rail-steps-track">
          {STEPS.map((step, idx) => {
            const state = stepStates[step.id];
            const summary = stepSummaries[step.id];
            const isClickable = state !== "locked";
            const prevCompleted = idx > 0 && (stepStates[STEPS[idx - 1].id] === "completed" || activeStep > step.id);

            return (
              <div
                key={step.id}
                className={`rail-step-wrapper rail-state-${state}`}
              >
                {/* Connector line segment */}
                {idx > 0 && (
                  <div
                    className={`rail-connector ${prevCompleted ? "connector-completed" : "connector-pending"}`}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  className={`rail-step-button state-${state}`}
                  onClick={() => {
                    if (isClickable && step.id !== activeStep) {
                      onSelectStep(step.id);
                    }
                  }}
                  disabled={!isClickable}
                  aria-current={step.id === activeStep ? "step" : undefined}
                  aria-label={`Step ${step.id}: ${step.label}. State: ${state}. ${summary ? `Summary: ${summary}` : ""}`}
                >
                  <div className="rail-step-indicator">
                    {state === "completed" ? (
                      <span className="circle-completed" aria-hidden="true">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                    ) : state === "active" ? (
                      <span className="circle-active" aria-hidden="true">
                        {step.id}
                      </span>
                    ) : (
                      <span className="circle-pending" aria-hidden="true">
                        {step.id}
                      </span>
                    )}
                  </div>

                  <div className="rail-step-info">
                    <div className="rail-step-headline">
                      <span className="rail-step-label">{step.label}</span>
                      {state === "needs-you" && (
                        <span className="rail-needs-badge">
                          <span className="amber-dot" aria-hidden="true" />
                          Needs your decision
                        </span>
                      )}
                    </div>
                    {summary && (
                      <span className="rail-step-summary">{summary}</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="rail-footer">
          <button
            type="button"
            className="rail-reset-button"
            onClick={onResetDemo}
            aria-label="Reset demo and clear run state"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset demo
          </button>
        </div>
      </nav>
    </aside>
  );
}
