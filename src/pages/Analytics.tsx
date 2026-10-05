import { useMemo } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Brain, Target, TrendingUp } from 'lucide-react';
import { BACKTESTS, CONFUSION, FEATURE_IMPORTANCE, MODEL_METRICS, ROC_POINTS } from '../data/backtest';

const AXIS = { stroke: '#94a3b8', fontSize: 10.5 };
const GRID = 'rgba(148,163,184,0.15)';

function Tip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-[11.5px] shadow-sm">
      <div className="mb-1 font-semibold text-text-700">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />            <span className="text-text-800">{p.name}</span>
            <span className="ml-auto font-mono text-text-900 tabular">{Number(p.value).toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const rocData = useMemo(() => {
    const diag = ROC_POINTS.filter((_, i) => i % 5 === 0 || i === ROC_POINTS.length - 1).map((p) => ({ fpr: p.fpr, model: p.tpr, chance: p.fpr }));
    return [...diag, { fpr: 1, model: 1, chance: 1 }];
  }, []);

  const { tp, fp, fn, tn } = CONFUSION;
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = (2 * precision * recall) / (precision + recall);
  const total = tp + fp + fn + tn;

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-aqua-600" />
          <h2 className="font-display text-[16px] font-bold">AI & Analytics · model transparency</h2>
        </div>
        <p className="text-[11.5px] text-text-800">
          Production contract: LightGBM risk classifier + LSTM/GRU nowcasts + SHAP explanations — validated by backtest before any live alert.
        </p>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {MODEL_METRICS.map((m) => (
          <div key={m.label} className="panel p-4">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-num mt-1 text-[24px] leading-tight ${m.good ? 'text-emerald-600' : 'text-amber-600'}`}>{m.value}</div>
            <div className="mt-0.5 text-[11px] text-text-800">{m.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* ROC */}
        <div className="panel p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="panel-title">ROC curve · test holdout</h3>
            <span className="font-mono text-[10px] text-text-800">AUC 0.87 · chance = 0.5</span>
          </div>
          <p className="mb-2 text-[11px] text-text-800">True-positive rate vs false-alarm rate across all score thresholds.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocData} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis dataKey="fpr" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 10.5, color: '#8ca3bf' }} iconType="plainline" />
                <ReferenceLine x={0.5} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="chance" name="Chance (AUC 0.5)" stroke="#64789a" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="model" name="JAL-DARPAAN model" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion matrix */}
        <div className="panel p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="panel-title">Confusion matrix · event holdout</h3>
            <span className="font-mono text-[10px] text-text-800">n = {total} village-hours</span>
          </div>
          <p className="mb-2 text-[11px] text-text-800">Reads: of {tp + fp} alerts raised, {tp} were true events — precision {precision.toFixed(2)}, recall {recall.toFixed(2)}, F1 {f1.toFixed(2)}.</p>
          <div className="mx-auto grid max-w-sm grid-cols-[auto_1fr_1fr] gap-1.5 text-center">
            <div />
            <div className="metric-label">Predicted event</div>
            <div className="metric-label">Predicted safe</div>
            <div className="metric-label flex items-center justify-end pr-1">Actual event</div>
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-50 p-4">
              <div className="metric-num text-[26px] text-emerald-700">{tp}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">true positive</div>
            </div>
            <div className="rounded-xl border border-amber-500/50 bg-amber-50 p-4">
              <div className="metric-num text-[26px] text-amber-700">{fn}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">missed</div>
            </div>
            <div className="metric-label flex items-center justify-end pr-1">Actual safe</div>
            <div className="rounded-xl border border-red-500/50 bg-red-50 p-4">
              <div className="metric-num text-[26px] text-red-700">{fp}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600">false alarm</div>
            </div>
            <div className="rounded-xl border border-surface-300 bg-white p-4">
              <div className="metric-num text-[26px] text-text-800">{tn}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-800">true negative</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* feature importance */}
        <div className="panel p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="panel-title flex items-center gap-2"><Target size={14} className="text-violet-300" /> SHAP feature importance</h3>
            <span className="font-mono text-[10px] text-text-800">mean |SHAP| · risk class</span>
          </div>
          <p className="mb-3 text-[11px] text-text-800">Rain intensity and soil saturation dominate — exactly the two inputs ground stations + satellites already provide.</p>
          <div className="space-y-2.5">
            {FEATURE_IMPORTANCE.map((f, i) => {
              const max = FEATURE_IMPORTANCE[0].value;
              const colors = ['#0ea5e9', '#7c3aed', '#0284c7', '#ea580c', '#10b981', '#ca8a04', '#94a3b8'];
              return (
                <div key={f.feature} className="flex items-center gap-2">
                  <span className="w-56 shrink-0 text-[11.5px] text-text-800">{f.feature}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-200">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(f.value / max) * 100}%`, background: colors[i % colors.length], boxShadow: `0 0 6px ${colors[i % colors.length]}44` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-text-700 tabular">{f.value.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* backtests */}
        <div className="panel p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="panel-title flex items-center gap-2"><TrendingUp size={14} className="text-emerald-300" /> Historical backtests</h3>
            <span className="font-mono text-[10px] text-text-800">replayed real events</span>
          </div>
          <p className="mb-3 text-[11px] text-text-800">Would the model have warned in time? Real rainfall/river records replayed through the engine.</p>
          <div className="space-y-3">
            {BACKTESTS.map((b) => (
              <div key={b.event} className="rounded-xl border border-surface-300 bg-white p-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[14px] font-bold text-text-900">{b.event} · {b.year}</span>
                  <span className="chip border-emerald-500/50 bg-emerald-50 text-emerald-700 border-text-300 bg-surface-100 text-text-800">lead {b.leadTimeHrs.toFixed(1)} h</span>
                  <span className="ml-auto font-mono text-[10.5px] text-text-800">{b.peakRain}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-text-800">{b.place} · {b.villagesFlagged}</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-800">{b.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
