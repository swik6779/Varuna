import { describe, expect, it } from 'vitest';
import { reserveDescription } from './measurements';
import type { Result, Zone } from '../../types';
const zone = { id: 'E', storage: 50, reserve: 80 } as Zone;
const result = (rows: {hour: number; storage: number; unmet: number}[]) => ({
  step_hours: .25,
  time_series: rows.map(row => ({hour: row.hour, zones: [{id: 'E', storage: row.storage, unmet: row.unmet}]})),
}) as Result;
describe('reserve descriptions', () => {
  it('explains an initial shortfall and interpolates exhaustion from step volumes', () => {
    expect(reserveDescription(zone, result([{hour: 5, storage: 5, unmet: 0}, {hour: 5.25, storage: 0, unmet: 1}]))).toBe('Already below reserve at start (50 of 80 m³). Storage runs out at about 5.2 h');
  });
  it('does not claim a reserve was held when it was only restored at the end', () => {
    expect(reserveDescription(zone, result([{hour: .25, storage: 55, unmet: 0}, {hour: 6, storage: 80, unmet: 0}]))).toContain('Reserve restored');
  });
  it('reports reserve held only when every measured step and the start meet reserve', () => {
    expect(reserveDescription({...zone,storage:80}, result([{hour:.25,storage:80,unmet:0},{hour:6,storage:90,unmet:0}]))).toBe('Reserve held');
  });
});
