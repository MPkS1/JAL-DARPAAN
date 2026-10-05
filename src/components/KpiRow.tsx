import { AlertTriangle, BellRing, Gauge, House, RadioTower, Waves } from 'lucide-react';
import type { Village, VillageLive } from '../types';

interface Props {
  villages: Village[];
  live: Record<string, VillageLive>;
  activeAlerts: number;
  criticalAlerts: number;
}

export default function KpiRow({ villages, live, activeAlerts, criticalAlerts }: Props) {
  const elevated = villages.filter((v) => {
    const l = live[v.id];
    return l && (l.band === 'WARNING' || l.band === 'CRITICAL');
  }).length;

  const nodes = villages.filter((v) => v.nodeId);
  const nodesOnline = nodes.filter((v) => live[v.id]?.nodeStatus === 'online').length;

  let peak = { rain: 0, name: '—' };
  for (const v of villages) {
    const l = live[v.id];
    if (l && l.rainMmHr > peak.rain) peak = { rain: l.rainMmHr, name: v.name };
  }

  let worstRiver = { ratio: 0, name: '—', level: 0, danger: 1 };
  for (const v of villages) {
    const l = live[v.id];
    if (!l) continue;
    const ratio = l.waterLevelM / v.dangerLevelM;
    if (ratio > worstRiver.ratio) worstRiver = { ratio, name: v.name, level: l.waterLevelM, danger: v.dangerLevelM };
  }

  const cards = [
    {
      icon: House, label: 'Villages monitored', value: '24', sub: `${elevated} at WARNING+ · Rudraprayag, UK`,
      accent: 'text-aqua-300', ring: 'border-aqua-400/25 bg-aqua-500/10',
    },
    {
      icon: BellRing, label: 'Active alerts', value: String(activeAlerts), sub: `${criticalAlerts} CRITICAL · auto-refreshed live`,
      accent: criticalAlerts > 0 ? 'text-red-300' : 'text-amber-300', ring: criticalAlerts > 0 ? 'border-red-400/30 bg-red-500/10' : 'border-amber-400/25 bg-amber-500/10',
    },
    {
      icon: RadioTower, label: 'ESP32 nodes online', value: `${nodesOnline}/${nodes.length}`, sub: '1 offline · 1 low-battery (drill)',
      accent: 'text-emerald-300', ring: 'border-emerald-400/25 bg-emerald-500/10',
    },
    {
      icon: Gauge, label: 'Peak rainfall now', value: `${peak.rain.toFixed(0)} mm/h`, sub: `${peak.name} · 1 h intensity`,
      accent: 'text-violet-300', ring: 'border-violet-400/25 bg-violet-500/10',
    },
    {
      icon: Waves, label: 'Highest river level', value: `${(worstRiver.ratio * 100).toFixed(0)}% of danger`,
      sub: `${worstRiver.name} · ${worstRiver.level.toFixed(1)} m / ${worstRiver.danger.toFixed(1)} m`,
      accent: worstRiver.ratio > 0.85 ? 'text-red-300' : 'text-sky-300', ring: worstRiver.ratio > 0.85 ? 'border-red-400/30 bg-red-500/10' : 'border-sky-400/25 bg-sky-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="panel flex items-center gap-3 p-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${c.ring} border-text-300 bg-white`}>
            <c.icon size={20} className={c.accent} />
          </div>
          <div className="min-w-0">
            <div className="metric-label">{c.label}</div>
            <div className={`metric-num truncate text-[22px] leading-tight ${c.accent}`}>{c.value}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-text-800">
              <AlertTriangle size={10} className="shrink-0 opacity-60 text-text-800" />
              <span className="truncate">{c.sub}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
