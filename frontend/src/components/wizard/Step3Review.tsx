import React, { useState, useMemo } from "react";
import { Check, X, FileText, ChevronDown, ChevronRight, ShieldCheck, Droplet, ArrowUpRight, Maximize2, Minimize2 } from "lucide-react";
import type { Plan, Scenario, Result, Run } from "../../types";
import { ZoneGraph } from "../ZoneGraph";
import { ExplainTooltip } from "./ExplainTooltip";
import { number } from "../../lib/api";

export interface Step3ReviewProps {
  plan: Plan | null;
  scenario: Scenario | null;
  baselineResult: Result | null;
  run: Run | null;
  onApprove: () => void;
  onReject: () => void;
  onOpenReport: () => void;
  busy: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  agent?: import("../../types").Results["agent"];
}

export function Step3Review({
  plan,
  scenario,
  baselineResult,
  run,
  onApprove,
  onReject,
  onOpenReport,
  busy,
  canApprove = false,
  canReject = false,
  agent,
}: Step3ReviewProps) {
  const [candidatesOpen, setCandidatesOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [mapMaximized, setMapMaximized] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("E");

  // Compute table rows from scenario baseline supply and plan proposed supply
  const planRows = useMemo(() => {
    if (!scenario || !plan) return [];
    return scenario.zones.map((z) => {
      const nowSupply = z.supply;
      const action = plan.actions.find((a) => a.type === "supply" && a.target === z.id);
      const proposedSupply = action ? action.value : nowSupply;
      const diff = proposedSupply - nowSupply;
      return {
        id: z.id,
        name: z.name,
        now: nowSupply,
        proposed: proposedSupply,
        diff,
        hour: action?.at_hour,
      };
    });
  }, [scenario, plan]);

  // Totals from verified plan
  const verifiedTotals = plan?.verified_totals;

  // Compute baseline total unmet demand
  const comparable = Boolean(baselineResult && run && plan && baselineResult.horizon === run.horizon && baselineResult.scenario_version === plan.scenario_version && baselineResult.scenario_id === run.scenario_id);
  const baselineUnmetSum = comparable ? baselineResult!.time_series.reduce((total, step) => total + step.zones.reduce((sum, z) => sum + z.unmet, 0), 0) : null;
  const zoneECriticalDemand = scenario?.zones.find(z => z.id === "E")?.critical_demand;
  const planVersion = plan?.plan_version;
  const scenarioVersion = plan?.scenario_version;
  if (!plan || !verifiedTotals) return <p className="muted">Waiting for the verified response plan.</p>;

  return (
    <div className="step-review-flow">
      {/* Top summary sentence */}
      <div className="step3-summary-banner">
        <ShieldCheck size={20} className="summary-shield-icon" />
        <p className="step3-summary-text">
          The plan proposes {plan.actions.length} actions. Verified essential demand served: {number(verifiedTotals.critical_percent)}%.
        </p>
      </div>

      {/* Plan Table */}
      <div className="step3-plan-card card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">ACTION SPECIFICATION</span>
            <h3 className="section-title">Proposed Supply Adjustments</h3>
            <p className="small muted">
              Exact schedule modifications evaluated by the bounded planning agent.
            </p>
          </div>
          <span className="badge blue">
            Plan v{planVersion} · All units m³/h
          </span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="wizard-data-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>
                  Scheduled supply now <ExplainTooltip text="Current scheduled external supply rate without intervention." />
                </th>
                <th>
                  Proposed <ExplainTooltip text="New inflow rate proposed by plan actions starting at hour 0." />
                </th>
                <th>
                  Change <ExplainTooltip text="Difference in hourly delivery rate." />
                </th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="zone-tag-letter">{row.id}</span>
                    <span className="zone-tag-name">{row.name} ({row.id})</span>
                  </td>
                  <td className="tabular-nums">
                    {number(row.now, 0)} <small className="muted">m³/h</small>
                  </td>
                  <td className="tabular-nums font-semibold">
                    {number(row.proposed, 1)} <small className="muted">m³/h{row.hour !== undefined ? ` at ${row.hour} h` : " (unchanged)"}</small>
                  </td>
                  <td>
                    <span className="change-chip delta-pos tabular-nums">
                      {row.diff >= 0 ? `+${number(row.diff, 0)}` : number(row.diff, 0)} m³/h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {plan.actions.some(a => a.type !== "supply") && <div className="card"><h4>Other exact actions</h4>{plan.actions.filter(a => a.type !== "supply").map((a, i) => <p key={i}>{a.type} · {a.target}: {a.value} at {a.at_hour} h</p>)}</div>}
      {plan.violations.length > 0 && <p className="error">{plan.violations.join(" · ")}</p>}
      <p className="small muted">{plan.mode} · {plan.uncertainty}</p>
      {/* Network Digital Twin in Review Tab with Maximize Option */}
      {scenario && baselineResult && (
        <div className="step3-twin-card card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">TOPOLOGY & CONSTRAINTS</span>
              <h3 className="section-title">Network Digital Twin</h3>
              <p className="small muted">
                Inspect physical topology and flow rates under proposed adjustments.
              </p>
            </div>
            <button
              type="button"
              className="outline-button maximize-map-btn"
              onClick={() => setMapMaximized(true)}
              aria-label="Maximize map"
            >
              <Maximize2 size={14} />
              Maximize map
            </button>
          </div>

          <div className="twin-graph-wrapper">
            <ZoneGraph
              scenario={scenario}
              result={baselineResult}
              selected={selectedZoneId}
              onSelect={setSelectedZoneId}
            />
          </div>
        </div>
      )}

      {/* Maximized Map Modal */}
      {mapMaximized && scenario && baselineResult && (
        <div className="maximized-map-modal-overlay" role="dialog" aria-modal="true" aria-label="Maximized Network Map">
          <div className="maximized-map-modal-content card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">FULL NETWORK TOPOLOGY</span>
                <h3 className="section-title">Network Digital Twin · Maximized View</h3>
                <p className="small muted">
                  Baseline measurements over {baselineResult.horizon} h horizon.
                </p>
              </div>
              <button
                type="button"
                className="outline-button"
                onClick={() => setMapMaximized(false)}
                aria-label="Close maximized map"
              >
                <Minimize2 size={15} />
                Minimize map
              </button>
            </div>
            <div className="maximized-graph-body">
              <ZoneGraph
                scenario={scenario}
                result={baselineResult}
                selected={selectedZoneId}
                onSelect={setSelectedZoneId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Outcome Tiles */}
      <div className="step3-outcome-grid">
        <div className="step3-outcome-tile card">
          <div className="outcome-header-row">
            <span>Essential demand served</span>
            <ExplainTooltip parameter="Critical demand" />
          </div>
          <div className="outcome-main-value text-green tabular-nums">
            {number(verifiedTotals.critical_percent)}%
          </div>
          <p className="outcome-desc muted">
            With plan · share of essential demand delivered over the horizon.
          </p>
        </div>

        <div className="step3-outcome-tile card">
          <div className="outcome-header-row">
            <span>Remaining unmet demand</span>
            <ExplainTooltip parameter="Unmet demand" />
          </div>
          <div className="outcome-main-value tabular-nums">
            {baselineUnmetSum !== null && <><span className="muted">{number(baselineUnmetSum, 1)} m³</span>{" → "}</>}
            <span className="text-green">{number(verifiedTotals.unmet, 1)} m³</span>
          </div>
          <p className="outcome-desc muted">
            {baselineUnmetSum !== null ? `${number(baselineUnmetSum, 1)} m³ without plan to ` : ""}{number(verifiedTotals.unmet, 1)} m³ with plan over the {run?.horizon} h horizon.
          </p>
        </div>

        <div className="step3-outcome-tile card">
          <div className="outcome-header-row">
            <span>Losses over horizon</span>
            <ExplainTooltip parameter="Supply loss" />
          </div>
          <div className="outcome-main-value tabular-nums">
            {number(verifiedTotals.losses, 1)} <small>m³</small>
          </div>
          <p className="outcome-desc muted">
            With plan · external supply and connection losses over the full horizon.
          </p>
        </div>
      </div>

      {/* Essential Demand Notice Line */}
      {zoneECriticalDemand !== undefined && verifiedTotals.critical_percent >= 100 && baselineResult?.totals.critical_percent === 100 && <div className="step3-notice-line card">
        <Droplet size={16} className="text-blue" />
        <p className="small">
          <strong>Essential demand ({number(zoneECriticalDemand, 0)} m³/h in Zone E) is fully served.</strong> The shortfall without the plan is non-essential use.
        </p>
      </div>}

      {/* Accordion 1: Candidate plans & rejected constraints */}
      <div className="accordion-card card">
        <button
          type="button"
          className="accordion-header"
          onClick={() => setCandidatesOpen((prev) => !prev)}
          aria-expanded={candidatesOpen}
        >
          <div className="accordion-title-block">
            <span>{candidatesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
            <h4>Candidate plans, rejected constraints & proposed water points</h4>
            <span className="badge neutral">
              {plan?.alternatives ? `${plan.alternatives.length} alternatives` : "Evaluated options"}
            </span>
          </div>
        </button>

        {candidatesOpen && (
          <div className="accordion-body">
            {plan?.alternatives && plan.alternatives.length > 0 ? (
              <div className="candidates-list">
                {plan.alternatives.map((alt, idx) => (
                  <div key={idx} className="candidate-item">
                    <div className="candidate-header">
                      <strong>Alternative Candidate #{idx + 1}</strong>
                      <span className={`badge ${alt.feasible ? "green" : "red"}`}>
                        {alt.feasible ? "Feasible" : "Constraint violation"}
                      </span>
                    </div>
                    <p className="small muted">
                      {alt.actions.length} actions · {number(alt.totals.unmet)} m³ unmet · {number(alt.totals.losses)} m³ lost
                    </p>
                    {alt.violations && alt.violations.length > 0 && (
                      <p className="small text-red">Violations: {alt.violations.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">No candidate alternatives were returned.</p>
            )}

            {plan?.candidate_sites && plan.candidate_sites.length > 0 && (
              <div className="candidate-sites-block" style={{ marginTop: 12 }}>
                <strong>Evaluated Emergency Water Point Sites:</strong>
                <ul className="sites-bullets">
                  {plan.candidate_sites.map((site, i) => (
                    <li key={i} className="small muted">
                      Zone {site.zone_id} · {number(site.footfall)} synthetic footfall · {site.added_demand} m³/h added demand: {site.feasible ? "passes constraints" : "requires additional supply"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Candidate localization evidence */}
      <div className="accordion-card card">
        <button
          type="button"
          className="accordion-header"
          onClick={() => setEvidenceOpen((prev) => !prev)}
          aria-expanded={evidenceOpen}
        >
          <div className="accordion-title-block">
            <span>{evidenceOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
            <h4>Candidate localization evidence</h4>
            <span className="badge neutral">Deterministic verifier</span>
          </div>
        </button>

        {evidenceOpen && (
          <div className="accordion-body">
            <p className="small muted">
              Hypothesis testing evaluated supply loss, demand surges, and faulty readings using bounded observation history.
            </p>
            {agent?.candidates?.map((candidate, index) => <p key={index} className="small">
              Zone {candidate.zone_id} · {candidate.hypothesis} · fit {candidate.fit_mse === null ? "unavailable" : number(candidate.fit_mse, 4)} · {candidate.compared_samples} samples
            </p>)}
            {plan?.reasons && plan.reasons.length > 0 && (
              <div className="reasons-block" style={{ marginTop: 8 }}>
                <strong>Planner Rationale:</strong>
                <ul className="sites-bullets">
                  {plan.reasons.map((r, i) => (
                    <li key={i} className="small muted">{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Action Bar at Bottom */}
      <div className="step3-sticky-action-bar">
        <div className="action-bar-text">
          <span className="action-bar-label">Your decision is needed:</span>
          <span className="action-bar-sub">
            Approval applies to these exact actions (plan v{planVersion}, scenario v{scenarioVersion}).
          </span>
        </div>
        <div className="action-bar-buttons">
          <button
            type="button"
            className="primary-button approve-btn"
            disabled={busy || !canApprove}
            onClick={onApprove}
          >
            <Check size={16} />
            Approve exact plan
          </button>
          <button
            type="button"
            className="outline-button reject-btn"
            disabled={busy || !canReject}
            onClick={onReject}
          >
            <X size={16} />
            Reject plan
          </button>
          <button
            type="button"
            className="text-link-button report-btn"
            disabled={busy || !run}
            onClick={onOpenReport}
          >
            <FileText size={15} />
            Open evidence report
          </button>
        </div>
      </div>
    </div>
  );
}
