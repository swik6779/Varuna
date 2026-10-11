import React, { useState, useEffect } from "react";
import { X, ChevronDown, ChevronRight, ShieldAlert, Sparkles, RefreshCw, Check } from "lucide-react";
import type { Zone, Scenario } from "../../types";
import { ExplainTooltip } from "./ExplainTooltip";
import { number } from "../../lib/api";

export interface ZoneDrawerProps {
  zone: Zone | null;
  scenario: Scenario | null;
  isOpen: boolean;
  onClose: () => void;
  onChange: (z: Zone) => void;
  onStation: (id: string, open: boolean) => void;
  onPreview: () => void;
  onApply: () => void;
  onReset: () => void;
  busy: boolean;
  isLocked?: boolean;
}

interface FieldConfig {
  key: keyof Zone;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hasSlider?: boolean;
}

const BASIC_FIELDS: FieldConfig[] = [
  {
    key: "demand_multiplier",
    label: "Demand multiplier",
    unit: "×",
    min: 0.5,
    max: 2.5,
    step: 0.05,
    hasSlider: true,
  },
  {
    key: "supply_loss",
    label: "Supply loss",
    unit: "fraction",
    min: 0,
    max: 0.8,
    step: 0.01,
    hasSlider: true,
  },
  {
    key: "supply",
    label: "Scheduled supply",
    unit: "m³/h",
    min: 0,
    max: 500,
    step: 1,
    hasSlider: true,
  },
  {
    key: "storage",
    label: "Storage",
    unit: "m³",
    min: 0,
    max: 5000,
    step: 5,
    hasSlider: true,
  },
];

const ADVANCED_FIELDS: FieldConfig[] = [
  {
    key: "demand",
    label: "Demand",
    unit: "m³/h",
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: "supply_available",
    label: "Available upstream supply",
    unit: "m³/h",
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: "supply_capacity",
    label: "Throughput capacity",
    unit: "m³/h",
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: "storage_capacity",
    label: "Storage capacity",
    unit: "m³",
    min: 0,
    max: 10000,
    step: 10,
  },
  {
    key: "reserve",
    label: "Minimum reserve",
    unit: "m³",
    min: 0,
    max: 5000,
    step: 5,
  },
  {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "critical_demand",
    label: "Critical demand",
    unit: "m³/h",
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: "priority",
    label: "Allocation priority",
    unit: "1–5",
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: "minimum_service",
    label: "Minimum service target",
    unit: "fraction",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    min: -10,
    max: 55,
    step: 0.5,
    hasSlider: true,
  },
];

export function ZoneDrawer({
  zone,
  scenario,
  isOpen,
  onClose,
  onChange,
  onStation,
  onPreview,
  onApply,
  onReset,
  busy,
  isLocked = false,
}: ZoneDrawerProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !zone) return null;

  const stationsInZone = scenario?.stations.filter((s) => s.zone_id === zone.id) || [];

  const renderField = (f: FieldConfig) => {
    const val = (zone[f.key] as number) ?? 0;
    return (
      <div className="drawer-field-row" key={String(f.key)}>
        <div className="drawer-field-header">
          <label htmlFor={`field-${String(f.key)}`} className="drawer-field-label">
            <span>{f.label}</span>
            <small className="field-unit">{f.unit}</small>
          </label>
          <ExplainTooltip parameter={f.label} />
        </div>
        <div className="drawer-field-controls">
          <input
            id={`field-${String(f.key)}`}
            type="number"
            min={f.min}
            max={f.max}
            step={f.step}
            value={val}
            disabled={isLocked || busy}
            className="drawer-number-input tabular-nums"
            onChange={(e) =>
              onChange({
                ...zone,
                [f.key]: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
          {f.hasSlider && (
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={val}
              disabled={isLocked || busy}
              className="drawer-slider-input"
              aria-label={`${f.label} slider`}
              onChange={(e) =>
                onChange({ ...zone, [f.key]: Number(e.target.value) })
              }
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="zone-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Zone ${zone.id}`}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">EDIT ZONE PARAMETERS</span>
            <h3 className="drawer-title">
              Zone {zone.id} · {zone.name}
            </h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-notice-box">
          <p className="small muted">
            <strong>Isolated draft preview.</strong> The applied scenario is unchanged until changes are applied.
          </p>
          <p className="small muted">
            Edits restart from initial conditions. Capacity changes add no water.
          </p>
          {isLocked && (
            <p className="small warning-text" style={{ marginTop: 6 }}>
              <ShieldAlert size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Plan v1 is approved. Edits are locked until you click <strong>Reset demo</strong>.
            </p>
          )}
        </div>

        <div className="drawer-scroll-body">
          {/* Basic Section (Open) */}
          <section className="drawer-section">
            <h4 className="drawer-section-heading">Basic Parameters</h4>
            <div className="drawer-fields-list">
              {BASIC_FIELDS.map(renderField)}
            </div>
          </section>

          {/* Cooling center status note */}
          {stationsInZone.length > 0 && (
            <section className="drawer-section">
              <h4 className="drawer-section-heading">Cooling Centers & Water Points</h4>
              {stationsInZone.map((s) => (
                <div key={s.id} className="drawer-station-row">
                  <div>
                    <strong>{s.name}</strong>
                    <p className="small muted">
                      {s.type === "cooling" ? "Cooling center" : "Emergency water point"} · Capacity {s.capacity}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`station-toggle-btn ${s.open ? "is-open" : "is-closed"}`}
                    disabled={isLocked || busy}
                    onClick={() => onStation(s.id, !s.open)}
                  >
                    {s.open ? "Open" : "Closed"}
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* Advanced Section (Collapsible) */}
          <section className="drawer-section">
            <button
              type="button"
              className="drawer-advanced-toggle"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              aria-expanded={advancedOpen}
            >
              <span>Advanced Parameters ({ADVANCED_FIELDS.length})</span>
              {advancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {advancedOpen && (
              <div className="drawer-fields-list" style={{ marginTop: 12 }}>
                {ADVANCED_FIELDS.map(renderField)}
              </div>
            )}
          </section>
        </div>

        {/* Action Buttons */}
        <div className="drawer-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={isLocked || busy}
            onClick={onPreview}
          >
            <Sparkles size={14} />
            Preview effects
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isLocked || busy}
            onClick={onApply}
          >
            <Check size={14} />
            Apply changes
          </button>
          <button
            type="button"
            className="outline-button"
            disabled={isLocked || busy}
            onClick={onReset}
          >
            <RefreshCw size={14} />
            Reset draft
          </button>
        </div>
      </aside>
    </>
  );
}
