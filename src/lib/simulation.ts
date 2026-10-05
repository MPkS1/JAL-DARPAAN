import type { HourPoint, Scenario, Village, VillageLive } from '../types';
import { arrivalEstimate, computeRisk } from './risk';
import { clamp, clamp01, pad2 } from './format';
import { hashSeed, mulberry32, noise } from './rng';

/** Alert trigger thresholds (slightly above band edges to avoid edge-flicker). */
export const ALERT_THRESHOLDS = { WATCH: 45, WARNING: 62, CRITICAL: 78 } as const;

/** Seeded hardware failures so the health-monitoring story is visible in every demo. */
const NODE_FAILURES: Record<string, { status: 'offline' | 'low-battery'; battery: number; signal: number }> = {
  'ESP32-UK-010': { status: 'offline', battery: 67, signal: -93 },   // Kyark — monsoon comms dropout
  'ESP32-UK-005': { status: 'low-battery', battery: 31, signal: -78 }, // Kalimath — solar panel underpowered
};

/** Terrain + hydrology susceptibility index (0..1) — static per village, from DEM features. */
export function susceptibility(v: Village): number {
  const slopePart = clamp01(v.slopeDeg / 60) * 0.4;
  const riverPart = clamp01((3 - v.riverDistKm) / 3) * 0.25;
  const elevPart = clamp01(v.elevationM / 3600) * 0.35;
  return clamp01(slopePart + riverPart + elevPart);
}

export interface Targets {
  rainBase: number;
  soilBase: number;
  waterTarget: number;
}

/** Per-village scenario targets — the "weather nowcast truth" the telemetry walks toward. */
export function scenarioTargets(v: Village, scenario: Scenario): Targets {
  const sus = susceptibility(v);
  const cloudburstZone = v.lat >= 30.4; // upper Mandakini: Kedarnath → Chandrapuri corridor
  switch (scenario) {
    case 'normal':
      return {
        rainBase: 0.4 + sus * 2,
        soilBase: 42 + sus * 12,
        waterTarget: v.dangerLevelM * 0.42,
      };
    case 'monsoon':
      return {
        rainBase: 4 + sus * 20,
        soilBase: 55 + sus * 26,
        waterTarget: v.dangerLevelM * 0.66,
      };
    case 'cloudburst':
      return {
        rainBase: cloudburstZone ? 58 + sus * 34 : 16 + sus * 20,
        soilBase: Math.min(97, cloudburstZone ? 86 + sus * 10 : 70 + sus * 14),
        waterTarget: v.dangerLevelM * (cloudburstZone ? 0.94 : 0.78),
      };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function hourLabelOf(hoursAgo: number): string {
  const nowH = new Date().getHours();
  return `${pad2((nowH - hoursAgo + 48) % 24)}:00`;
}

/** 24 hourly points ending "now" — replay-style monsoon pattern with a burst 4–9 h ago. */
function makeHistory(v: Village, t: Targets, sus: number): HourPoint[] {
  const rand = mulberry32(hashSeed(v.id + 'hist'));
  const pts: HourPoint[] = [];
  const burstAmp = 6 + sus * 26;
  for (let i = 0; i < 24; i++) {
    const hoursAgo = 23 - i;
    let rain = t.rainBase * 0.35;
    if (hoursAgo <= 2) rain = t.rainBase * (0.72 + 0.14 * (2 - hoursAgo));
    if (hoursAgo >= 4 && hoursAgo <= 9) {
      rain += burstAmp * Math.sin(((hoursAgo - 4) / 5) * Math.PI);
    }
    rain = Math.max(0, rain + noise(rand, 1.1));
    const soil = clamp(t.soilBase * (0.6 + 0.4 * (i / 23)) + noise(rand, 2), 25, 98);
    const water = clamp(t.waterTarget * (0.55 + 0.45 * (i / 23)) + noise(rand, 0.07), 0.3, 6.5);
    pts.push({ hour: hourLabelOf(hoursAgo), rain: round1(rain), soil: round1(soil), water: round2(water) });
  }
  return pts;
}

function nowcastFor(rain: number, scenario: Scenario): number[] {
  const r = Math.max(0, rain);
  switch (scenario) {
    case 'normal': return [r * 0.5, r * 0.3, r * 0.15, r * 0.05, 0, 0];
    case 'monsoon': return [r * 1.05, r * 1.1, r * 0.95, r * 0.8, r * 0.6, r * 0.4];
    case 'cloudburst': return [r * 1.2, r * 1.35, r * 1.1, r * 0.75, r * 0.45, r * 0.25];
  }
}

function nodeStateFor(v: Village, rand: () => number): {
  nodeStatus: VillageLive['nodeStatus']; batteryPct: number | null; signalDbm: number | null;
} {
  if (!v.nodeId) return { nodeStatus: 'no-node', batteryPct: null, signalDbm: null };
  const fail = NODE_FAILURES[v.nodeId];
  if (fail) {
    return { nodeStatus: fail.status, batteryPct: fail.battery, signalDbm: fail.signal };
  }
  return {
    nodeStatus: 'online',
    batteryPct: Math.round(58 + rand() * 40),
    signalDbm: Math.round(-55 - rand() * 30),
  };
}

function climateFor(v: Village, soilPct: number, rainMmHr: number, rand: () => () => number): {
  tempC: number; humidityPct: number; windKmph: number; pressureHpa: number;
} {
  return {
    tempC: round1(24 - (v.elevationM - 300) * 0.0065 + noise(rand(), 0.4)),
    humidityPct: round1(clamp(55 + soilPct * 0.4 + rainMmHr * 0.3, 40, 98)),
    windKmph: round1(clamp(4 + susceptibility(v) * 10 + noise(rand(), 2), 1, 40)),
    pressureHpa: Math.round(1013 - v.elevationM * 0.101 + noise(rand(), 0.8)),
  };
}

function sourcesFor(v: Village, rain: number, soil: number, water: number): {
  sourcesAgree: boolean; sources: string[];
} {
  const sources: string[] = [];
  if (v.nodeId) {
    const fail = NODE_FAILURES[v.nodeId];
    if (!fail || fail.status !== 'offline') sources.push(v.nodeId);
  }
  sources.push(v.nodeId ? 'GPM IMERG' : 'IMD AWS Rudraprayag');
  if (soil >= 80) sources.push('SMAP L4');
  if (!v.nodeId && rain >= 8) sources.push('GPM IMERG');

  // Deduplicate while keeping order
  const uniq = Array.from(new Set(sources));
  const riverRatio = water / v.dangerLevelM;
  const agree = rain >= 10 && (soil >= 80 || riverRatio >= 0.72);
  return { sourcesAgree: agree && uniq.length >= 2, sources: uniq.slice(0, 3) };
}

export function initVillageLive(v: Village, scenario: Scenario): VillageLive {
  const rand = mulberry32(hashSeed(v.id));
  const sus = susceptibility(v);
  const t = scenarioTargets(v, scenario);
  const history = makeHistory(v, t, sus);
  const last = history[history.length - 1];
  const nowcast = nowcastFor(last.rain, scenario);
  const node = nodeStateFor(v, rand);
  const climate = climateFor(v, last.soil, last.rain, () => rand);
  const risk = computeRisk(v, { rainMmHr: last.rain, soilPct: last.soil, waterLevelM: last.water });
  const arrival = arrivalEstimate(
    { rainMmHr: last.rain, soilPct: last.soil, waterLevelM: last.water, band: risk.band },
    v.dangerLevelM,
  );
  const src = sourcesFor(v, last.rain, last.soil, last.water);

  return {
    id: v.id,
    rainMmHr: round1(last.rain),
    rain24: round1(history.reduce((s, p) => s + p.rain, 0)),
    soilPct: round1(last.soil),
    waterLevelM: last.water,
    tempC: climate.tempC,
    humidityPct: climate.humidityPct,
    windKmph: climate.windKmph,
    pressureHpa: climate.pressureHpa,
    score: risk.score,
    band: risk.band,
    contributions: risk.contributions,
    sourcesAgree: src.sourcesAgree,
    sources: src.sources,
    arrivalMin: arrival,
    history,
    nowcast,
    batteryPct: node.batteryPct,
    signalDbm: node.signalDbm,
    nodeStatus: node.nodeStatus,
    updatedAt: Date.now(),
  };
}

/** Advance one village's telemetry one tick (≈4 s). `shift` rolls the hourly window forward. */
export function tickVillage(v: Village, live: VillageLive, scenario: Scenario, shift: boolean): VillageLive {
  const t = scenarioTargets(v, scenario);
  const rand = Math.random;

  let rain = live.rainMmHr + (t.rainBase - live.rainMmHr) * 0.16 + noise(rand, 0.4 + live.rainMmHr * 0.06) - live.rainMmHr * 0.004;
  rain = Math.max(0, rain);
  let soil = clamp(live.soilPct + (t.soilBase - live.soilPct) * 0.05 + noise(rand, 0.35), 25, 98.5);
  let water = clamp(live.waterLevelM + (t.waterTarget - live.waterLevelM) * 0.09 + rain * 0.004 + noise(rand, 0.018), 0.3, 6.5);

  const history = live.history.map((p) => ({ ...p }));
  if (shift) {
    history.shift();
    history.push({ hour: hourLabelOf(0), rain: round1(rain), soil: round1(soil), water: round2(water) });
  } else {
    const lastPt = history[history.length - 1];
    lastPt.rain = round1(rain);
    lastPt.soil = round1(soil);
    lastPt.water = round2(water);
  }

  const risk = computeRisk(v, { rainMmHr: rain, soilPct: soil, waterLevelM: water });
  const climate = climateFor(v, soil, rain, () => rand);
  const node = { ...live };
  let batteryPct = live.batteryPct;
  let signalDbm = live.signalDbm;
  if (live.nodeStatus === 'low-battery' && batteryPct !== null) batteryPct = Math.max(5, batteryPct - 0.015);
  if (live.nodeStatus === 'online' && signalDbm !== null) signalDbm = Math.round(clamp(signalDbm + noise(rand, 2), -90, -50));
  void node;

  const src = sourcesFor(v, rain, soil, water);
  const next: VillageLive = {
    ...live,
    rainMmHr: round1(rain),
    rain24: round1(history.reduce((s, p) => s + p.rain, 0)),
    soilPct: round1(soil),
    waterLevelM: round2(water),
    tempC: climate.tempC,
    humidityPct: climate.humidityPct,
    windKmph: climate.windKmph,
    pressureHpa: climate.pressureHpa,
    score: risk.score,
    band: risk.band,
    contributions: risk.contributions,
    sourcesAgree: src.sourcesAgree,
    sources: src.sources,
    arrivalMin: arrivalEstimate({ rainMmHr: rain, soilPct: soil, waterLevelM: water, band: risk.band }, v.dangerLevelM),
    history,
    nowcast: nowcastFor(rain, scenario),
    batteryPct: batteryPct !== null ? round1(batteryPct) : null,
    signalDbm,
    nodeStatus: live.nodeStatus,
    updatedAt: Date.now(),
  };
  return next;
}

/** Exact ESP32 MQTT payload contract (production format — simulator uses the identical JSON). */
export function makeMqttPacket(v: Village, live: VillageLive, now = Date.now()) {
  const ist = new Date(now + (5.5 * 60 + new Date().getTimezoneOffset()) * 60000);
  return {
    node_id: v.nodeId ?? 'ESP32-UK-PENDING',
    village_code: v.code,
    timestamp: `${ist.toISOString().slice(0, 19)}+05:30`,
    rainfall_mm_hr: live.rainMmHr,
    soil_moisture_pct: live.soilPct,
    water_level_m: live.waterLevelM,
    battery_pct: live.batteryPct ?? 0,
    signal_dbm: live.signalDbm ?? 0,
  };
}

export const SCENARIO_META: Record<Scenario, { label: string; desc: string; chip: string }> = {
  normal: {
    label: 'Clear skies', desc: 'Dry-weather baseline · sensors nominal',
    chip: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
  },
  monsoon: {
    label: 'Monsoon surge', desc: 'Sustained valley rainfall · WATCH/WATCH-WARNING mix',
    chip: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
  },
  cloudburst: {
    label: 'Cloudburst — Kedarnath-style', desc: 'Upper-watershed 60–90 mm/h burst · CRITICAL cascade',
    chip: 'border-red-400/40 bg-red-500/15 text-red-300',
  },
};
