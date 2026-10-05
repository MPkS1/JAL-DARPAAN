import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowLeft, BatteryLow, BellRing, CheckCheck, CloudRainWind, Droplets,
  Gauge, Lock, MountainSnow, Phone, RadioTower, Siren, Signal, Thermometer, Waves, WifiOff,
} from 'lucide-react';
import type { VillageLive } from '../types';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { VILLAGES } from '../data/villages';
import { BANDS } from '../lib/risk';
import { fmtDuration, timeAgo } from '../lib/format';
import RiskRing from '../components/RiskRing';
import WhyBox from '../components/WhyBox';

const AXIS = { stroke: '#94a3b8', fontSize: 10.5 };
const GRID = 'rgba(148,163,184,0.15)';

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-[11.5px] shadow-sm">
      <div className="mb-1 font-semibold text-text-700">{label}</div>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-text-800">{p.name}</span>
            <span className="ml-auto font-mono text-text-900 tabular">{Number(p.value).toFixed(1)}</span>
          </div>
        ))}
    </div>
  );
}

export default function VillageDetail() {
  const { id } = useParams();
  const { villagesLive, alerts, ackAlert, issueEvacuation } = useLive();
  const { user, can } = useAuth();

  const v = VILLAGES.find((x) => x.id === id);
  const live: VillageLive | undefined = v ? villagesLive[v.id] : undefined;

  const rainData = useMemo(() => {
    if (!live) return [];
    const hist = live.history.map((p) => ({ hour: p.hour, rain: p.rain, fc: null as number | null }));
    const lastIdx = hist.length - 1;
    hist[lastIdx].fc = hist[lastIdx].rain;
    const fc = live.nowcast.map((r, i) => ({ hour: `+${i + 1}h`, rain: null as number | null, fc: r }));
    return [...hist, ...fc];
  }, [live]);

  if (!v || !live) {
    return (
      <div className="panel p-8 text-center">
        <AlertTriangle size={26} className="mx-auto text-amber-600" />
        <h2 className="mt-2 font-display text-[18px] font-bold">Village not found</h2>
        <p className="mt-1 text-[12.5px] text-text-800">No village with ID “{id}” exists in the registry.</p>
        <Link to="/villages" className="btn-ghost mt-4 !text-[12.5px]"><ArrowLeft size={14} /> Back to all villages</Link>
      </div>
    );
  }

  const ownVillageId = user?.role === 'village' ? user.scopeVillageId ?? null : null;
  if (ownVillageId && v.id !== ownVillageId) {
    return (
      <div className="panel p-8 text-center">
        <Lock size={26} className="mx-auto text-amber-600" />
        <h2 className="mt-2 font-display text-[18px] font-bold">Restricted to your panchayat</h2>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-text-800">
          As <span className="font-semibold text-text-900">Village Pradhan</span>, your access covers your own village only
          (registry ID {ownVillageId}). District/state officers can view every village — contact your DDMA officer for escalation.
        </p>
        <Link to="/villages" className="btn-ghost mt-4 !text-[12.5px]"><ArrowLeft size={14} /> Back to all villages</Link>
      </div>
    );
  }

  const meta = BANDS[live.band];
  const villageAlerts = alerts.filter((a) => a.villageId === v.id);
  const riverPct = (live.waterLevelM / v.dangerLevelM) * 100;

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <Link to="/villages" className="btn-ghost !p-2" aria-label="Back"><ArrowLeft size={15} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[20px] font-bold text-text-900">{v.name}</h2>
            <span className={`chip ${meta.chip} border-text-300 bg-surface-100 text-text-800`}>{meta.label} · {live.score.toFixed(1)}</span>
            <span className="font-mono text-[10.5px] text-text-800">{v.code}</span>
          </div>
          <p className="text-[11.5px] text-text-800">
            {v.watershed} watershed · {v.riverName} at {v.riverDistKm} km · {v.district}, {v.state} · node {v.nodeId ?? 'pending install'}
          </p>
        </div>
        <span className="font-mono text-[10.5px] text-text-800">updated {timeAgo(live.updatedAt)}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        {/* left column */}
        <div className="space-y-3 xl:col-span-2">
          <div className="panel flex items-center gap-4 p-4">
            <RiskRing score={live.score} band={live.band} size={116} label="fused risk" />
            <div className="min-w-0 flex-1 space-y-2">
              {live.arrivalMin !== null ? (
                <div className="rounded-xl border border-red-400/50 bg-red-50 p-3">
                  <div className="metric-label text-red-700">Estimated flood arrival</div>
                  <div className="font-display text-[24px] font-bold leading-tight text-red-600 tabular">≈ {fmtDuration(live.arrivalMin)}</div>
                  <div className="text-[11px] text-text-800">Move to shelter before this window closes.</div>
                </div>
              ) : (
                <div className="rounded-xl border border-surface-300 bg-white p-3 text-[12px] leading-snug text-text-800">
                  Below WARNING threshold — no arrival estimate. Risk recomputed every 15 min from 5 fused features.
                </div>
              )}
              {live.sourcesAgree ? (
                <div className="rounded-xl border border-emerald-400/50 bg-emerald-50 p-3 text-[11.5px] leading-snug text-emerald-700">
                  <Signal size={12} className="mr-1 inline" />
                  {live.sources.length} independent sources confirm readings — WARNING/CRITICAL alerts may fire.
                </div>
              ) : (
                <div className="rounded-xl border border-surface-300 bg-white p-3 text-[11.5px] leading-snug text-text-800">
                  Single-source reading — awaiting 2nd confirmation before WARNING+ escalation (false-alarm defence).
                </div>
              )}
            </div>
          </div>

          <div className="panel p-4">
            <div className="metric-label mb-2 flex items-center gap-1.5"><Thermometer size={12} /> Climate now (hyper-local)</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Thermometer, k: 'Temperature', v: `${live.tempC.toFixed(1)} °C` },
                { icon: CloudRainWind, k: 'Rain (1 h)', v: `${live.rainMmHr.toFixed(1)} mm` },
                { icon: CloudRainWind, k: 'Rain (24 h)', v: `${live.rain24.toFixed(0)} mm` },
                { icon: Droplets, k: 'Humidity', v: `${live.humidityPct.toFixed(0)} %` },
                { icon: Gauge, k: 'Pressure', v: `${live.pressureHpa} hPa` },
                { icon: Gauge, k: 'Wind', v: `${live.windKmph.toFixed(0)} km/h` },
              ].map((m) => (
              <div key={m.k} className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-800">
                  <m.icon size={11} className="text-text-800" /> {m.k}
                </div>                  <div className="metric-num mt-0.5 text-[16px] text-text-900">{m.v}</div>

              </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-800">
                  <MountainSnow size={11} className="text-text-800" /> Elevation / Slope
                </div>
                <div className="metric-num mt-0.5 text-[16px]">{v.elevationM} m · {v.slopeDeg}°</div>
              </div>
              <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-800">
                  <Waves size={11} className="text-sky-500" /> River vs danger
                </div>
                <div className="metric-num mt-0.5 text-[16px]">
                  {live.waterLevelM.toFixed(2)} m <span className="text-[11px] font-normal text-text-800">/ {v.dangerLevelM} m</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-200">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, riverPct)}%`, background: riverPct > 80 ? '#dc2626' : '#38bdf8' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <div className="metric-label mb-2">Explainable AI · fused inputs</div>
            <WhyBox contributions={live.contributions} sources={live.sources} sourcesAgree={live.sourcesAgree} />
          </div>

          <div className="rounded-2xl border border-aqua-400/50 bg-sky-50 p-4">
            <div className="metric-label mb-2 text-aqua-700">Evacuation plan</div>
            <div className="text-[12.5px] leading-relaxed text-text-700">
              <span className="font-semibold text-text-900">Shelter:</span> {v.shelter}<br />
              <span className="font-semibold text-text-900">Route:</span> {v.route}<br />
              <span className="font-semibold text-text-900">Population:</span> {v.population.toLocaleString('en-IN')} in {v.households} households<br />
              <span className="font-semibold text-text-900">Helplines:</span> Disaster 1078 · NDRF 011-2436 3260
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-text-800">
              <Phone size={11} className="text-aqua-600" /> Alerts dispatch in Hindi + Garhwali via SMS / Telegram / FCM
            </div>
          </div>

          {can('alert-issue') && (
            <button className="btn-danger w-full" onClick={() => issueEvacuation(v.id, user?.name ?? 'Officer')}>
              <BellRing size={15} /> Issue evacuation advisory for {v.name}
            </button>
          )}
        </div>

        {/* right column */}
        <div className="space-y-3 xl:col-span-3">
          <div className="panel p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="panel-title">Rainfall · 24 h observed + 6 h AI nowcast</h3>
              <span className="font-mono text-[10px] text-text-800">mm/h · ESP32 + IMERG fused</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rainData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vdRain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="vdFc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={5} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="rain" name="Observed" stroke="#0ea5e9" strokeWidth={2} fill="url(#vdRain)" connectNulls={false} />
                  <Area type="monotone" dataKey="fc" name="AI nowcast" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 4" fill="url(#vdFc)" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="panel p-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="panel-title">Soil saturation</h3>
                <span className="font-mono text-[10px] text-text-800">% · probe/SMAP</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={live.history} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={7} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[20, 100]} />
                    <Tooltip content={<ChartTip />} />
                    <ReferenceLine y={85} stroke="#7c3aed" strokeDasharray="5 4" label={{ value: 'SATURATED', fill: '#7c3aed', fontSize: 9, position: 'right' }} />
                    <Line type="monotone" dataKey="soil" name="Soil %" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="panel-title">River level</h3>
                <span className="font-mono text-[10px] text-text-800">m · CWC/WRIS</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={live.history} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                    <defs>
                    <linearGradient id="vdWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                    </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={7} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, Math.max(1.2, v.dangerLevelM * 1.15)]} />
                    <Tooltip content={<ChartTip />} />
                    <ReferenceLine y={v.dangerLevelM} stroke="#dc2626" strokeDasharray="6 4" label={{ value: 'DANGER', fill: '#dc2626', fontSize: 9, position: 'right' }} />
                    <Area type="monotone" dataKey="water" name="Level (m)" stroke="#0284c7" strokeWidth={2} fill="url(#vdWater)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* node health */}
          <div className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RadioTower size={15} className="text-emerald-600" />
                <h3 className="panel-title">ESP32 node health</h3>
              </div>
              <span className="font-mono text-[10.5px] text-text-800">{v.nodeId ?? 'no node installed'}</span>
            </div>
            {v.nodeId ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                  <div className="metric-label">Status</div>
                  <div className={`mt-0.5 text-[14px] font-bold ${live.nodeStatus === 'online' ? 'text-emerald-600' : live.nodeStatus === 'low-battery' ? 'text-amber-600' : 'text-red-600'}`}>
                    {live.nodeStatus === 'offline' ? <span className="flex items-center gap-1.5"><WifiOff size={13} className="text-red-500" /> OFFLINE</span> : live.nodeStatus === 'low-battery' ? <span className="flex items-center gap-1.5"><BatteryLow size={13} className="text-amber-500" /> LOW BATTERY</span> : 'ONLINE'}
                  </div>
                </div>
                <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                  <div className="metric-label">Battery</div>
                  <div className="metric-num mt-0.5 text-[16px]">{live.batteryPct !== null ? `${Math.round(live.batteryPct)} %` : '—'}</div>
                </div>
                <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                  <div className="metric-label">Signal</div>
                  <div className="metric-num mt-0.5 text-[16px]">{live.signalDbm !== null ? `${live.signalDbm} dBm` : '—'}</div>
                </div>
                <div className="rounded-xl border border-surface-300 bg-white px-3 py-2.5">
                  <div className="metric-label">Last packet</div>
                  <div className="metric-num mt-0.5 text-[16px]">{timeAgo(live.updatedAt)}</div>
                </div>
              </div>
            ) : (
              <p className="text-[12px] leading-relaxed text-text-800">
                This village sits in an audited coverage gap — a ₹1,500 ESP32 node is on the deployment plan. Risk here is computed
                from IMD/IMERG satellite rainfall, SMAP soil moisture and terrain features only.
              </p>
            )}
          </div>

          {/* village alert history */}
          <div className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Siren size={15} className="text-red-600" />
                <h3 className="panel-title">Alert log · this village</h3>
              </div>
              {villageAlerts.some((a) => a.status !== 'RESOLVED') && can('alert-ack') && (
                <button
                  className="btn-ghost !px-3 !py-1.5 !text-[11.5px]"
                  onClick={() => villageAlerts.filter((a) => a.status === 'ACTIVE').forEach((a) => ackAlert(a.id, user?.name ?? 'Officer'))}
                >
                  <CheckCheck size={13} /> Acknowledge open
                </button>
              )}
            </div>
            {villageAlerts.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-text-800">No alerts on record — village has stayed below thresholds. 🌤</p>
            ) : (
              <div className="divide-y divide-surface-200">
                {villageAlerts.map((a) => (
                  <div key={a.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${a.severity === 'CRITICAL' ? 'border-red-400/50 bg-red-50 text-red-700' : a.severity === 'WARNING' ? 'border-orange-400/50 bg-orange-50 text-orange-700' : 'border-yellow-400/50 bg-yellow-50 text-yellow-700'}`}>{a.severity}</span>
                      <span className="font-mono text-[10.5px] text-text-800">{a.id} · {timeAgo(a.ts)}</span>
                      <span className={`ml-auto text-[10.5px] font-bold ${a.status === 'ACTIVE' ? 'text-red-600' : a.status === 'ACKNOWLEDGED' ? 'text-amber-600' : 'text-text-800'}`}>{a.status}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-800">{a.why}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
