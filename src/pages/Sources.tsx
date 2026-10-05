import { Database, ShieldCheck, Zap } from 'lucide-react';
import type { SourceStatus } from '../types';
import { DATA_SOURCES } from '../data/sources';

const STATUS_CHIP: Record<SourceStatus['status'], string> = {
  operational: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
  degraded: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
  fallback: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
  offline: 'border-red-400/40 bg-red-500/15 text-red-300',
};

const KIND_CHIP: Record<SourceStatus['kind'], string> = {
  Station: 'border-aqua-400/25 bg-aqua-500/10 text-aqua-300',
  Satellite: 'border-violet-400/25 bg-violet-500/10 text-violet-300',
  Terrain: 'border-orange-400/25 bg-orange-500/10 text-orange-300',
  Inventory: 'border-white/15 bg-white/5 text-fog-300',
  IoT: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  Fallback: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
};

export default function Sources() {
  const counts = DATA_SOURCES.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-aqua-300" />
          <h2 className="font-display text-[16px] font-bold">Data sources · 11 fused feeds</h2>
        </div>
        <p className="text-[11.5px] text-fog-400">
          Swappable adapters with automatic fallback — no single portal outage breaks operations.
        </p>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <span className="chip border-emerald-400/40 bg-emerald-500/15 text-emerald-300">{counts.operational ?? 0} operational</span>
          <span className="chip border-amber-400/40 bg-amber-500/15 text-amber-300">{counts.degraded ?? 0} degraded</span>
          <span className="chip border-sky-400/40 bg-sky-500/15 text-sky-300">{counts.fallback ?? 0} fallback</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DATA_SOURCES.map((s) => (
          <div key={s.id} className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate font-display text-[14.5px] font-bold text-fog-100">{s.name}</h3>
              <span className={`chip ${KIND_CHIP[s.kind]}`}>{s.kind}</span>
              <span className={`chip ${STATUS_CHIP[s.status]}`}>{s.status.toUpperCase()}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-fog-500">
              <span>{s.provider}</span>
              <span className="flex items-center gap-1"><Zap size={10} /> {s.latencyMs >= 1000 ? `${(s.latencyMs / 1000).toFixed(1)} s` : `${s.latencyMs} ms`} latency</span>
              <span>sync {s.lastSync}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-fog-300">{s.detail}</p>
          </div>
        ))}
      </div>

      <div className="panel flex flex-wrap items-center gap-3 border-emerald-400/25 bg-emerald-500/[0.06] p-4">
        <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
        <p className="text-[12px] leading-relaxed text-fog-200">
          <span className="font-semibold text-fog-100">Resilience contract:</span> every feed has a documented fallback (IMD portal
          restriction → gridded rainfall + Open-Meteo; node dropout → satellite fusion). The 2-source confirmation rule only escalates
          when independent feeds agree, so degraded sources reduce sensitivity — never silence.
        </p>
      </div>
    </div>
  );
}
