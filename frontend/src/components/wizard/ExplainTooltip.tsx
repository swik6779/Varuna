import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

export const PARAMETER_EXPLANATIONS: Record<string, string> = {
  Demand: "How much water people in this zone want to use each hour.",
  "Demand multiplier": "Heatwave effect. 1.45× means people use 45% more water than usual.",
  "Scheduled supply": "Water the network has planned to send to this zone each hour.",
  "Available upstream supply": "The most water the sources could send if we asked for it.",
  "Throughput capacity": "The biggest flow the pipes into this zone can carry.",
  Storage: "Water sitting in the zone's tanks right now.",
  "Minimum reserve": "The safety buffer we never want to dip below, like a car's fuel reserve light.",
  "Supply loss": "Share of incoming water lost on the way. 0.65 means 65% never arrives.",
  "Critical demand": "Essential water (hospitals, cooling centers, drinking water). It is served first.",
  "Critical demand served": "Share of essential water successfully delivered to vulnerable users.",
  "Essential demand served": "Share of essential water successfully delivered to vulnerable users.",
  "Allocation priority": "1–5 rank for who gets water first when there is not enough.",
  "Minimum service target": "The least share of requested water we aim to deliver. 0.5 means half.",
  "Unmet demand": "Water people asked for but did not receive.",
  "Remaining unmet demand": "Total water volume people requested but could not receive across the horizon.",
  "Losses over horizon": "Physical pipeline leakages and dissipation calculated across all connections.",
  "Time to reserve": "Hours until storage hits the minimum reserve.",
  "Mass balance verified": "The books balance: water in = water out + change in storage.",
  "Fit score": "How well a candidate matches the evidence. It is not a probability.",
  "Connected zones": "Distinct neighborhood zones modeled as interconnected nodes in this network.",
  "Zones below reserve": "Neighborhoods whose tank storage drops below their designated safety margin.",
  "Available cooling centers": "Public municipal relief facilities active, staffed, and stocked with drinking water.",
  "Operating condition": "Network health category: Normal, Stressed, or Critical based on tank reserves.",
  "Delivered demand": "Actual water delivered to meet consumer and essential needs.",
  "Incoming transfers": "Water moved between zones to cover shortfalls.",
};

interface ExplainTooltipProps {
  parameter?: string;
  text?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ExplainTooltip({
  parameter,
  text,
  children,
  className = "",
}: ExplainTooltipProps) {
  const explanation = text || (parameter ? PARAMETER_EXPLANATIONS[parameter] : "");
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && visible) {
        setVisible(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  if (!explanation) {
    return <>{children}</>;
  }

  const labelText = parameter || "parameter explanation";

  return (
    <span
      ref={containerRef}
      className={`explain-tooltip-container ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <button
        type="button"
        className="explain-tooltip-trigger"
        aria-label={`About ${labelText}`}
        aria-expanded={visible}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisible((prev) => !prev);
        }}
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {visible && (
        <span
          role="tooltip"
          className="explain-tooltip-bubble"
          aria-live="polite"
        >
          {explanation}
        </span>
      )}
    </span>
  );
}
