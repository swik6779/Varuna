import React, { useState, useRef, useEffect } from "react";
import { ListFilter, Loader2, CheckCircle2, ChevronUp } from "lucide-react";
import type { DisplayedEvent, StreamStatus } from "./types";

interface InvestigationStreamProps {
  events: DisplayedEvent[];
  streamStatus: StreamStatus;
  className?: string;
  onZoneAnalyze?: (zoneId: string | null) => void;
}

export function InvestigationStream({
  events,
  streamStatus,
  className = "",
  onZoneAnalyze,
}: InvestigationStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [visibleDetailCounts, setVisibleDetailCounts] = useState<Record<number, number>>({});
  const [expandedRaw, setExpandedRaw] = useState<Record<number, boolean>>({});

  // Detect current zone being analyzed from the active in-progress event
  useEffect(() => {
    const active = events.find((e) => e.status === "in_progress") || events[0];
    if (active && onZoneAnalyze) {
      const args = active.rawDetail?.arguments as Record<string, unknown> | undefined;
      const zid = (args?.zone_id as string) || (args?.target as string) || (active.rawDetail?.zone_id as string);
      if (zid) {
        onZoneAnalyze(zid);
      } else {
        onZoneAnalyze(null);
      }
    } else if (onZoneAnalyze) {
      onZoneAnalyze(null);
    }
  }, [events, onZoneAnalyze]);

  // Handle auto-scrolling to top (newest on top)
  useEffect(() => {
    if (!userScrolled && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }, [events, userScrolled]);

  // Typewriter effect for detail lines
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const inProgress = events.find((e) => e.status === "in_progress");
    if (!inProgress) return;

    const seq = inProgress.seq;
    const totalLines = inProgress.detailLines.length;
    if (totalLines === 0) return;

    if (prefersReducedMotion) {
      setVisibleDetailCounts((prev) => ({ ...prev, [seq]: totalLines }));
      return;
    }

    const currentCount = visibleDetailCounts[seq] || 0;
    if (currentCount < totalLines) {
      const timer = setTimeout(() => {
        setVisibleDetailCounts((prev) => ({
          ...prev,
          [seq]: (prev[seq] || 0) + 1,
        }));
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [events, visibleDetailCounts]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop > 30) {
      setUserScrolled(true);
    } else {
      setUserScrolled(false);
    }
  };

  const jumpToLatest = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      setUserScrolled(false);
    }
  };

  const toggleRaw = (seq: number) => {
    setExpandedRaw((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  return (
    <div className={`investigation-card ${className}`}>
      <div className="investigation-header">
        <div className="investigation-title-group">
          <span className="investigation-icon" aria-hidden="true">
            <ListFilter size={18} />
          </span>
          <h3 className="investigation-title">Live investigation stream</h3>
        </div>

        <div className="investigation-status-pill">
          {streamStatus === "live" && (
            <span className="pill pill-live">
              <span className="pulse-dot" aria-hidden="true" />
              Streaming…
            </span>
          )}
          {streamStatus === "replaying" && (
            <span className="pill pill-replaying">
              <span className="pulse-dot" aria-hidden="true" />
              Replaying saved run
            </span>
          )}
          {streamStatus === "complete" && (
            <span className="pill pill-complete">
              <CheckCircle2 size={13} aria-hidden="true" />
              Complete
            </span>
          )}
        </div>
      </div>

      <div className="investigation-body-wrapper">
        {userScrolled && (
          <button
            type="button"
            className="jump-to-latest"
            onClick={jumpToLatest}
            aria-label="Jump to latest events"
          >
            <ChevronUp size={14} aria-hidden="true" />
            Jump to latest
          </button>
        )}

        <div
          ref={containerRef}
          className="investigation-list"
          onScroll={handleScroll}
          aria-live="polite"
          aria-label="Investigation events list"
        >
          {events.length === 0 ? (
            <div className="investigation-empty">
              <p className="muted">Awaiting run events…</p>
            </div>
          ) : (
            events.map((event) => {
              const inProgress = event.status === "in_progress";
              const lineCount = visibleDetailCounts[event.seq] ?? (inProgress ? 1 : event.detailLines.length);
              const visibleLines = event.detailLines.slice(0, lineCount);

              return (
                <div
                  key={event.seq}
                  className={`investigation-row ${inProgress ? "row-in-progress" : "row-completed"}`}
                >
                  <div className="row-left">
                    <span className="row-icon-status" aria-hidden="true">
                      {inProgress ? (
                        <Loader2 size={16} className="spin-icon" />
                      ) : (
                        <CheckCircle2 size={16} className="check-icon" />
                      )}
                    </span>

                    <div className="row-content">
                      <div className="row-headline">
                        <span className="row-time">{event.revealTime}</span>
                        <strong className="row-title">{event.title}</strong>
                      </div>
                      <p className="row-subtitle">{event.subtitle}</p>

                      {visibleLines.length > 0 && (
                        <div className="row-detail-block" aria-label="Event details">
                          {visibleLines.map((line, idx) => (
                            <div key={idx} className="row-detail-line">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Technical disclosure toggle */}
                      <button
                        type="button"
                        className="raw-event-toggle"
                        onClick={() => toggleRaw(event.seq)}
                        aria-expanded={Boolean(expandedRaw[event.seq])}
                      >
                        {expandedRaw[event.seq] ? "Hide raw details" : `Raw event #${event.seq}`}
                      </button>

                      {expandedRaw[event.seq] && (
                        <pre className="raw-event-pre">
                          {JSON.stringify(
                            {
                              seq: event.seq,
                              kind: event.kind,
                              message: event.rawMessage,
                              detail: event.rawDetail,
                            },
                            null,
                            2
                          )}
                        </pre>
                      )}
                    </div>
                  </div>

                  <div className="row-right">
                    <span
                      className={`row-status-pill ${
                        inProgress ? "status-in-progress" : "status-completed"
                      }`}
                    >
                      {inProgress ? "In Progress" : "Completed"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="investigation-footer">
        <small className="muted">Observable tools and results; no private reasoning.</small>
      </div>
    </div>
  );
}
