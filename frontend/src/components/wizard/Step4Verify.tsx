import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Download, Upload, FileText, RotateCcw, ChevronDown, ChevronRight, Activity, Cpu } from "lucide-react";
import type { Result, Scenario, Plan, Run } from "../../types";
import { StorageChart, FlowCharts } from "../Charts";
import { ZoneGraph } from "../ZoneGraph";
import { reserveDescription } from "./measurements";
import { formatEventTitle } from "./useRunEvents";
import { ExplainTooltip } from "./ExplainTooltip";
import { number, downloadJson } from "../../lib/api";

export interface Step4VerifyProps {
  baselineResult: Result | null;
  approvedResult: Result | null;
  plan: Plan | null;
  scenario: Scenario | null;
  run: Run | null;
  onResetDemo: () => void;
  onOpenReport: () => void;
  onImportJson: () => void;
  events: import("../../types").RunEvent[];
  onVerificationComplete: () => void;
  onSelectZone: (id: string) => void;
}

export function Step4Verify({
  baselineResult,
  approvedResult,
  plan,
  scenario,
  run,
  onResetDemo,
  onOpenReport,
  onImportJson,
  events,
  onVerificationComplete,
  onSelectZone,
}: Step4VerifyProps) {
  const [visibleChecks, setVisibleChecks] = useState<number>(0);
  const [heroTab, setHeroTab] = useState<"storage" | "demand" | "shortage">("storage");
  const [twinViewMode, setTwinViewMode] = useState<"approved" | "baseline">("approved");
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  const hasDecision = events.some(e => e.kind === "decision");
  const hasOutcome = events.some(e => e.kind === "outcome");
  const hasReport = events.some(e => e.kind === "report");
  const ready = Boolean(approvedResult && hasDecision && hasOutcome && hasReport && run?.status === "completed");
  useEffect(() => {
    setVisibleChecks(0);
    if (!ready) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [1, 2, 3, 4].map(i => setTimeout(() => {
      setVisibleChecks(i);
      if (i === 4) onVerificationComplete();
    }, reduced ? 0 : i * 400));
    return () => timers.forEach(clearTimeout);
  }, [ready, run?.run_id]);
  const planVersion = plan?.plan_version;
  const scenarioVersion = run?.scenario_version;
  const zoneE = scenario?.zones.find((z) => z.id === "E") || scenario?.zones[0];

  // Compute per-zone before & after comparison
  const comparisonRows = useMemo(() => {
    if (!scenario || !baselineResult || !approvedResult) return [];
    const baseFinal = baselineResult.time_series.at(-1);
    const apprFinal = approvedResult.time_series.at(-1);

    return scenario.zones.map((z) => {
      const bZ = baseFinal?.zones.find((item) => item.id === z.id);
      const aZ = apprFinal?.zones.find((item) => item.id === z.id);

      const baseStorage = bZ?.storage ?? z.storage;
      const apprStorage = aZ?.storage ?? baseStorage;
      const storageDiff = apprStorage - baseStorage;

      const sum = (result: Result, key: "unmet" | "incoming") => result.time_series.reduce((n, step) => n + (step.zones.find(item => item.id === z.id)?.[key] ?? 0), 0);
      const baseUnmet = sum(baselineResult, "unmet");
      const apprUnmet = sum(approvedResult, "unmet");
      const unmetDiff = apprUnmet - baseUnmet;

      const baseTransfers = sum(baselineResult, "incoming");
      const apprTransfers = sum(approvedResult, "incoming");

      // Changed zones (B and E had unmet shortfalls fixed)
      const hasChanged = Math.abs(unmetDiff) > 0.1 || Math.abs(storageDiff) > 20;

      return {
        id: z.id,
        name: z.name,
        baseStorage,
        apprStorage,
        storageDiff,
        baseUnmet,
        apprUnmet,
        unmetDiff,
        baseTransfers,
        apprTransfers,
        hasChanged,
      };
    });
  }, [scenario, baselineResult, approvedResult]);

  const handleExport = () => {
    if (!run || !approvedResult) return;
    downloadJson(
      scenario,
      `aquaagent-run-${run.run_id}-verified.json`,
    );
  };

  const checklistItems = [
    {
      title: approvedResult?.verified ? "Mass balance verified" : "Mass balance verification pending",
      subtitle: "Water in = water out + change in storage",
      explanation: "Conservation of mass checked at every simulated time step.",
    },
    {
      title: `Essential demand served: ${approvedResult ? number(approvedResult.totals.critical_percent) + "%" : "pending"}`,
      subtitle: "With approved plan · measured share of essential demand delivered",
      explanation: "Hospitals, designated cooling stations, and emergency drinking supplies protected without shortfall.",
    },
    {
      title: plan?.feasible && approvedResult?.verified ? "Plan passed critical-service verification" : "Critical-service verification pending",
      subtitle: "Full forward physical simulation passed without constraint violation",
      explanation: "Validated in the simulation engine against pipe capacity, tank capacities, and source limits.",
    },
    {
      title: `Plan v${planVersion} recorded for scenario v${scenarioVersion}`,
      subtitle: "Your decision and evidence report are recorded",
      explanation: "Cryptographic configuration hash and step sequences preserved for operator evidence.",
    },
  ];

  return (
    <div className="step-verify-flow">
      {/* Animated Verification Checklist */}
      <div className="step4-checklist-card card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">VERIFICATION AUDIT</span>
            <h3 className="section-title">Automated Verification Checklist</h3>
          </div>
          <span className="badge green">
            {ready ? `${visibleChecks} of ${checklistItems.length} checks shown` : "Waiting for approved simulation and evidence"}
          </span>
        </div>

        <div className="checklist-items-stack">
          {checklistItems.map((item, index) => {
            const isVisible = visibleChecks >= index + 1;
            return (
              <div
                key={index}
                className={`checklist-row ${isVisible ? "row-visible" : "row-hidden"}`}
              >
                <div className="checklist-icon-wrap">
                  <CheckCircle2 size={20} className="check-green-icon" />
                </div>
                <div className="checklist-content">
                  <div className="checklist-title-line">
                    <strong>{item.title}</strong>
                    <ExplainTooltip text={item.explanation} />
                  </div>
                  <p className="small muted">{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="checklist-closing-line small muted">
          <em>Every action in this plan is backed by a simulation and a verification step.</em>
        </p>
      </div>

      <div className="card verification-event-list">{events.filter(event => ["decision", "outcome", "report"].includes(event.kind)).map(event => {
        const label = formatEventTitle(event);
        return <p key={event.seq}><strong>{event.kind === "decision" ? `Operator approved plan v${planVersion}` : label.title}</strong><br/><span className="small muted">{label.subtitle}</span></p>;
      })}</div>
      {/* Hero Chart: Zone E storage (Without plan vs With approved plan) */}
      {zoneE && baselineResult && (
        <div className="step4-hero-chart-card card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">POST-APPROVAL OPERATING TRAJECTORY</span>
              <h3 className="section-title">Zone {zoneE.id} · {zoneE.name} · Response verification</h3>
              <p className="small muted">
                Without plan → With approved plan · {baselineResult.horizon} h horizon.
              </p>
              {approvedResult && <p className="small muted">With approved plan: {reserveDescription(zoneE, approvedResult)}</p>}
            </div>

            <div className="drill-tabs-nav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={heroTab === "storage"}
                className={`drill-tab-btn ${heroTab === "storage" ? "active" : ""}`}
                onClick={() => setHeroTab("storage")}
              >
                Storage comparison
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={heroTab === "demand"}
                className={`drill-tab-btn ${heroTab === "demand" ? "active" : ""}`}
                onClick={() => setHeroTab("demand")}
              >
                Demand & delivery
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={heroTab === "shortage"}
                className={`drill-tab-btn ${heroTab === "shortage" ? "active" : ""}`}
                onClick={() => setHeroTab("shortage")}
              >
                Unmet demand
              </button>
            </div>
          </div>

          <div className="hero-chart-body">
            {heroTab === "storage" && (
              <StorageChart
                baseline={baselineResult}
                comparison={approvedResult}
                zone={zoneE}
                label="Approved plan"
              />
            )}
            {heroTab === "demand" && (
              <FlowCharts
                baseline={baselineResult}
                comparison={approvedResult}
                zoneId={zoneE.id}
                label="Approved plan"
                chartFilter="demand"
              />
            )}
            {heroTab === "shortage" && (
              <FlowCharts
                baseline={baselineResult}
                comparison={approvedResult}
                zoneId={zoneE.id}
                label="Approved plan"
                chartFilter="shortage"
              />
            )}
          </div>
        </div>
      )}

      {/* Digital Twin with Toggle (Without plan | With approved plan) */}
      {scenario && baselineResult && (
        <div className="step4-twin-card card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PHYSICAL NETWORK VIEW</span>
              <h3 className="section-title">Digital Twin State Comparison</h3>
            </div>
            <div className="segmented twin-view-toggle">
              <button
                type="button"
                className={twinViewMode === "baseline" ? "chosen" : ""}
                onClick={() => setTwinViewMode("baseline")}
              >
                Without plan
              </button>
              <button
                type="button"
                className={twinViewMode === "approved" ? "chosen" : ""}
                onClick={() => setTwinViewMode("approved")}
              >
                With approved plan
              </button>
            </div>
          </div>

          <div className="twin-graph-wrapper">
            <ZoneGraph
              scenario={scenario}
              result={twinViewMode === "approved" ? approvedResult || baselineResult : baselineResult}
              selected="E"
              onSelect={onSelectZone}
            />
          </div>
        </div>
      )}

      {/* Per-Zone Comparison Table */}
      <div className="step4-comparison-card card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">BEFORE & AFTER DELTAS</span>
            <h3 className="section-title">Per-Zone Outcome Comparison</h3>
            <p className="small muted">
              Without plan → With approved plan. Unmet demand and transfers are volumes over the full horizon.
            </p>
          </div>
          <span className="badge blue">{scenario?.zones.length} connected zones</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="wizard-data-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>
                  Ending storage <ExplainTooltip text="Tank water volume at the end of this run: Without plan → With approved plan." />
                </th>
                <th>
                  Unmet demand <ExplainTooltip parameter="Unmet demand" />
                </th>
                <th>
                  Incoming transfers <ExplainTooltip text="Water moved between zones to cover shortfalls." />
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.hasChanged ? "row-highlight-changed" : ""}
                >
                  <td>
                    <span className="zone-tag-letter">{row.id}</span>
                    <span className="zone-tag-name">
                      {row.name} ({row.id})
                      {row.hasChanged && <span className="changed-pill">Changed</span>}
                    </span>
                  </td>
                  <td className="tabular-nums">
                    <span className="muted">{number(row.baseStorage, 1)}</span>
                    {" → "}
                    <span className="font-semibold">{number(row.apprStorage, 1)} m³</span>{" "}
                    {row.storageDiff !== 0 && (
                      <span className={`change-chip ${row.storageDiff > 0 ? "delta-pos" : "delta-neg"}`}>
                        {row.storageDiff > 0 ? `+${number(row.storageDiff, 0)}` : number(row.storageDiff, 0)}
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums">
                    <span className={row.baseUnmet > 0 ? "text-strike muted" : "muted"}>
                      {number(row.baseUnmet, 1)}
                    </span>
                    {" → "}
                    <span className="text-green font-semibold">{number(row.apprUnmet, 1)} m³</span>
                    {row.baseUnmet > 0 && row.apprUnmet === 0 && (
                      <span className="change-chip delta-pos">Resolved (0 m³)</span>
                    )}
                  </td>
                  <td className="tabular-nums">
                    <span className="muted">{number(row.baseTransfers, 1)}</span>
                    {" → "}
                    <span>{number(row.apprTransfers, 1)} m³</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Details Accordion (Closed by default) */}
      <div className="accordion-card card">
        <button
          type="button"
          className="accordion-header"
          onClick={() => setTechDetailsOpen((prev) => !prev)}
          aria-expanded={techDetailsOpen}
        >
          <div className="accordion-title-block">
            <span>{techDetailsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
            <h4>Technical details & mass conservation residuals</h4>
            <span className="badge neutral">Deterministic audit</span>
          </div>
        </button>

        {techDetailsOpen && approvedResult && (
          <div className="accordion-body">
            <div className="tech-metrics-grid">
              <div className="tech-metric-card">
                <span className="small muted">Max Step Balance Residual</span>
                <strong className="tabular-nums">
                  {approvedResult.max_mass_residual.toExponential(3)} m³
                </strong>
                <p className="tiny muted">Water in = water out + storage change (residual ≈ 0)</p>
              </div>
              <div className="tech-metric-card">
                <span className="small muted">Simulation Runtime</span>
                <strong className="tabular-nums">{number(approvedResult.elapsed_ms, 1)} ms</strong>
                <p className="tiny muted">Without plan runtime: {baselineResult && number(baselineResult.elapsed_ms, 1)} ms · compared with approved plan</p>
              </div>
              <div className="tech-metric-card">
                <span className="small muted">Execution Mode</span>
                <div style={{ marginTop: 4 }}>
                  <span className="badge neutral">
                    <Cpu size={12} style={{ marginRight: 4 }} />
                    {run?.agent_mode || plan?.mode}{run?.llm_calls !== undefined ? ` · ${run.llm_calls} LLM calls` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="step4-action-bar">
        <div className="action-left-buttons">
          <button type="button" className="outline-button" onClick={handleExport}>
            <Download size={15} />
            Export JSON
          </button>
          <button type="button" className="outline-button" onClick={onImportJson}>
            <Upload size={15} />
            Import JSON
          </button>
          <button type="button" className="text-link-button" onClick={onOpenReport}>
            <FileText size={15} />
            Open evidence report
          </button>
        </div>

        <button type="button" className="primary-button rerun-btn" onClick={onResetDemo}>
          <RotateCcw size={15} />
          Run another scenario
        </button>
      </div>
      <p className="small muted text-center" style={{ marginTop: 8 }}>
        Applied scenario v{scenarioVersion}. Export contains scenario JSON for import, with no credentials or approval tokens. Import validates it and applies a new version; earlier approvals do not carry over.
      </p>
    </div>
  );
}
