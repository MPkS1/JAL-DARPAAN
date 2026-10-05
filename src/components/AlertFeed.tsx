import { Link } from 'react-router-dom';
import { BellRing, CheckCheck, Clock, ShieldCheck, XCircle } from 'lucide-react';
import type { FloodAlert } from '../types';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { fmtDuration, timeAgo } from '../lib/format';

const SEV: Record<FloodAlert['severity'], { chip: string; label: string }> = {
  WATCH: { chip: 'border-yellow-400/40 bg-yellow-500/15 text-yellow-300', label: 'WATCH' },
  WARNING: { chip: 'border-orange-400/40 bg-orange-500/15 text-orange-300', label: 'WARNING' },
  CRITICAL: { chip: 'border-red-400/40 bg-red-500/15 text-red-300', label: 'CRITICAL' },
};

const STATUS: Record<FloodAlert['status'], { chip: string; label: string }> = {
  ACTIVE: { chip: 'border-red-400/40 bg-red-500/10 text-red-300', label: 'ACTIVE' },
  ACKNOWLEDGED: { chip: 'border-amber-400/40 bg-amber-500/10 text-amber-300', label: 'ACKNOWLEDGED' },
  RESOLVED: { chip: 'border-white/15 bg-white/5 text-fog-400', label: 'RESOLVED' },
};

interface Props {
  limit?: number;
  title?: string;
  scroll?: boolean;
}

export default function AlertFeed({ limit, title = 'Live alert feed', scroll = true }: Props) {
  const { alerts, ackAlert, resolveAlert } = useLive();
  const { user, can } = useAuth();
  const shown = limit ? alerts.slice(0, limit) : alerts;

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <BellRing size={15} className="text-red-300" />
          <h3 className="panel-title">{title}</h3>
        </div>
        <span className="font-mono text-[10.5px] text-fog-500">{alerts.filter((a) => a.status === 'ACTIVE').length} active</span>
      </div>
      <div className={`${scroll ? 'max-h-[520px] overflow-y-auto' : ''} divide-y divide-white/6`}>
        {shown.length === 0 && (
          <div className="p-6 text-center text-[12.5px] text-fog-400">No alerts — all villages below WATCH threshold. 🌤</div>
        )}
        {shown.map((a) => (
          <div key={a.id} className="p-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`chip ${SEV[a.severity].chip}`}>{SEV[a.severity].label}</span>
              <span className={`chip ${STATUS[a.status].chip}`}>{STATUS[a.status].label}</span>
              {a.sources.length >= 2 && (
                <span className="chip border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheck size={11} /> {a.sources.length} sources confirm
                </span>
              )}
              {a.manual && <span className="chip border-violet-400/40 bg-violet-500/10 text-violet-300">MANUAL ORDER</span>}
              <span className="ml-auto flex items-center gap-1 text-[10.5px] text-fog-500">
                <Clock size={11} /> {timeAgo(a.ts)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/villages/${a.villageId}`} className="font-display text-[14.5px] font-semibold text-fog-100 hover:text-aqua-300">
                {a.villageName}
              </Link>
              {a.arrivalMin !== null && a.status !== 'RESOLVED' && (
                <span className="chip border-red-400/40 bg-red-500/10 font-mono text-red-300">
                  ⏱ arrival ≈ {fmtDuration(a.arrivalMin)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fog-300">{a.why}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {a.sources.map((s) => (
                <span key={s} className="chip border-aqua-400/25 bg-aqua-500/10 font-mono text-[10px] text-aqua-300">{s}</span>
              ))}
              {a.ackBy && <span className="text-[10.5px] text-fog-500">ack by {a.ackBy}</span>}
              <span className="ml-auto flex gap-2">
                {a.status === 'ACTIVE' && can('alert-ack') && (
                  <button
                    className="btn-ghost !px-3 !py-1.5 !text-[11.5px]"
                    onClick={() => ackAlert(a.id, user?.name ?? 'Officer')}
                  >
                    <CheckCheck size={13} /> Acknowledge
                  </button>
                )}
                {a.status !== 'RESOLVED' && can('alert-resolve') && (
                  <button
                    className="btn-ghost !px-3 !py-1.5 !text-[11.5px] hover:!border-emerald-400/40 hover:!text-emerald-300"
                    onClick={() => resolveAlert(a.id)}
                  >
                    <XCircle size={13} /> Resolve
                  </button>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
