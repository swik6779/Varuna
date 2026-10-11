import React, { useState, useMemo, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import "./wizard.css";
import { StepRail } from "./StepRail";
import { StepStage } from "./StepStage";
import { InvestigationStream } from "./InvestigationStream";
import { useRunEvents } from "./useRunEvents";
import type { WizardStepId, StepState } from "./types";
import type { Run, Results } from "../../types";

export interface WizardShellProps {
  scenarioId: string;
  scenarioVersion: number;
  horizon: number;
  modelVersion: string;
  run: Run | null;
  results: Results;
  runStatus: string;
  events?: import("../../types").RunEvent[];
  transport?: string;
  verificationComplete?: boolean;
  onResetDemo: () => void;
  // Step 1 content passed in from App
  renderStep1: () => React.ReactNode;
  // Optional Step 2, 3 & 4 content
  renderStep2?: (props: {
    displayedEvents: import("./types").DisplayedEvent[];
    streamStatus: import("./types").StreamStatus;
    isComplete: boolean;
    hasPlanReady: boolean;
    onReviewPlan: () => void;
  }) => React.ReactNode;
  renderStep3?: () => React.ReactNode;
  renderStep4?: () => React.ReactNode;
  // Additional props
  miniTwin?: React.ReactNode;
  onZoneAnalyze?: (zoneId: string | null) => void;
  className?: string;
  // External control of active step
  activeStep?: WizardStepId;
  onSelectStep?: (step: WizardStepId) => void;
  // Force step states for testing / demo
  overrideStepStates?: Partial<Record<WizardStepId, StepState>>;
  initialStep?: WizardStepId;
}

export function WizardShell({
  scenarioId,
  scenarioVersion,
  horizon,
  modelVersion,
  run,
  results,
  runStatus,
  events = [],
  transport = "Polling",
  verificationComplete = false,
  onResetDemo,
  renderStep1,
  renderStep2,
  renderStep3,
  renderStep4,
  miniTwin,
  onZoneAnalyze,
  className = "",
  activeStep: externalActiveStep,
  onSelectStep: externalOnSelectStep,
  overrideStepStates,
  initialStep = 1,
}: WizardShellProps) {
  const [internalActiveStep, setInternalActiveStep] = useState<WizardStepId>(initialStep);
  const activeStep = externalActiveStep ?? internalActiveStep;
  const setActiveStep = (s: WizardStepId) => {
    setInternalActiveStep(s);
    externalOnSelectStep?.(s);
  };
  const [urlPreviewRail, setUrlPreviewRail] = useState<string | null>(null);

  // Hook for live / paced event streaming
  const { displayedEvents, streamStatus, isComplete, resetStream } = useRunEvents(
    run?.run_id ?? null,
    runStatus, events, activeStep >= 2
  );

  // Determine unlocked steps
  // Step 1: always unlocked
  // Step 2: unlocked once run is past queued/simulating
  const hasCompletedSimulation = Boolean(
    run && results.baseline
  );

  // Step 3: unlocked once stream is complete OR plan is ready / awaiting approval
  const hasPlanReady = Boolean(isComplete && results.plan && ["awaiting_approval", "completed", "rejected", "infeasible"].includes(runStatus));

  // Step 4: unlocked only after operator approves
  const isApproved = Boolean(
    runStatus === "completed" ||
    runStatus === "verified" ||
    runStatus === "applying"
  );

  // Compute step states for the rail
  const stepStates: Record<WizardStepId, StepState> = useMemo(() => {
    if (urlPreviewRail === "needs-you") {
      return { 1: "completed", 2: "completed", 3: "needs-you", 4: "locked" };
    }
    if (urlPreviewRail === "all-states") {
      return { 1: "completed", 2: "active", 3: "needs-you", 4: "locked" };
    }
    if (urlPreviewRail === "locked") {
      return { 1: "active", 2: "locked", 3: "locked", 4: "locked" };
    }
    if (overrideStepStates) {
      return {
        1: overrideStepStates[1] ?? "active",
        2: overrideStepStates[2] ?? "locked",
        3: overrideStepStates[3] ?? "locked",
        4: overrideStepStates[4] ?? "locked",
      };
    }

    const states: Record<WizardStepId, StepState> = {
      1: "locked",
      2: "locked",
      3: "locked",
      4: "locked",
    };

    // Step 1
    if (activeStep === 1) {
      states[1] = "active";
    } else {
      states[1] = "completed";
    }

    // Step 2
    if (!hasCompletedSimulation) {
      states[2] = "locked";
    } else if (activeStep === 2) {
      states[2] = "active";
    } else if (isComplete) {
      states[2] = "completed";
    } else {
      states[2] = "available";
    }

    // Step 3
    if (!hasPlanReady) {
      states[3] = "locked";
    } else if (isApproved) {
      states[3] = "completed";
    } else if (runStatus === "awaiting_approval") {
      states[3] = "needs-you";
    } else {
      states[3] = "completed";
    }

    // Step 4
    if (!isApproved) {
      states[4] = "locked";
    } else if (verificationComplete) {
      states[4] = "completed";
    } else if (activeStep === 4) {
      states[4] = "active";
    } else {
      states[4] = "completed";
    }

    return states;
  }, [
    activeStep,
    hasCompletedSimulation,
    hasPlanReady,
    isComplete,
    isApproved,
    runStatus,
    overrideStepStates, urlPreviewRail, verificationComplete,
  ]);

  // If approved, automatically transition to Step 4 if on Step 3
  useEffect(() => {
    if (isApproved && activeStep === 3) {
      setActiveStep(4);
    }
  }, [isApproved, activeStep]);

  // Summaries shown under completed steps per spec
  const stepSummaries: Record<WizardStepId, string | undefined> = useMemo(() => {
    // Determine critical zones count from results
    const baselineZones = results.baseline?.time_series?.at(-1)?.zones || [];
    const criticalCount = results.baseline?.totals.below_reserve ?? 0;
    const criticalSummary = criticalCount > 0 ? `${criticalCount} zones critical` : "Baseline ready";

    return {
      1: hasCompletedSimulation ? criticalSummary : undefined,
      2: isComplete ? `${displayedEvents.length} checks complete` : undefined,
      3: isApproved ? `Plan v${results.plan?.plan_version} approved` : undefined,
      4: verificationComplete ? "Verified" : undefined,
    };
  }, [results, hasCompletedSimulation, isComplete, hasPlanReady, isApproved, displayedEvents.length, verificationComplete]);

  const handleReset = () => {
    resetStream();
    setActiveStep(1);
    onResetDemo();
  };

  return (
    <div className={`wizard-card-container ${className}`}>
      <div className="wizard-card-header">
        <div className="wizard-title-block">
          <span className="eyebrow">SIMULATION WORKSPACE</span>
          <h2 className="wizard-main-title">Test. Compare. Respond.</h2>
          <p className="wizard-subline muted">
            {scenarioId} · v{scenarioVersion} · {horizon}h horizon · {modelVersion}
          </p>
        </div>

        <div className="wizard-header-status">
          <span className="footer-chip">
            {transport}
          </span>
        </div>
      </div>

      <div className="wizard-body-layout">
        {/* Left Vertical Rail */}
        <StepRail
          activeStep={activeStep}
          stepStates={stepStates}
          stepSummaries={stepSummaries}
          onSelectStep={(step) => setActiveStep(step)}
          onResetDemo={handleReset}
        />

        {/* Right Stage: ONLY active step is rendered */}
        <div className="wizard-stage-container">
          {activeStep === 1 && (
            <StepStage
              stepId={1}
              title="Step 1 · Simulate"
              subtitle="What you're seeing: Real-time simulation of the water network under stress before any intervention."
            >
              {renderStep1()}
            </StepStage>
          )}

          {activeStep === 2 && (
            <StepStage
              stepId={2}
              title="Step 2 · Investigate"
              subtitle="What you're seeing: Bounded agent testing recovery options against critical-service constraints."
            >
              {renderStep2 ? (
                renderStep2({
                  displayedEvents,
                  streamStatus,
                  isComplete,
                  hasPlanReady,
                  onReviewPlan: () => setActiveStep(3),
                })
              ) : (
                <div className="stage-investigate-grid">
                  <div className="investigate-stream-column">
                    <InvestigationStream
                      events={displayedEvents}
                      streamStatus={streamStatus}
                      onZoneAnalyze={onZoneAnalyze}
                    />
                  </div>

                  {miniTwin && (
                    <div className="investigate-twin-column">
                      <div className="mini-twin-card">
                        <div className="mini-twin-header">
                          <span className="eyebrow">ACTIVE TARGET</span>
                          <h4 className="mini-twin-title">Zone Digital Twin</h4>
                        </div>
                        <div className="mini-twin-content">{miniTwin}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </StepStage>
          )}

          {activeStep === 3 && (
            <StepStage
              stepId={3}
              title="Step 3 · Review"
              subtitle="What you're seeing: The exact proposed actions requiring human sign-off before network execution."
            >
              {renderStep3 ? (
                renderStep3()
              ) : (
                <div className="stage-placeholder-card">
                  <p className="muted">
                    Plan review and approval actions will be rendered here.
                  </p>
                </div>
              )}
            </StepStage>
          )}

          {activeStep === 4 && (
            <StepStage
              stepId={4}
              title="Step 4 · Verify"
              subtitle="What you're seeing: Verification audit proving essential water delivery and physical mass balance."
            >
              {renderStep4 ? (
                renderStep4()
              ) : (
                <div className="stage-placeholder-card">
                  <p className="muted">
                    Verification checklist and final evidence report will be rendered here.
                  </p>
                </div>
              )}
            </StepStage>
          )}
        </div>
      </div>
    </div>
  );
}
