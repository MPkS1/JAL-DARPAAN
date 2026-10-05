export type Role = 'national' | 'state' | 'district' | 'field' | 'village';

export type Band = 'SAFE' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface User {
  email: string;
  password: string;
  name: string;
  role: Role;
  org: string;
  posting: string;
  scopeState?: string;
  scopeDistrict?: string;
  scopeVillageId?: string;
}

export interface VillageEvent {
  year: number;
  label: string;
}

export type Watershed = 'Mandakini' | 'Madmaheshwar' | 'Kali Ganga' | 'Alaknanda';

export interface Village {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  elevationM: number;
  slopeDeg: number;
  population: number;
  households: number;
  riverName: string;
  riverDistKm: number;
  watershed: Watershed;
  dangerLevelM: number;
  nodeId: string | null;
  shelter: string;
  route: string;
  events: VillageEvent[];
}

export interface Contribution {
  label: string;
  value: number; // points of the 100-point score
  color: string;
}

export interface HourPoint {
  hour: string;
  rain: number;
  soil: number;
  water: number;
}

export interface VillageLive {
  id: string;
  rainMmHr: number;
  rain24: number;
  soilPct: number;
  waterLevelM: number;
  tempC: number;
  humidityPct: number;
  windKmph: number;
  pressureHpa: number;
  score: number;
  band: Band;
  contributions: Contribution[];
  sourcesAgree: boolean;
  sources: string[];
  arrivalMin: number | null;
  history: HourPoint[];
  nowcast: number[];
  batteryPct: number | null;
  signalDbm: number | null;
  nodeStatus: 'online' | 'offline' | 'low-battery' | 'no-node';
  updatedAt: number;
}

export type AlertSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface FloodAlert {
  id: string;
  villageId: string;
  villageName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  ts: number;
  why: string;
  sources: string[];
  arrivalMin: number | null;
  score: number;
  manual?: boolean;
  ackBy?: string;
  ackTs?: number;
  resolvedTs?: number;
}

export type Scenario = 'normal' | 'monsoon' | 'cloudburst';

export type NodeStatus = 'online' | 'offline' | 'low-battery' | 'no-node';

export interface SourceStatus {
  id: string;
  name: string;
  provider: string;
  kind: 'Station' | 'Satellite' | 'Terrain' | 'Inventory' | 'IoT' | 'Fallback';
  status: 'operational' | 'degraded' | 'fallback' | 'offline';
  latencyMs: number;
  lastSync: string;
  detail: string;
}
