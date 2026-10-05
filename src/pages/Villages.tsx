import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BatteryLow, CloudRainWind, Droplets, Lock, MapPin, RadioTower, Search, Waves } from 'lucide-react';
import type { Village, VillageLive } from '../types';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { VILLAGES } from '../data/villages';
import { BANDS } from '../lib/risk';
import { fmtNum } from '../lib/format';
import Sparkline from '../components/Sparkline';

type SortKey = 'risk' | 'rain' | 'name' | 'elevation';

export default function Villages() {
  const { villagesLive } = useLive();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('risk');

  const ownVillageId = user?.role === 'village' ? user.scopeVillageId ?? null : null;

  const rows = useMemo(() => {
    const list = VILLAGES.filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase()));
    const score = (v: Village) => villagesLive[v.id]?.score ?? 0;
    const rain = (v: Village) => villagesLive[v.id]?.rainMmHr ?? 0;
    const sorted = [...list];
    if (sort === 'risk') sorted.sort((a, b) => score(b) - score(a));
    if (sort === 'rain') sorted.sort((a, b) => rain(b) - rain(a));
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'elevation') sorted.sort((a, b) => b.elevationM - a.elevationM);
    return sorted;
  }, [q, sort, villagesLive]);

  const bandCounts = { SAFE: 0, WATCH: 0, WARNING: 0, CRITICAL: 0 } as Record<VillageLive['band'], number>;
  for (const v of VILLAGES) {
    const l = villagesLive[v.id];
    if (l) bandCounts[l.band] += 1;
  }

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-aqua-300" />
          <h2 className="font-display text-[16px] font-bold">All villages · live risk ranked</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['CRITICAL', 'WARNING', 'WATCH', 'SAFE'] as const).map((b) => (
            <span key={b} className={`chip ${BANDS[b].chip}`}>{bandCounts[b]} {b}</span>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search village…"
              className="w-44 rounded-xl border border-white/12 bg-ink-900/80 py-2 pl-8 pr-3 text-[13px] text-fog-100 placeholder:text-fog-500 outline-none focus:border-aqua-400/70"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-white/12 bg-ink-900/80 px-3 py-2 text-[12.5px] text-fog-100 outline-none focus:border-aqua-400/70"
          >
            <option value="risk">Sort: risk score</option>
            <option value="rain">Sort: rainfall now</option>
            <option value="name">Sort: name (A–Z)</option>
            <option value="elevation">Sort: elevation</option>
          </select>
        </div>
      </div>

      {ownVillageId && (
        <div className="panel flex items-center gap-3 border-amber-400/30 bg-amber-500/[0.07] px-4 py-3">
          <Lock size={15} className="shrink-0 text-amber-300" />
          <p className="text-[12.5px] text-fog-200">
            Village-pradhan scope: full detail pages are enabled for <span className="font-semibold text-fog-100">your panchayat village</span> only;
            other rows are read-only summaries for situational awareness.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => {
          const l = villagesLive[v.id];
          if (!l) return null;
          const meta = BANDS[l.band];
          const own = v.id === ownVillageId;
          const riverPct = Math.min(100, (l.waterLevelM / v.dangerLevelM) * 100);
          return (
            <div key={v.id} className={`panel flex flex-col p-4 ${own ? 'ring-1 ring-amber-400/50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${meta.chip}`}>{l.band}</span>
                    <span className="font-mono text-[10px] text-fog-500">{v.code}</span>
                    {own && <span className="chip border-amber-400/40 bg-amber-500/15 text-amber-300">YOUR VILLAGE</span>}
                  </div>
                  <h3 className="mt-1 truncate font-display text-[16px] font-bold text-fog-100">{v.name}</h3>
                  <p className="truncate text-[11px] text-fog-400">
                    {v.watershed} watershed · {fmtNum(v.population)} people · {v.elevationM} m · {v.slopeDeg}°
                  </p>
                </div>
                <div className="text-right">
                  <div className="metric-num text-[24px] leading-none" style={{ color: meta.hex }}>{l.score.toFixed(0)}</div>
                  <div className="metric-label mt-0.5">risk</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                <div className="rounded-lg border border-white/8 bg-ink-900/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-fog-500"><CloudRainWind size={11} /> Rain 1 h</div>
                  <div className="mt-0.5 font-mono font-semibold text-aqua-300 tabular">{l.rainMmHr.toFixed(1)} mm</div>
                </div>
                <div className="rounded-lg border border-white/8 bg-ink-900/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-fog-500"><Droplets size={11} /> Soil</div>
                  <div className="mt-0.5 font-mono font-semibold text-violet-300 tabular">{Math.round(l.soilPct)} %</div>
                </div>
                <div className="rounded-lg border border-white/8 bg-ink-900/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-fog-500"><Waves size={11} /> River</div>
                  <div className="mt-0.5 font-mono font-semibold text-sky-300 tabular">{riverPct.toFixed(0)} %</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <Sparkline values={l.history.map((p) => p.rain)} color={meta.hex} width={130} height={26} />
                <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-fog-400">
                  {v.nodeId ? (
                    <>
                      <RadioTower size={12} className={l.nodeStatus === 'online' ? 'text-emerald-300' : l.nodeStatus === 'low-battery' ? 'text-amber-300' : 'text-red-300'} />
                      {l.nodeStatus === 'online' ? 'online' : l.nodeStatus === 'low-battery' ? <><BatteryLow size={12} className="text-amber-300" /> low-batt {Math.round(l.batteryPct ?? 0)}%</> : 'OFFLINE'}
                    </>
                  ) : (
                    'no node · satellite only'
                  )}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                <span className="text-[11px] text-fog-400">{v.riverName} · {v.riverDistKm} km</span>
                {own || user?.role !== 'village' ? (
                  <Link to={`/villages/${v.id}`} className="btn-ghost !px-3 !py-1.5 !text-[11.5px] hover:!text-aqua-300">
                    Open detail →
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] text-fog-500"><Lock size={11} /> outside panchayat scope</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
