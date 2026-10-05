import type { Band, Contribution, Village } from '../types';
import { clamp, clamp01 } from './format';

/** Fused risk-model weights (production LightGBM feature ranking, simplified & transparent). */
export const WEIGHTS = {
  rain: 0.34,
  soil: 0.27,
  river: 0.17,
  slope: 0.16,
  history: 0.06,
} as const;

export const BANDS: Record<Band, {
  label: string; hex: string; text: string; chip: string; border: string; bg: string; glow: string;
}> = {
  SAFE: {
    label: 'SAFE', hex: '#22c55e',
    text: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    border: 'border-emerald-400/40', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_30px_-8px_rgba(34,197,94,0.5)]',
  },
  WATCH: {
    label: 'WATCH', hex: '#facc15',
    text: 'text-yellow-300', chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/40',
    border: 'border-yellow-400/40', bg: 'bg-yellow-500/10', glow: 'shadow-[0_0_30px_-8px_rgba(250,204,21,0.5)]',
  },
  WARNING: {
    label: 'WARNING', hex: '#f97316',
    text: 'text-orange-300', chip: 'bg-orange-500/15 text-orange-300 border-orange-400/40',
    border: 'border-orange-400/40', bg: 'bg-orange-500/10', glow: 'shadow-[0_0_30px_-8px_rgba(249,115,22,0.6)]',
  },
  CRITICAL: {
    label: 'CRITICAL', hex: '#ef4444',
    text: 'text-red-300', chip: 'bg-red-500/15 text-red-300 border-red-400/40',
    border: 'border-red-400/40', bg: 'bg-red-500/10', glow: 'shadow-[0_0_30px_-8px_rgba(239,68,68,0.65)]',
  },
};

export function bandOf(score: number): Band {
  if (score >= 75) return 'CRITICAL';
  if (score >= 60) return 'WARNING';
  if (score >= 40) return 'WATCH';
  return 'SAFE';
}

export interface RiskInput {
  rainMmHr: number;
  soilPct: number;
  waterLevelM: number;
}

export interface RiskResult {
  score: number;
  band: Band;
  contributions: Contribution[];
}

/** Transparent weighted fusion — mirrors the production model's SHAP ordering. */
export function computeRisk(v: Village, live: RiskInput): RiskResult {
  const rainNorm = clamp01(live.rainMmHr / 60);
  const soilNorm = clamp01(live.soilPct / 100);
  const riverNorm = clamp01(live.waterLevelM / v.dangerLevelM);
  const slopeNorm = clamp01(v.slopeDeg / 60);
  const histNorm = clamp01(v.events.length / 3);

  const score = 100 * (
    WEIGHTS.rain * rainNorm +
    WEIGHTS.soil * soilNorm +
    WEIGHTS.river * riverNorm +
    WEIGHTS.slope * slopeNorm +
    WEIGHTS.history * histNorm
  );

  const contributions: Contribution[] = [
    { label: 'Rainfall 1 h', value: WEIGHTS.rain * rainNorm * 100, color: '#22d3ee' },
    { label: 'Soil saturation', value: WEIGHTS.soil * soilNorm * 100, color: '#a78bfa' },
    { label: 'River level', value: WEIGHTS.river * riverNorm * 100, color: '#38bdf8' },
    { label: 'Slope susceptibility', value: WEIGHTS.slope * slopeNorm * 100, color: '#fb923c' },
    { label: 'Event history', value: WEIGHTS.history * histNorm * 100, color: '#94a3b8' },
  ].sort((a, b) => b.value - a.value);

  const s = Math.round(clamp(score, 0, 100) * 10) / 10;
  return { score: s, band: bandOf(s), contributions };
}

/** Estimated minutes until local flash-flood arrival (only meaningful ≥ WARNING). */
export function arrivalEstimate(live: RiskInput & { band: Band }, dangerLevelM: number): number | null {
  if (live.band !== 'WARNING' && live.band !== 'CRITICAL') return null;
  const t = 200
    - live.rainMmHr * 1.5
    - Math.max(0, live.soilPct - 60) * 1.5
    - clamp01(live.waterLevelM / dangerLevelM) * 60;
  return Math.round(clamp(t, 12, 240));
}
