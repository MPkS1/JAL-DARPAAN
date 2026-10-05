import { BellRing, CheckCheck, Lock, ShieldCheck, Siren, XCircle } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import AlertFeed from '../components/AlertFeed';

export default function Alerts() {
  const { alerts } = useLive();
  const { can } = useAuth();

  const active = alerts.filter((a) => a.status === 'ACTIVE');
  const ack = alerts.filter((a) => a.status === 'ACKNOWLEDGED');
  const resolved = alerts.filter((a) => a.status === 'RESOLVED');
  const criticalActive = active.filter((a) => a.severity === 'CRITICAL').length;
  const twoSource = alerts.filter((a) => a.sources.length >= 2).length;

  const stats = [
    { icon: Siren, label: 'ACTIVE now', value: String(active.length), accent: 'text-red-300', ring: 'border-red-400/30 bg-red-500/10' },
    { icon: BellRing, label: 'CRITICAL active', value: String(criticalActive), accent: 'text-red-300', ring: 'border-red-400/30 bg-red-500/10' },
    { icon: CheckCheck, label: 'Acknowledged', value: String(ack.length), accent: 'text-amber-300', ring: 'border-amber-400/25 bg-amber-500/10' },
    { icon: XCircle, label: 'Resolved', value: String(resolved.length), accent: 'text-emerald-300', ring: 'border-emerald-400/25 bg-emerald-500/10' },
    { icon: ShieldCheck, label: '2-source confirmed', value: `${twoSource}/${alerts.length}`, accent: 'text-aqua-300', ring: 'border-aqua-400/25 bg-aqua-500/10' },
  ];

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Siren size={16} className="text-red-300" />
          <h2 className="font-display text-[16px] font-bold">Alert log · full lifecycle</h2>
        </div>
        <p className="text-[11.5px] text-fog-400">
          WATCH fires at score ≥ 45 · WARNING ≥ 62 and CRITICAL ≥ 78 require <span className="text-fog-100">≥ 2 independent sources</span> · 90 s per-village cooldown
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="panel flex items-center gap-3 p-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${s.ring}`}>
              <s.icon size={19} className={s.accent} />
            </div>
            <div className="min-w-0">
              <div className="metric-label">{s.label}</div>
              <div className={`metric-num text-[22px] leading-tight ${s.accent}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 text-[11.5px] text-fog-300">
        <span className="metric-label">Your role's permissions:</span>
        {can('alert-ack')
          ? <span className="flex items-center gap-1.5 text-emerald-300"><CheckCheck size={13} /> you can acknowledge</span>
          : <span className="flex items-center gap-1.5 text-fog-500"><Lock size={12} /> acknowledge not allowed (view only)</span>}
        {can('alert-issue')
          ? <span className="flex items-center gap-1.5 text-red-300"><BellRing size={13} /> you can issue evacuation advisories (from village pages)</span>
          : <span className="flex items-center gap-1.5 text-fog-500"><Lock size={12} /> issuing advisories not allowed</span>}
        {can('alert-resolve')
          ? <span className="flex items-center gap-1.5 text-sky-300"><XCircle size={13} /> you can resolve / close</span>
          : <span className="flex items-center gap-1.5 text-fog-500"><Lock size={12} /> resolving not allowed (National/State only)</span>}
      </div>

      <AlertFeed />
    </div>
  );
}
