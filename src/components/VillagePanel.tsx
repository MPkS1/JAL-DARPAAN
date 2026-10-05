import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BellRing, CheckCheck, CloudRainWind, Droplets, Gauge,
  MountainSnow, Siren, Thermometer, Waves, Wind, X,
} from 'lucide-react';
import type { Village } from '../types';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { BANDS } from '../lib/risk';
import { fmtDuration } from '../lib/format';
import RiskRing from './RiskRing';
import WhyBox from './WhyBox';

interface Props {
  village: Village;
  onClose: () => void;
}

export default function VillagePanel({ village: v, onClose }: Props) {
  const { villagesLive, alerts, ackAlert, issueEvacuation } = useLive();
  const { user, can } = useAuth();
  const live = villagesLive[v.id];
  if (!live) return null;
  const meta = BANDS[live.band];
  const villageAlerts = alerts.filter((a) => a.villageId === v.id && a.status !== 'RESOLVED');

  return (
    <div className="panel flex flex-col overflow-hidden">
      {/* header */}
      <div className={`flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3 ${meta.bg}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`chip ${meta.chip}`}>{meta.label}</span>
            <span className="font-mono text-[10.5px] text-fog-400">{v.code}</span>
          </div>
          <h3 className="mt-1 truncate font-display text-[19px] font-bold text-fog-100">{v.name}</h3>
          <p className="text-[11px] text-fog-300">
            {v.watershed} watershed · {v.riverName} · {v.district}, {v.state}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost !rounded-lg !p-2" aria-label="Close panel">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3.5 overflow-y-auto p-4">
        {/* score + arrival */}
        <div className="flex items-center gap-4">
          <RiskRing score={live.score} band={live.band} size={104} label="risk score" />
          <div className="min-w-0 flex-1 space-y-2">
            {live.arrivalMin !== null ? (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3">
                <div className="metric-label text-red-300/90">Estimated flood arrival</div>
                <div className="font-display text-[26px] font-bold leading-tight text-red-300 tabular">
                  ≈ {fmtDuration(live.arrivalMin)}
                </div>
                <div className="text-[11px] text-fog-300">Move to shelter before this window closes.</div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-snug text-fog-300">
                No imminent arrival estimate — village below WARNING threshold. Monitoring every 15 min.
              </div>
            )}
            {villageAlerts.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5">
                  <Siren size={13} className="text-amber-300" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    {villageAlerts.length} open alert{villageAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                {villageAlerts.slice(0, 2).map((a) => (
                  <div key={a.id} className="mt-1 text-[11.5px] text-fog-200">
                    <span className="font-semibold">{a.severity}</span> · {a.why.slice(0, 90)}…
                  </div>
                ))}
                {can('alert-ack') && (
                  <button
                    className="btn-ghost mt-2 !px-3 !py-1.5 !text-[11.5px]"
                    onClick={() => villageAlerts.forEach((a) => ackAlert(a.id, user?.name ?? 'Officer'))}
                  >
                    <CheckCheck size={13} /> Acknowledge all
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* climate now */}
        <div>
          <div className="metric-label mb-1.5 flex items-center gap-1.5"><Thermometer size={12} /> Climate now (hyper-local)</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Thermometer, k: 'Temperature', v: `${live.tempC.toFixed(1)} °C` },
              { icon: CloudRainWind, k: 'Rain (1 h)', v: `${live.rainMmHr.toFixed(1)} mm` },
              { icon: Droplets, k: 'Humidity', v: `${live.humidityPct.toFixed(0)} %` },
              { icon: Wind, k: 'Wind', v: `${live.windKmph.toFixed(0)} km/h` },
              { icon: Gauge, k: 'Pressure', v: `${live.pressureHpa} hPa` },
              { icon: CloudRainWind, k: 'Rain (24 h)', v: `${live.rain24.toFixed(0)} mm` },
            ].map((m) => (
              <div key={m.k} className="rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-fog-500">
                  <m.icon size={11} /> {m.k}
                </div>
                <div className="metric-num mt-0.5 text-[16px]">{m.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* terrain + hydro */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-fog-500">
              <MountainSnow size={11} /> Elevation / Slope
            </div>
            <div className="metric-num mt-0.5 text-[16px]">{v.elevationM} m · {v.slopeDeg}°</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-fog-500">
              <Waves size={11} /> River level
            </div>
            <div className="metric-num mt-0.5 text-[16px]">
              {live.waterLevelM.toFixed(2)} m <span className="text-[11px] font-normal text-fog-400">/ {v.dangerLevelM} m danger</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (live.waterLevelM / v.dangerLevelM) * 100)}%`,
                  background: live.waterLevelM / v.dangerLevelM > 0.8 ? '#ef4444' : '#38bdf8',
                }}
              />
            </div>
          </div>
        </div>

        {/* WHY */}
        <div>
          <div className="metric-label mb-1.5">Explainable AI · fused inputs</div>
          <WhyBox contributions={live.contributions} sources={live.sources} sourcesAgree={live.sourcesAgree} compact />
        </div>

        {/* evacuation */}
        <div className="rounded-xl border border-aqua-400/25 bg-aqua-500/[0.07] p-3">
          <div className="metric-label mb-1.5 text-aqua-300">Evacuation plan</div>
          <div className="text-[12.5px] leading-relaxed text-fog-200">
            <span className="font-semibold text-fog-100">Shelter:</span> {v.shelter}
            <br />
            <span className="font-semibold text-fog-100">Route:</span> {v.route}
            <br />
            <span className="font-semibold text-fog-100">Helplines:</span> Disaster 1078 · NDRF 011-2436 3260 (Hindi / Garhwali SMS)
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2">
          <Link to={`/villages/${v.id}`} className="btn-primary !py-2 !text-[12.5px]">
            Open full page <ArrowUpRight size={14} />
          </Link>
          {can('alert-issue') && (
            <button
              className="btn-danger !py-2 !text-[12.5px]"
              onClick={() => issueEvacuation(v.id, user?.name ?? 'Officer')}
            >
              <BellRing size={14} /> Issue evacuation advisory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
