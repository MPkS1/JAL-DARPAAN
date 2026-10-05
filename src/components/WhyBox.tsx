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
    <div className="rounded-xl border border-white/10 bg-ink-900/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={13} className="text-aqua-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog-300">Why this risk</span>
        </div>
        {sourcesAgree ? (
          <span className="chip border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
            <ShieldCheck size={11} /> {sources.length} sources confirm
          </span>
        ) : (
          <span className="chip border-white/15 bg-white/5 text-fog-400">Awaiting 2nd source</span>
        )}
      </div>
      <div className="space-y-1.5">
        {top.map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] text-fog-300">{c.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(c.value / max) * 100}%`, background: c.color, boxShadow: `0 0 8px ${c.color}66` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-[10.5px] text-fog-300 tabular">{c.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span key={s} className="chip border-aqua-400/25 bg-aqua-500/10 font-mono text-[10px] text-aqua-300">{s}</span>
        ))}
      </div>
    </div>
  );
}
