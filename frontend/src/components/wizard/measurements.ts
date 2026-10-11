import type { Result, Zone } from '../../types';

export function reserveDescription(zone: Zone, result: Result): string {
  const last = result.time_series.at(-1)?.zones.find(z => z.id === zone.id);
  const startsBelow = zone.storage < zone.reserve;
  const zeroIndex = result.time_series.findIndex(step => (step.zones.find(z => z.id === zone.id)?.storage ?? Infinity) <= 1e-9);
  const parts: string[] = [];
  if (startsBelow) parts.push(`Already below reserve at start (${zone.storage} of ${zone.reserve} m³)`);
  if (zeroIndex >= 0) {
    const step = result.time_series[zeroIndex];
    const current = step.zones.find(z => z.id === zone.id)!;
    const previous = result.time_series[zeroIndex - 1];
    const storage = previous?.zones.find(z => z.id === zone.id)?.storage ?? zone.storage;
    const deficit = storage + current.unmet;
    const hour = (previous?.hour ?? 0) + (deficit > 0 ? result.step_hours * storage / deficit : 0);
    parts.push(`Storage runs out at about ${hour.toFixed(1)} h`);
  } else if (!startsBelow && result.time_series.every(step => (step.zones.find(z => z.id === zone.id)?.storage ?? 0) >= zone.reserve - 1e-8)) {
    parts.push('Reserve held');
  } else if (last && last.storage >= zone.reserve - 1e-8) {
    parts.push('Reserve restored by the end of the horizon');
  } else if (!startsBelow) parts.push('Ends below reserve');
  return parts.join('. ');
}
