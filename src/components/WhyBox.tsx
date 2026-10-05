import type { Contribution } from '../types';
import { ShieldCheck, HelpCircle } from 'lucide-react';

interface Props {
  contributions: Contribution[];
  sources: string[];
  sourcesAgree: boolean;
  compact?: boolean;
}

export default function WhyBox({ contributions, sources, sourcesAgree, compact }: Props) {
  const top = contributions.filter((c) => c.value > 0.4).slice(0, compact ? 3 : 5);
  const max = Math.max(...top.map((c) => c.value), 1);

  return (
    <div className="rounded-xl border border-surface-300 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={13} className="text-aqua-600" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-800">Why this risk</span>
        </div>
        {sourcesAgree ? (
          <span className="chip border-emerald-500/50 bg-emerald-50 text-emerald-700 border-text-300 bg-surface-100 text-text-800">
            <ShieldCheck size={11} /> {sources.length} sources confirm
          </span>
        ) : (
          <span className="chip border-surface-300 bg-surface-100 text-text-800">Awaiting 2nd source</span>
        )}
      </div>
      <div className="space-y-1.5">
        {top.map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] text-text-800">{c.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(c.value / max) * 100}%`, background: c.color, boxShadow: `0 0 6px ${c.color}44` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-[10.5px] text-text-700 tabular">{c.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span key={s} className="chip border-aqua-500/50 bg-aqua-50 font-mono text-[10px] text-aqua-700 border-text-300 bg-surface-100 text-text-800">{s}</span>
        ))}
      </div>
    </div>
  );
}
