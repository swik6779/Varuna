import type { Connection, Result, Scenario } from "../types";
import { number } from "../lib/api";
const positions: Record<string, [number, number]> = {
  A: [100, 95],
  B: [290, 95],
  C: [480, 95],
  D: [100, 280],
  E: [290, 280],
  F: [480, 280],
};
export function ZoneGraph({
  scenario,
  result,
  selected,
  onSelect,
  onConnection,
  highlightZoneId,
}: {
  scenario: Scenario;
  result: Result | null;
  selected: string;
  onSelect: (id: string) => void;
  onConnection?: (c: Connection) => void;
  highlightZoneId?: string | null;
}) {
  const last = result?.time_series.at(-1);
  return (
    <svg
      className={`zone-graph ${result ? "network-live" : ""}`}
      viewBox="0 0 580 370"
      role="group"
      aria-label="Abstract six-zone water simulation graph"
      data-testid="simulation-map"
    >
      <defs>
        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--border)" />
        </pattern>
      </defs>
      <rect width="580" height="370" fill="url(#dots)" />
      {scenario.connections.map((c) => {
        const a = positions[c.source],
          b = positions[c.target],
          flow = last?.connections.find((f) => f.connection_id === c.id);
        return (
          <g
            key={c.id}
            className="edge"
            tabIndex={onConnection ? 0 : undefined}
            role={onConnection ? "button" : undefined}
            aria-label={`${onConnection ? "Edit connection" : "Connection"} ${c.id}`}
            onClick={() => onConnection?.(c)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onConnection?.(c);
              }
            }}
          >
            <line
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="transparent"
              strokeWidth="25"
            />
            <line
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              className={
                c.available && c.control !== "closed"
                  ? "edge-line"
                  : "edge-line closed"
              }
              style={{
                strokeWidth:
                  flow && flow.rate > 0
                    ? Math.max(2, Math.min(6, (flow.rate / 15) * 4))
                    : undefined,
              }}
            />
            <rect
              x={(a[0] + b[0]) / 2 - 30}
              y={(a[1] + b[1]) / 2 - 11}
              width="60"
              height="22"
              rx="7"
              fill="var(--card)"
            />
            <text
              x={(a[0] + b[0]) / 2}
              y={(a[1] + b[1]) / 2 + 4}
              textAnchor="middle"
            >
              {flow ? number(flow.rate) + " m³/h" : c.capacity + " cap"}
            </text>
          </g>
        );
      })}
      {scenario.zones.map((z) => {
        const p = positions[z.id],
          state = last?.zones.find((s) => s.id === z.id);
        const ratio = (state?.storage ?? z.storage) / z.storage_capacity;
        const isCritical = state?.condition === "Critical" || Boolean(state && state.storage < z.reserve);
        return (
          <g
            key={z.id}
            transform={`translate(${p[0] - 52},${p[1] - 41})`}
            className={`zone-node ${selected === z.id ? "selected" : ""} ${highlightZoneId === z.id ? "zone-analyzing" : ""} ${isCritical ? "is-critical-zone" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Select zone ${z.id}, ${z.name}`}
            onClick={() => onSelect(z.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(z.id);
              }
            }}
          >
            {isCritical && (
              <rect
                x="-3"
                y="-3"
                width="110"
                height="88"
                rx="18"
                className="critical-pulse-ring"
              />
            )}
            <rect width="104" height="82" rx="15" className="node-bg" />
            <circle
              cx="18"
              cy="19"
              r="4"
              fill={
                isCritical
                  ? "#e35b56"
                  : state?.condition === "Stressed"
                    ? "#eaa64a"
                    : "#20a48b"
              }
            />
            <text x="30" y="24" className="node-name">
              Zone {z.id}
            </text>
            <text x="15" y="47" className="node-storage">
              {number(state?.storage ?? z.storage, 0)}{" "}
              <tspan className="node-unit">m³</tspan>
            </text>
            <rect
              x="15"
              y="61"
              width="74"
              height="5"
              rx="2.5"
              fill="var(--border)"
            />
            <rect
              x="15"
              y="61"
              width={Math.max(0, 74 * ratio)}
              height="5"
              rx="2.5"
              fill="var(--blue)"
            />
          </g>
        );
      })}
    </svg>
  );
}
