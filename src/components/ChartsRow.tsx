import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Village, VillageLive } from '../types';

interface Props {
  villages: Village[];
  live: Record<string, VillageLive>;
}

const AXIS = { stroke: '#64789a', fontSize: 10.5 };
const GRID = 'rgba(255,255,255,0.06)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-ink-950/95 px-3 py-2 text-[11.5px] shadow-xl">
      <div className="mb-1 font-semibold text-fog-300">{label}</div>
      {payload
        .filter((p: { value: number | null }) => p.value !== null && p.value !== undefined)
        .map((p: { name: string; value: number; color: string }) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-fog-300">{p.name}</span>
            <span className="ml-auto font-mono text-fog-100 tabular">{Number(p.value).toFixed(1)}</span>
          </div>
        ))}
    </div>
  );
}

const SERIES_COLORS = ['#22d3ee', '#a78bfa', '#fb923c', '#34d399'];

export default function ChartsRow({ villages, live }: Props) {
  const withData = villages.filter((v) => live[v.id]);

  // 1) Watershed-wide rainfall: max across villages per hour, + 6 h AI nowcast
  const rainData = useMemo(() => {
    if (!withData.length) return [];
    const base = withData[0] && live[withData[0].id] ? live[withData[0].id].history : [];
    const hours = base.map((p) => p.hour);
    const hist = hours.map((hour, i) => {
      const rain = Math.max(...withData.map((v) => live[v.id].history[i]?.rain ?? 0));
      return { hour, rain, fc: i === hours.length - 1 ? rain : null };
    });
    const fcBase = live[withData[0].id]?.nowcast ?? [];
    const fc = fcBase.map((r, i) => ({ hour: `+${i + 1}h`, rain: null, fc: Math.max(...withData.map((v) => live[v.id].nowcast[i] ?? 0)) }));
    return [...hist, ...fc];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, villages]);

  // 2) Soil saturation of the 4 highest-risk villages
  const topRisk = useMemo(
    () => [...villages].sort((a, b) => (live[b.id]?.score ?? 0) - (live[a.id]?.score ?? 0)).slice(0, 4),
    [villages, live],
  );
  const soilData = useMemo(() => {
    if (!withData.length) return [];
    const hours = live[withData[0].id]?.history.map((p) => p.hour) ?? [];
    return hours.map((hour, i) => {
      const row: Record<string, string | number> = { hour };
      for (const v of topRisk) row[v.name] = live[v.id]?.history[i]?.soil ?? 0;
      return row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, villages, topRisk]);

  // 3) River level at the Chandrapuri CWC gauge vs danger level
  const gauge = villages.find((v) => v.id === 'VN-2210');
  const gaugeLive = gauge ? live[gauge.id] : undefined;
  const riverData = gaugeLive ? gaugeLive.history : [];

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <div className="panel p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="panel-title">Watershed rainfall · 24 h + AI nowcast</h3>
          <span className="font-mono text-[10px] text-fog-500">mm/h · max of 24 villages</span>
        </div>
        <p className="mb-2 text-[11px] text-fog-400">Dashed segment = LSTM ensemble nowcast, next 6 hours.</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rainData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gFc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={5} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="" />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="rain" name="Observed (fused)" stroke="#22d3ee" strokeWidth={2} fill="url(#gRain)" connectNulls={false} />
              <Area type="monotone" dataKey="fc" name="AI nowcast 6 h" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" fill="url(#gFc)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="panel-title">Soil saturation · top-risk villages</h3>
          <span className="font-mono text-[10px] text-fog-500">% · ESP32 + SMAP</span>
        </div>
        <p className="mb-2 text-[11px] text-fog-400">Above ~85% saturation, additional rain converts almost entirely to runoff.</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={soilData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={5} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[30, 100]} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 10.5, color: '#8ca3bf' }} iconType="plainline" />
              {topRisk.map((v, i) => (
                <Line
                  key={v.id}
                  type="monotone"
                  dataKey={v.name}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="panel-title">Mandakini @ Chandrapuri gauge</h3>
          <span className="font-mono text-[10px] text-fog-500">CWC/India-WRIS · m</span>
        </div>
        <p className="mb-2 text-[11px] text-fog-400">
          Danger level {gauge?.dangerLevelM.toFixed(1)} m — breach triggers instant CRITICAL review.
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={riverData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gRiver" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={5} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 5.5]} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine
                y={gauge?.dangerLevelM ?? 4.6}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{ value: 'DANGER', fill: '#ef4444', fontSize: 10, position: 'right' }}
              />
              <Area type="monotone" dataKey="water" name="River level (m)" stroke="#38bdf8" strokeWidth={2} fill="url(#gRiver)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
