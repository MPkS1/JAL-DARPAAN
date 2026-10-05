import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FloodAlert, Scenario, Village, VillageLive } from '../types';
import { VILLAGES } from '../data/villages';
import { ALERT_THRESHOLDS, initVillageLive, tickVillage } from '../lib/simulation';

const TICK_MS = 4000;
const SHIFT_EVERY = 15; // ticks per simulated hour (1 min per simulated hour — demo timescale)
const ALERT_COOLDOWN_MS = 90_000;

let alertSeq = 100;
function nextAlertId(): string {
  alertSeq += 1;
  return `AL-${alertSeq}`;
}

function seedAlerts(): FloodAlert[] {
  const now = Date.now();
  return [
    {
      id: nextAlertId(), villageId: 'VN-2212', villageName: 'Agastyamuni',
      severity: 'WARNING', status: 'ACTIVE', ts: now - 31 * 60_000,
      why: 'Soil 81% saturated + 22 mm/h rain over Mandakini → WARNING risk (66.2). River at 3.1 m of 4.7 m danger.',
      sources: ['ESP32-UK-008', 'GPM IMERG'], arrivalMin: 96, score: 66.2,
    },
    {
      id: nextAlertId(), villageId: 'VN-2201', villageName: 'Kedarnath',
      severity: 'WATCH', status: 'ACTIVE', ts: now - 17 * 60_000,
      why: 'Antecedent 24 h rain 38 mm + steep slope (30°) → WATCH risk (47.5). Monitoring IMERG burst over upper watershed.',
      sources: ['ESP32-UK-001'], arrivalMin: null, score: 47.5,
    },
    {
      id: nextAlertId(), villageId: 'VN-2214', villageName: 'Tilwara',
      severity: 'WARNING', status: 'ACKNOWLEDGED', ts: now - 2.4 * 3_600_000,
      why: 'River rose 0.9 m in 50 min + soil 84% → WARNING. SDRF QRT acknowledged; bridge watch activated.',
      sources: ['ESP32-UK-009', 'India-WRIS'], arrivalMin: 120, score: 63.8,
      ackBy: 'Ramesh Negi', ackTs: now - 2.1 * 3_600_000,
    },
    {
      id: nextAlertId(), villageId: 'VN-2210', villageName: 'Chandrapuri',
      severity: 'CRITICAL', status: 'RESOLVED', ts: now - 26 * 3_600_000,
      why: 'Madmaheshwar at 4.4 m of 4.6 m danger + 41 mm/h rain → CRITICAL (79.4). Villagers moved to CHC shelter; no casualties.',
      sources: ['ESP32-UK-007', 'India-WRIS', 'GPM IMERG'], arrivalMin: 48, score: 79.4,
      ackBy: 'Col. S. Bisht (Retd.)', ackTs: now - 25.7 * 3_600_000, resolvedTs: now - 22 * 3_600_000,
    },
    {
      id: nextAlertId(), villageId: 'VN-2221', villageName: 'Rudraprayag (Ward 4)',
      severity: 'WATCH', status: 'RESOLVED', ts: now - 5 * 3_600_000,
      why: 'Sangam confluence elevated after upstream release → WATCH (44.1). Receded; ward patrol stood down.',
      sources: ['ESP32-UK-012', 'CWC AFF'], arrivalMin: null, score: 44.1,
      ackBy: 'Col. S. Bisht (Retd.)', ackTs: now - 4.6 * 3_600_000, resolvedTs: now - 3.8 * 3_600_000,
    },
  ];
}

interface LiveCtx {
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  tick: number;
  villagesLive: Record<string, VillageLive>;
  alerts: FloodAlert[];
  lastRefresh: number;
  ackAlert: (id: string, byName: string) => void;
  resolveAlert: (id: string) => void;
  issueEvacuation: (villageId: string, byName: string) => FloodAlert;
  villageById: (id: string) => Village | undefined;
}

const Ctx = createContext<LiveCtx | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenarioState] = useState<Scenario>('monsoon');
  const [tick, setTick] = useState(0);
  const [villagesLive, setVillagesLive] = useState<Record<string, VillageLive>>(() => {
    const map: Record<string, VillageLive> = {};
    for (const v of VILLAGES) map[v.id] = initVillageLive(v, 'monsoon');
    return map;
  });
  const [alerts, setAlerts] = useState<FloodAlert[]>(seedAlerts);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const cooldowns = useRef<Record<string, number>>({});
  const scenarioRef = useRef<Scenario>('monsoon');
  scenarioRef.current = scenario;

  const villageById = useCallback((id: string) => VILLAGES.find((v) => v.id === id), []);

  // ---- Alert engine -------------------------------------------------------
  const runAlertEngine = useCallback(
    (next: Record<string, VillageLive>, now: number) => {
      setAlerts((prev) => {
        let changed = false;
        const out = [...prev];

        // Fire new alerts
        for (const v of VILLAGES) {
          const live = next[v.id];
          if (!live) continue;
          let severity: FloodAlert['severity'] | null = null;
          if (live.score >= ALERT_THRESHOLDS.CRITICAL && live.sourcesAgree) severity = 'CRITICAL';
          else if (live.score >= ALERT_THRESHOLDS.WARNING && live.sourcesAgree) severity = 'WARNING';
          else if (live.score >= ALERT_THRESHOLDS.WATCH) severity = 'WATCH';
          if (!severity) continue;

          const existing = out.find(
            (a) => a.villageId === v.id && a.status !== 'RESOLVED' && !a.manual,
          );
          const rank = { WATCH: 0, WARNING: 1, CRITICAL: 2 } as const;
          if (existing && rank[existing.severity] >= rank[severity]) continue;
          if ((cooldowns.current[v.id] ?? 0) > now) continue;

          const top = live.contributions
            .filter((c) => c.value > 0.5)
            .slice(0, 2)
            .map((c) => `${c.label} ${Math.round(c.value)} pts`)
            .join(' + ');
          const why =
            `Score ${live.score.toFixed(1)} (${severity}) — driven by ${top || 'fused inputs'}. ` +
            `Rain ${live.rainMmHr.toFixed(1)} mm/h · soil ${Math.round(live.soilPct)}% · river ${live.waterLevelM.toFixed(1)} m of ${v.dangerLevelM} m danger.`;
          const alert: FloodAlert = {
            id: nextAlertId(),
            villageId: v.id,
            villageName: v.name,
            severity,
            status: 'ACTIVE',
            ts: now,
            why,
            sources: live.sources,
            arrivalMin: live.arrivalMin,
            score: live.score,
          };
          const idx = existing ? out.indexOf(existing) : -1;
          if (idx >= 0) out.splice(idx, 1);
          out.unshift(alert);
          cooldowns.current[v.id] = now + ALERT_COOLDOWN_MS;
          changed = true;
        }

        // Auto-resolve when risk recedes below WATCH
        for (let i = out.length - 1; i >= 0; i--) {
          const a = out[i];
          if (a.manual || a.status === 'RESOLVED') continue;
          const live = next[a.villageId];
          if (live && live.score < 42) {
            out[i] = { ...a, status: 'RESOLVED', resolvedTs: now };
            changed = true;
          }
        }
        return changed ? out.slice(0, 60) : prev;
      });
    },
    [],
  );

  // ---- Tick loop ----------------------------------------------------------
  useEffect(() => {
    const h = window.setInterval(() => {
      setTick((t) => {
        const n = t + 1;
        const shift = n % SHIFT_EVERY === 0;
        const now = Date.now();
        setVillagesLive((prev) => {
          const next: Record<string, VillageLive> = {};
          for (const v of VILLAGES) {
            next[v.id] = tickVillage(v, prev[v.id], scenarioRef.current, shift);
          }
          runAlertEngine(next, now);
          return next;
        });
        setLastRefresh(now);
        return n;
      });
    }, TICK_MS);
    return () => window.clearInterval(h);
  }, [runAlertEngine]);

  const setScenario = useCallback((s: Scenario) => setScenarioState(s), []);

  const ackAlert = useCallback((id: string, byName: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED', ackBy: byName, ackTs: Date.now() } : a)),
    );
  }, []);

  const resolveAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'RESOLVED', resolvedTs: Date.now() } : a)),
    );
  }, []);

  const issueEvacuation = useCallback(
    (villageId: string, byName: string) => {
      const v = VILLAGES.find((x) => x.id === villageId);
      const live = villagesLive[villageId];
      const alert: FloodAlert = {
        id: nextAlertId(),
        villageId,
        villageName: v?.name ?? villageId,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        ts: Date.now(),
        why:
          `Evacuation advisory issued manually by ${byName}. ` +
          (live
            ? `Live inputs: rain ${live.rainMmHr.toFixed(1)} mm/h · soil ${Math.round(live.soilPct)}% · river ${live.waterLevelM.toFixed(1)} m. SMS/Telegram dispatched in Hindi + Garhwali.`
            : 'SMS/Telegram dispatched in Hindi + Garhwali.'),
        sources: live?.sources ?? [],
        arrivalMin: live?.arrivalMin ?? null,
        score: live?.score ?? 0,
        manual: true,
      };
      setAlerts((prev) => [alert, ...prev]);
      return alert;
    },
    [villagesLive],
  );

  const value = useMemo(
    () => ({
      scenario, setScenario, tick, villagesLive, alerts, lastRefresh,
      ackAlert, resolveAlert, issueEvacuation, villageById,
    }),
    [scenario, setScenario, tick, villagesLive, alerts, lastRefresh, ackAlert, resolveAlert, issueEvacuation, villageById],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLive must be used inside LiveProvider');
  return ctx;
}
