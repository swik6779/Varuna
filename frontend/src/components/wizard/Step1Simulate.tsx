import React, { useState, useMemo, useEffect } from "react";
import { Play, ArrowRight, ShieldCheck, Thermometer, ChevronDown, ChevronRight, Waves, RotateCcw } from "lucide-react";
import type { Scenario, Result, Zone, Run } from "../../types";
import { ZoneGraph } from "../ZoneGraph";
import { StorageChart, FlowCharts } from "../Charts";
import { reserveDescription } from "./measurements";
import { Toggle } from "../ui";
import { ExplainTooltip } from "./ExplainTooltip";
import { number } from "../../lib/api";

export interface Step1SimulateProps {
  scenarios: Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  horizon: number;
  onSetHorizon: (h: number) => void;
  agents: boolean;
  onSetAgents: (a: boolean) => void;
  onRunSimulation: () => void;
  busy: boolean;
  run: Run | null;
  results: { baseline: Result | null; approved: Result | null };
  appliedScenario: Scenario | null;
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  onInvestigate: () => void;
  preview?: { applied: Result; draft: Result } | null;
}

export function Step1Simulate({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  horizon,
  onSetHorizon,
  agents,
  onSetAgents,
  onRunSimulation,
  busy,
  run,
  results,
  appliedScenario,
  selectedZoneId,
  onSelectZone,
  onInvestigate,
  preview,
}: Step1SimulateProps) {
  const [tableMode, setTableMode] = useState<"end" | "start">("end");
  const [zoneTableOpen, setZoneTableOpen] = useState(false);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillTab, setDrillTab] = useState<"storage" | "demand" | "shortage">("storage");

  const baselineResult = results.baseline;
  const isSimulationDone = Boolean(run && baselineResult);

  // Auto-scroll downwards when simulation results arrive
  useEffect(() => {
    if (isSimulationDone) {
      const timer = setTimeout(() => {
        const resultsEl = document.querySelector(".step1-results-container");
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isSimulationDone]);

  const handleRunSimulation = () => {
    onRunSimulation();
    setTimeout(() => {
      const el = document.querySelector(".step1-results-container") || document.querySelector(".run-simulation-btn");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Compute story strip parameters from applied scenario
  const storyInfo = useMemo(() => {
    if (!appliedScenario) return null;
    const zoneE = appliedScenario.zones.find((z) => z.id === "E") || appliedScenario.zones[0];
    const temp = zoneE?.temperature;
    const mult = zoneE?.demand_multiplier ?? 1;
    const demandPct = Math.round((mult - 1) * 100);
    // Find connection or zone supply loss
    const maxLoss = Math.max(
      ...appliedScenario.zones.map((z) => z.supply_loss),

    );
    const lossPct = Math.round(maxLoss * 100);
    return { temp, demandPct, lossPct };
  }, [appliedScenario]);

  // Compute headline from baseline results
  const headline = useMemo(() => {
    if (!baselineResult || !appliedScenario) return "";
    const lastStep = baselineResult.time_series.at(-1);
    if (!lastStep) return "";

    const criticalZones: { id: string; name: string }[] = [];
    for (const zState of lastStep.zones) {
      const zDef = appliedScenario.zones.find((z) => z.id === zState.id);
      if (zState.condition === "Critical" || (zDef && zState.storage < zDef.reserve)) {
        criticalZones.push({ id: zState.id, name: zDef?.name || zState.id });
      }
    }

    if (criticalZones.length === 0) {
      return `All ${appliedScenario.zones.length} zones end at or above reserve.`;
    }

    const namesText = criticalZones.map((z) => `${z.name} (${z.id})`).join(" and ");
    return `${criticalZones.length} of ${appliedScenario.zones.length} zones run out of reserve: ${namesText}.`;
  }, [baselineResult, appliedScenario]);

  // Compute zone E details for metric tiles and drilldown
  const zoneEDef = appliedScenario?.zones.find((z) => z.id === selectedZoneId) || appliedScenario?.zones.find((z) => z.id === "E");
  const zoneEFinalState = baselineResult?.time_series.at(-1)?.zones.find((z) => z.id === (zoneEDef?.id || "E"));

  // Derive "Time to reserve" replacement text
  const timeToReserveText = zoneEDef && baselineResult ? reserveDescription(zoneEDef, baselineResult) : "";

  return (
    <div className="step-simulate-flow">
      {/* Before / Controls state */}
      {!isSimulationDone ? (
        <div className="step1-pre-run-container">
          {/* Story Strip */}
          {storyInfo && <div className="story-strip-banner" role="region" aria-label="Scenario summary">
            <p className="story-strip-text">
              A <strong>{storyInfo.temp} °C</strong> heatwave raises water demand by{" "}
              <strong>{storyInfo.demandPct}%</strong> while <strong>{storyInfo.lossPct}%</strong> of external
              supply is lost. Can we keep essential water flowing for <strong>{horizon} hours</strong>?
            </p>
          </div>}

          <div className="step1-controls-card card">
            <div className="step1-controls-grid">
              <div className="step1-field-col">
                <label className="step1-field-label" htmlFor="step1-scenario-select">
                  <span>Scenario</span>
                  <ExplainTooltip text="Pre-configured extreme event scenarios with deterministic baseline properties." />
                </label>
                <select
                  id="step1-scenario-select"
                  aria-label="Scenario selection"
                  value={selectedScenarioId}
                  onChange={(e) => onSelectScenario(e.target.value)}
                  disabled={busy}
                  className="step1-select-input"
                >
                  {scenarios.map((s) => (
                    <option key={s.scenario_id} value={s.scenario_id}>
                      {s.name} (v{s.scenario_version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="step1-field-col">
                <div className="step1-field-label">
                  <span>Forecast horizon</span>
                  <ExplainTooltip text="The forward simulation window over which mass balance is calculated (3, 6, or 12 hours)." />
                </div>
                <div className="segmented step1-segmented" role="group" aria-label="Forecast horizon">
                  {[3, 6, 12].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={horizon === h ? "chosen" : ""}
                      onClick={() => onSetHorizon(h)}
                      disabled={busy}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
              </div>

              <div className="step1-field-col">
                <div className="step1-field-label">
                  <span>Agent investigation</span>
                  <ExplainTooltip text="Toggle bounded AI investigation and automated response planning." />
                </div>
                <div className="agents-chip-row">
                  <Toggle checked={agents} onCheckedChange={onSetAgents} label="Agents active" />
                  <span className="chip-agents-active">
                    <span className="live-dot" />
                    Agents {agents ? "active" : "off"}: Bounded planning
                  </span>
                </div>
              </div>
            </div>

            <div className="step1-action-row">
              <div className="step1-action-info">
                <span className="step1-action-hint">
                  15-min mass balance time steps · Deterministic baseline simulation outputs
                </span>
              </div>
              <button
                type="button"
                className="primary-button run-simulation-btn"
                onClick={handleRunSimulation}
                disabled={busy || !appliedScenario || Boolean(run && ["queued", "simulating"].includes(run.status))}
              >
                <Play size={16} fill="currentColor" />
                Run Simulation
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Principles Chips */}
            <div className="principles-chips-row">
              <div className="principle-chip">
                <Thermometer size={14} className="principle-icon amber" />
                <span>Explicit heatwave assumptions: demand changes only through the scenario multiplier</span>
              </div>
              <div className="principle-chip">
                <ShieldCheck size={14} className="principle-icon blue" />
                <span>Essential supply comes first: plans violating critical-service constraints are rejected</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results state after simulation completes */
        <div className="step1-results-container">
          {/* Active Scenario and Re-run bar */}
          <div className="step1-active-scenario-bar">
            <div className="scenario-bar-meta">
              <span>Applied scenario: <strong>{appliedScenario?.name} (v{appliedScenario?.scenario_version})</strong></span>
              <span>·</span>
              <span>Horizon: <strong>{baselineResult?.horizon} h</strong></span>
              <span>·</span>
              <span>Agents: <strong>{agents ? "active" : "off"}</strong></span>
            </div>
            <div className="scenario-bar-actions">
              <button
                type="button"
                className="outline-button re-run-btn"
                onClick={handleRunSimulation}
                disabled={busy}
              >
                <RotateCcw size={14} />
                Re-run simulation
              </button>
              <button
                type="button"
                className="secondary-button change-scenario-btn"
                onClick={() => onSelectScenario(selectedScenarioId)}
                disabled={busy}
              >
                Change scenario
              </button>
            </div>
          </div>

          {/* Headline sentence computed from data */}
          <div className="step1-headline-banner">
            <Waves size={18} className="headline-icon" />
            <p className="step1-headline-text">{headline}</p>
          </div>

          {/* Digital Twin */}
          <div className="step1-twin-card card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TOPOLOGY & FLOW MEASUREMENTS</span>
                <h3 className="section-title">Network Digital Twin</h3>
                <p className="small muted">
                  Click any zone node to open its parameters drawer. Red rings indicate critical reserve deficits.
                </p>
              </div>
              <span className="badge blue">
                Without plan · Baseline {baselineResult?.horizon} h
              </span>
            </div>

            {appliedScenario && (
              <div className="twin-graph-wrapper">
                <ZoneGraph
                  scenario={appliedScenario}
                  result={baselineResult}
                  selected={selectedZoneId}
                  onSelect={onSelectZone}
                />
              </div>
            )}

            {/* Compact Metric Tiles for Active Zone */}
            {zoneEFinalState && zoneEDef && (
              <div className="twin-metrics-row">
                <div className="twin-metric-tile">
                  <div className="metric-header-row">
                    <span>Delivered demand</span>
                    <ExplainTooltip parameter="Demand" />
                  </div>
                  <strong className="metric-value tabular-nums">
                    {number(zoneEFinalState.delivered / baselineResult!.step_hours)} <small>m³/h</small>
                  </strong>
                  <span className="small muted">
                    of {number(zoneEFinalState.requested / baselineResult!.step_hours)} requested in {zoneEDef.name}
                  </span>
                </div>

                <div className="twin-metric-tile">
                  <div className="metric-header-row">
                    <span>Supply loss</span>
                    <ExplainTooltip parameter="Supply loss" />
                  </div>
                  <strong className="metric-value tabular-nums">
                    {number(zoneEFinalState.supply_loss / baselineResult!.step_hours)} <small>m³/h</small>
                  </strong>
                  <span className="small muted">
                    {Math.round(zoneEDef.supply_loss * 100)}% incoming loss fraction
                  </span>
                </div>

                <div className="twin-metric-tile">
                  <div className="metric-header-row">
                    <span>Operating condition</span>
                    <ExplainTooltip text="Operating state calculated from physical storage reserves and delivery target constraints." />
                  </div>
                  <strong
                    className={`metric-value ${
                      zoneEFinalState.condition === "Critical"
                        ? "text-red"
                        : zoneEFinalState.condition === "Stressed"
                          ? "text-amber"
                          : "text-green"
                    }`}
                  >
                    {zoneEFinalState.condition}
                  </strong>
                  <span className="small muted">
                    {timeToReserveText}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 1: Zone conditions table (Closed by default) */}
          <div className="accordion-card card">
            <button
              type="button"
              className="accordion-header"
              onClick={() => setZoneTableOpen((prev) => !prev)}
              aria-expanded={zoneTableOpen}
            >
              <div className="accordion-title-block">
                <span>{zoneTableOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                <h4>Zone conditions table</h4>
                <span className="badge neutral">
                  {tableMode === "end" ? "Measured ending state" : "Applied initial conditions"}
                </span>
              </div>
            </button>

            {zoneTableOpen && appliedScenario && (
              <div className="accordion-body">
                <div className="table-toolbar">
                  <div
                    className="segmented table-mode-toggle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={tableMode === "start" ? "chosen" : ""}
                      onClick={() => setTableMode("start")}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      className={tableMode === "end" ? "chosen" : ""}
                      onClick={() => setTableMode("end")}
                    >
                      End of {baselineResult?.horizon} h
                    </button>
                  </div>
                </div>
                <div className="table-responsive-wrapper">
                  <table className="wizard-data-table">
                    <thead>
                      <tr>
                        <th>
                          Neighborhood <ExplainTooltip text="Zone name and estimated population served." />
                        </th>
                        <th>
                          Condition <ExplainTooltip text="Operating condition evaluated from physical tank reserves." />
                        </th>
                        <th>
                          Demand vs supply <ExplainTooltip text="Requested demand rate versus scheduled external supply rate." />
                        </th>
                        <th>
                          Storage <ExplainTooltip parameter="Storage" />
                        </th>
                        <th>
                          Temperature <ExplainTooltip text="Ambient temperature recorded for context." />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {appliedScenario.zones.map((z) => {
                        const finalZ = baselineResult?.time_series.at(-1)?.zones.find((s) => s.id === z.id);
                        const isStressed = finalZ?.condition === "Stressed";
                        const isCrit = finalZ?.condition === "Critical";
                        const curStorage = tableMode === "end" ? (finalZ?.storage ?? z.storage) : z.storage;
                        const curSupply = tableMode === "end" && finalZ ? finalZ.external / baselineResult!.step_hours : z.supply;

                        return (
                          <tr
                            key={z.id}
                            className={`table-row-selectable ${selectedZoneId === z.id ? "is-selected-row" : ""}`}
                            onClick={() => onSelectZone(z.id)}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectZone(z.id); } }}
                          >
                            <td>
                              <span className="zone-tag-letter">{z.id}</span>
                              <span className="zone-tag-name">
                                {z.name}
                                <small className="tabular-nums muted"> ({number(z.population, 0)} people)</small>
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${isCrit ? "red" : isStressed ? "amber" : "green"}`}
                              >
                                {tableMode === "end" ? finalZ?.condition || "Normal" : "Initial state"}
                              </span>
                            </td>
                            <td className="tabular-nums">
                              {number(z.demand * z.demand_multiplier)} / {number(curSupply)} <small className="muted">m³/h</small>
                            </td>
                            <td>
                              <div className="storage-cell-layout">
                                <span className="tabular-nums">
                                  {number(curStorage, 0)} <small className="muted">/ {z.storage_capacity} m³</small>
                                </span>
                                <div className="mini-storage-track">
                                  <div
                                    className={`mini-storage-fill ${isCrit ? "bg-red" : isStressed ? "bg-amber" : "bg-blue"}`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, (100 * curStorage) / z.storage_capacity))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="tabular-nums">
                              {number(z.temperature, 1)} <small className="muted">°C</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Drill into Zone E (Closed by default) */}
          <div className="accordion-card card">
            <button
              type="button"
              className="accordion-header"
              onClick={() => setDrillDownOpen((prev) => !prev)}
              aria-expanded={drillDownOpen}
            >
              <div className="accordion-title-block">
                <span>{drillDownOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                <h4>Drill into Zone {selectedZoneId} ({zoneEDef?.name})</h4>
                <span className="badge neutral">Without plan series</span>
              </div>
            </button>

            {drillDownOpen && zoneEDef && baselineResult && (
              <div className="accordion-body">
                {/* ONE card with tabs */}
                <div className="drill-tabs-card">
                  <div className="drill-tabs-nav" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={drillTab === "storage"}
                      className={`drill-tab-btn ${drillTab === "storage" ? "active" : ""}`}
                      onClick={() => setDrillTab("storage")}
                    >
                      Storage trajectory
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={drillTab === "demand"}
                      className={`drill-tab-btn ${drillTab === "demand" ? "active" : ""}`}
                      onClick={() => setDrillTab("demand")}
                    >
                      Demand & delivery
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={drillTab === "shortage"}
                      className={`drill-tab-btn ${drillTab === "shortage" ? "active" : ""}`}
                      onClick={() => setDrillTab("shortage")}
                    >
                      Unmet demand
                    </button>
                  </div>

                  <details><summary>View measured values · external supply</summary>
                    <table className="wizard-data-table"><thead><tr><th>Hour</th><th>Without plan · gross external supply (m³/h)</th></tr></thead><tbody>
                    {baselineResult.time_series.map(step => <tr key={step.hour}><td>{step.hour} h</td><td>{number((step.zones.find(z => z.id === selectedZoneId)?.external ?? 0) / baselineResult.step_hours, 1)}</td></tr>)}
                    </tbody></table>
                  </details>
                  <div className="drill-tab-content">
                    {drillTab === "storage" && (
                      <div className="drill-chart-pane">
                        <StorageChart
                          baseline={preview?.applied || baselineResult}
                          comparison={preview?.draft || null}
                          zone={zoneEDef}
                          label="Draft preview"
                        />
                      </div>
                    )}
                    {drillTab === "demand" && (
                      <div className="drill-chart-pane">
                        <FlowCharts
                          baseline={preview?.applied || baselineResult}
                          comparison={preview?.draft || null}
                          zoneId={selectedZoneId}
                          label="Draft preview"
                          chartFilter="demand"
                        />
                      </div>
                    )}
                    {drillTab === "shortage" && (
                      <div className="drill-chart-pane">
                        <FlowCharts
                          baseline={preview?.applied || baselineResult}
                          comparison={preview?.draft || null}
                          zoneId={selectedZoneId}
                          label="Draft preview"
                          chartFilter="shortage"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Investigate */}
          <div className="step-stage-footer-actions">
            <div className="action-left-buttons">
              <button
                type="button"
                className="outline-button"
                onClick={() => onSelectScenario(selectedScenarioId)}
                disabled={busy}
              >
                Change scenario
              </button>
            </div>
            <button
              type="button"
              className="primary-button stage-next-button pulse-button"
              onClick={onInvestigate}
            >
              Investigate <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
