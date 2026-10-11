/**
 * WizardPreview – standalone preview page for demonstrating the wizard shell,
 * step rail in all four states, and the investigation stream mid-replay.
 *
 * Access at: http://localhost:5173/wizard-preview
 *
 * Query parameters:
 *   ?rail=all-states    → shows Step 1 completed, 2 active, 3 needs-you, 4 locked
 *   ?rail=needs-you     → shows 1+2 completed, 3 needs-you, 4 locked
 *   ?rail=locked        → shows 1 active, 2-4 locked
 *   ?rail=completed     → shows all completed
 *   ?stream=mid         → auto-fills stream with sample events mid-replay
 *   (default)           → shows "all-states" rail with mid-replay stream
 */
import React, { useState, useMemo } from "react";
import "./wizard.css";
import { StepRail } from "./StepRail";
import { StepStage } from "./StepStage";
import { InvestigationStream } from "./InvestigationStream";
import type { WizardStepId, StepState, DisplayedEvent, StreamStatus } from "./types";

// Sample events for the stream preview
function makeSampleEvents(): DisplayedEvent[] {
  const now = new Date();
  const fmt = (offset: number) => {
    const d = new Date(now.getTime() - offset * 1000);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return [
    {
      seq: 7,
      kind: "agent_step",
      rawMessage: "Bounded plan step executed",
      title: "Drafted a response plan",
      subtitle: "Within the agent's limits",
      revealTime: fmt(0),
      status: "in_progress",
      detailLines: [
        "› Action: Reallocate 12 m³/h from Zone B surplus",
        "› Target: Zone E critical demand floor",
        "› Constraint: Priority 1 zones served first",
      ],
      rawDetail: {
        tool: "bounded_plan",
        arguments: {
          action: "reallocate",
          source_zone: "B",
          target_zone: "E",
          rate: 12,
        },
      },
      runId: "preview-run",
    },
    {
      seq: 6,
      kind: "tool_call",
      rawMessage: "evaluate_recovery_sequence",
      title: "Tested the recovery sequence",
      subtitle: "Which order restores supply fastest?",
      revealTime: fmt(3),
      status: "completed",
      detailLines: [
        "› Sequence: E → D → A",
        "› Recovery Time: 2.4 hours",
        "› Critical Zones First: true",
      ],
      rawDetail: {
        tool: "evaluate_recovery_sequence",
        arguments: {
          sequence: ["E", "D", "A"],
          recovery_time_hours: 2.4,
        },
      },
      runId: "preview-run",
    },
    {
      seq: 5,
      kind: "tool_call",
      rawMessage: "evaluate_water_point_site",
      title: "Checked candidate water-point sites",
      subtitle: "Where could people get drinking water?",
      revealTime: fmt(6),
      status: "completed",
      detailLines: [
        "› Zone Id: E",
        "› Candidate Sites: 3",
        "› Accessible: 2 of 3",
      ],
      rawDetail: {
        tool: "evaluate_water_point_site",
        arguments: {
          zone_id: "E",
          candidate_count: 3,
        },
      },
      runId: "preview-run",
    },
    {
      seq: 4,
      kind: "verification",
      rawMessage: "critical-service verification passed",
      title: "Verified essential supply is protected",
      subtitle: "Critical demand checked in the real scenario",
      revealTime: fmt(9),
      status: "completed",
      detailLines: [
        "› Critical Served: 100%",
        "› Violations: 0",
      ],
      rawDetail: {
        tool: "verify_critical_service",
        arguments: {},
      },
      runId: "preview-run",
    },
    {
      seq: 3,
      kind: "simulation",
      rawMessage: "Baseline computed",
      title: "Baseline simulation complete",
      subtitle: "Water balance and baseline demands calculated",
      revealTime: fmt(12),
      status: "completed",
      detailLines: [
        "› Zones Modeled: 6",
        "› Timesteps: 24",
        "› Mass Balance: verified",
      ],
      rawDetail: {},
      runId: "preview-run",
    },
  ];
}

const RAIL_PRESETS: Record<string, Record<WizardStepId, StepState>> = {
  "all-states": { 1: "completed", 2: "active", 3: "needs-you", 4: "locked" },
  "needs-you": { 1: "completed", 2: "completed", 3: "needs-you", 4: "locked" },
  locked: { 1: "active", 2: "locked", 3: "locked", 4: "locked" },
  completed: { 1: "completed", 2: "completed", 3: "completed", 4: "completed" },
};

export function WizardPreview() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const railPreset = params.get("rail") || "all-states";
  const [presetKey, setPresetKey] = useState(railPreset);

  const stepStates = useMemo(() => RAIL_PRESETS[presetKey] || RAIL_PRESETS["all-states"], [presetKey]);
  const activeStep: WizardStepId = (Object.entries(stepStates).find(([, v]) => v === "active")?.[0] as unknown as WizardStepId) ?? 2;

  const sampleEvents = useMemo(() => makeSampleEvents(), []);
  const streamStatus: StreamStatus = "replaying";

  const stepSummaries: Record<WizardStepId, string | undefined> = {
    1: stepStates[1] === "completed" ? "2 zones critical" : undefined,
    2: stepStates[2] === "completed" ? "Analysis complete" : undefined,
    3: stepStates[3] === "completed" ? "Plan verified & approved" : undefined,
    4: stepStates[4] === "completed" ? "Recorded for v3" : undefined,
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <span className="eyebrow">WIZARD PREVIEW</span>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 32, margin: "8px 0" }}>
          Phase 1 & 2 Component Preview
        </h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
          This page demonstrates the wizard shell components in isolation.
          Select a rail preset below to see all four states.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {Object.keys(RAIL_PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              className={`footer-chip ${presetKey === key ? "" : ""}`}
              style={{
                cursor: "pointer",
                background: presetKey === key ? "var(--green, #0b5d50)" : "var(--soft, #e4eee9)",
                color: presetKey === key ? "#fffef9" : "#315a53",
                border: presetKey === key ? "1px solid var(--green, #0b5d50)" : "1px solid #b4c8c0",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
              onClick={() => setPresetKey(key)}
            >
              {key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Full wizard layout preview */}
      <div className="wizard-card-container">
        <div className="wizard-card-header">
          <div className="wizard-title-block">
            <span className="eyebrow">SIMULATION WORKSPACE</span>
            <h2 className="wizard-main-title">Test. Compare. Respond.</h2>
            <p className="wizard-subline muted">
              compound · v3 · 6h horizon · deterministic-v4
            </p>
          </div>
          <div className="wizard-header-status">
            <span className="footer-chip">
              Local backend · Polling
            </span>
          </div>
        </div>

        <div className="wizard-body-layout">
          {/* Left Vertical Rail */}
          <StepRail
            activeStep={activeStep}
            stepStates={stepStates}
            stepSummaries={stepSummaries}
            onSelectStep={() => {}}
            onResetDemo={() => setPresetKey("locked")}
          />

          {/* Right Stage: Investigation Stream */}
          <div className="wizard-stage-container">
            <StepStage
              stepId={2}
              title="Step 2 · Investigate"
              subtitle="Bounded AI agent analyzes constraints, recovery sequences, and emergency water points."
            >
              <div className="stage-investigate-grid">
                <div className="investigate-stream-column">
                  <InvestigationStream
                    events={sampleEvents}
                    streamStatus={streamStatus}
                  />
                </div>
              </div>
            </StepStage>
          </div>
        </div>
      </div>

      {/* State reference card */}
      <div style={{
        marginTop: 32,
        padding: 20,
        background: "#f9faf7",
        border: "1px solid var(--border, #c4cdc7)",
        borderRadius: 12,
      }}>
        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, margin: "0 0 12px 0" }}>
          Rail State Reference
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <strong style={{ color: "var(--green, #0b5d50)" }}>● Active</strong>
            <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
              Green circle with number, expanded card, bold label
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--green, #0b5d50)" }}>✓ Completed</strong>
            <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
              Green checkmark circle, pill-shaped, summary text
            </p>
          </div>
          <div>
            <strong style={{ color: "#bd7b32" }}>◐ Needs You</strong>
            <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
              Amber border, pulsing dot, "Needs your decision" badge
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--muted, #6d7873)" }}>○ Locked</strong>
            <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
              Dimmed, border circle, disabled pointer
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
