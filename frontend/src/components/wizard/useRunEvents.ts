import { useEffect, useRef, useState, useCallback } from "react";

import type { RunEvent } from "../../types";
import type { DisplayedEvent, StreamStatus } from "./types";

function extractDetailLines(event: RunEvent): string[] {
  const lines: string[] = [];
  const detail = event.detail;
  if (!detail || typeof detail !== "object") return lines;

  if (detail.tool && typeof detail.tool === "string") {
    lines.push(`› Tool: ${detail.tool}`);
  }

  if (detail.arguments && typeof detail.arguments === "object") {
    const args = detail.arguments as Record<string, unknown>;
    const entries = Object.entries(args);
    for (const [key, val] of entries) {
      if (val === null || val === undefined || val === "") continue;
      const cleanKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (typeof val === "object") {
        if (Array.isArray(val) && val.length === 0) continue;
        lines.push(`› ${cleanKey}: ${JSON.stringify(val)}`);
      } else {
        lines.push(`› ${cleanKey}: ${val}`);
      }
    }
  }

  if (detail.next_node) {
    lines.push(`› Next step: ${detail.next_node}`);
  }

  if (Array.isArray(detail.violations) && detail.violations.length > 0) {
    for (const v of detail.violations) {
      lines.push(`› Violation: ${v}`);
    }
  }

  for (const [key, value] of Object.entries(detail)) {
    if (["tool", "arguments", "next_node", "violations"].includes(key) || value == null) continue;
    if (["string", "number", "boolean"].includes(typeof value))
      lines.push(`› ${key.replaceAll("_", " ")}: ${value}`);
    else if (Array.isArray(value) && value.length) lines.push(`› ${key.replaceAll("_", " ")}: ${value.length} entries`);
  }
  return lines;
}

function formatEventTitle(event: RunEvent) {
  const tool = (event.detail?.tool as string) || "";
  const msg = event.message || "";

  if (event.kind === "decision") {
    return {
      title: "Operator approved plan v1",
      subtitle: "Your decision is recorded",
    };
  }
  if (event.kind === "outcome") {
    return {
      title: "Simulated the approved plan",
      subtitle: "Mass balance and critical supply verified",
    };
  }
  if (event.kind === "report") {
    return {
      title: "Evidence report saved",
      subtitle: "You can reopen it from this run",
    };
  }
  if (tool === "evaluate_water_point_site" || msg.includes("evaluate_water_point_site")) {
    return {
      title: "Checked candidate water-point sites",
      subtitle: "Where could people get drinking water?",
    };
  }
  if (tool === "evaluate_recovery_sequence" || msg.includes("evaluate_recovery_sequence")) {
    return {
      title: "Tested the recovery sequence",
      subtitle: "Which order restores supply fastest?",
    };
  }
  if (event.kind === "agent_step" || msg.includes("bounded plan step")) {
    return {
      title: "Drafted a response plan",
      subtitle: "Within the agent's limits",
    };
  }
  if (event.kind === "verification" || msg.includes("critical-service verification")) {
    return {
      title: "Verified essential supply is protected",
      subtitle: "Critical demand checked in the real scenario",
    };
  }
  if (event.kind === "approval" || msg.includes("operator approval")) {
    return {
      title: "Plan ready for your approval",
      subtitle: "Nothing changes until you decide",
    };
  }
  if (event.kind === "simulation" || msg.includes("Baseline computed")) {
    return {
      title: "Baseline simulation complete",
      subtitle: "Water balance and baseline demands calculated",
    };
  }
  if (event.kind === "replan") {
    return {
      title: "Selected feasible alternative plan",
      subtitle: "Initial proposal adjusted to satisfy constraints",
    };
  }

  const raw = tool || event.kind || msg;
  const humanized = raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: humanized,
    subtitle: msg || "Observable agent investigation event",
  };
}

// Presentation-only replay: App owns the single useRun event transport.
export function useRunEvents(runId: string | null, runStatus = "", events: RunEvent[] = [], enabled = true) {
  const [displayedEvents, setDisplayedEvents] = useState<DisplayedEvent[]>([]);
  const [revealed, setRevealed] = useState(0);
  const resetStream = useCallback(() => { setDisplayedEvents([]); setRevealed(0); }, []);
  useEffect(resetStream, [runId, resetStream]);
  const investigation = events.filter(e => e.run_id === runId && !["decision", "outcome", "report"].includes(e.kind));
  const next = investigation[revealed];
  useEffect(() => {
    if (!enabled || !next) return;
    const timer = setTimeout(() => {
      const { title, subtitle } = formatEventTitle(next);
      setDisplayedEvents(prev => [{ seq: next.seq, kind: next.kind, rawMessage: next.message,
        title, subtitle, revealTime: new Date(next.timestamp * 1000).toLocaleTimeString(),
        status: "completed" as const, detailLines: extractDetailLines(next), rawDetail: next.detail,
        runId: next.run_id }, ...prev]);
      setRevealed(n => n + 1);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400);
    return () => clearTimeout(timer);
  }, [next?.seq, enabled, runId, revealed]);
  const terminal = ["awaiting_approval", "completed", "rejected", "infeasible"].includes(runStatus);
  const isComplete = terminal && investigation.length > 0 && revealed >= investigation.length;
  const streamStatus: StreamStatus = isComplete ? "complete" : terminal ? "replaying" : "live";
  return { displayedEvents, streamStatus, isComplete, resetStream,
    postApprovalEvents: events.filter(e => ["decision", "outcome", "report"].includes(e.kind)) };
}
