import { Link } from 'react-router-dom';
import { BatteryLow, MapPinOff, RadioTower, Signal, Wifi, WifiOff } from 'lucide-react';
import { useLive } from '../store/live';
import { VILLAGES } from '../data/villages';
import { timeAgo } from '../lib/format';
import MqttInspector from '../components/MqttInspector';

const TOPIC = (code: string) => `jaldarpaan/telemetry/${code}`;

export default function Sensors() {
  const { villagesLive, alerts } = useLive();

  const nodes = VILLAGES.filter((v) => v.nodeId);
  const gap = VILLAGES.filter((v) => !v.nodeId);
  const online = nodes.filter((v) => villagesLive[v.id]?.nodeStatus === 'online');
  const offline = nodes.filter((v) => villagesLive[v.id]?.nodeStatus === 'offline');
  const lowBatt = nodes.filter((v) => villagesLive[v.id]?.nodeStatus === 'low-battery');
  const batteries = nodes.map((v) => villagesLive[v.id]?.batteryPct ?? 0).filter((b) => b > 0);
  const avgBattery = batteries.length ? batteries.reduce((s, b) => s + b, 0) / batteries.length : 0;

  const kpis = [
    { icon: Wifi, label: 'Nodes online', value: `${online.length}/${nodes.length}`, sub: 'MQTT :1883 · QoS 1', accent: 'text-emerald-300', ring: 'border-emerald-400/25 bg-emerald-500/10' },
    { icon: WifiOff, label: 'Offline', value: String(offline.length), sub: 'comms dropout drill', accent: 'text-red-300', ring: 'border-red-400/30 bg-red-500/10' },
    { icon: BatteryLow, label: 'Low battery', value: String(lowBatt.length), sub: 'solar underpower drill', accent: 'text-amber-300', ring: 'border-amber-400/25 bg-amber-500/10' },
    { icon: Signal, label: 'Avg battery', value: `${Math.round(avgBattery)} %`, sub: 'solar + Li-ion nodes', accent: 'text-aqua-300', ring: 'border-aqua-400/25 bg-aqua-500/10' },
    { icon: MapPinOff, label: 'Gap villages', value: String(gap.length), sub: 'planned ₹1,500 nodes', accent: 'text-fog-300', ring: 'border-white/12 bg-white/[0.05]' },
  ];

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <RadioTower size={16} className="text-emerald-300" />
          <h2 className="font-display text-[16px] font-bold">Sensor network · ESP32 + MQTT</h2>
        </div>
        <p className="text-[11.5px] text-fog-400">
          Health monitoring with seeded failure cases — the platform degrades gracefully to satellite feeds when a node drops.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((s) => (
          <div key={s.label} className="panel flex items-center gap-3 p-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${s.ring}`}>
              <s.icon size={19} className={s.accent} />
            </div>
            <div className="min-w-0">
              <div className="metric-label">{s.label}</div>
              <div className={`metric-num text-[22px] leading-tight ${s.accent}`}>{s.value}</div>
              <div className="truncate text-[11px] text-fog-400">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="panel overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h3 className="panel-title">Node fleet · {nodes.length} deployed</h3>
            <span className="font-mono text-[10.5px] text-fog-500">telemetry every tick · store cadence 4 s</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-white/8">
                <tr>
                  <th className="table-head">Node / topic</th>
                  <th className="table-head">Village</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Battery</th>
                  <th className="table-head">Signal</th>
                  <th className="table-head">Last packet</th>
                  <th className="table-head">Open alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {nodes.map((v) => {
                  const l = villagesLive[v.id];
                  if (!l) return null;
                  const openAlert = alerts.find((a) => a.villageId === v.id && a.status === 'ACTIVE');
                  const batt = l.batteryPct ?? 0;
                  const battColor = batt > 50 ? 'bg-emerald-400' : batt > 25 ? 'bg-amber-400' : 'bg-red-400';
                  const statusChip =
                    l.nodeStatus === 'online'
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : l.nodeStatus === 'low-battery'
                        ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                        : 'border-red-400/40 bg-red-500/15 text-red-300';
                  return (
                    <tr key={v.id} className="hover:bg-white/[0.03]">
                      <td className="table-cell">
                        <div className="font-mono text-[12px] text-aqua-300">{v.nodeId}</div>
                        <div className="font-mono text-[10px] text-fog-500">{TOPIC(v.code)}</div>
                      </td>
                      <td className="table-cell">
                        <Link to={`/villages/${v.id}`} className="font-semibold text-fog-100 hover:text-aqua-300">{v.name}</Link>
                        <div className="text-[10.5px] text-fog-500">{v.elevationM} m · {v.riverName}</div>
                      </td>
                      <td className="table-cell"><span className={`chip ${statusChip}`}>{l.nodeStatus.toUpperCase()}</span></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${battColor}`} style={{ width: `${Math.max(4, batt)}%` }} />
                          </div>
                          <span className="font-mono text-[11.5px] text-fog-300 tabular">{Math.round(batt)}%</span>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-[12px] text-fog-300 tabular">{l.signalDbm ?? '—'} dBm</td>
                      <td className="table-cell text-[12px] text-fog-400">{l.nodeStatus === 'offline' ? 'no data (drop-out)' : timeAgo(l.updatedAt)}</td>
                      <td className="table-cell">
                        {openAlert ? (
                          <span className={`chip ${openAlert.severity === 'CRITICAL' ? 'border-red-400/40 bg-red-500/15 text-red-300' : openAlert.severity === 'WARNING' ? 'border-orange-400/40 bg-orange-500/15 text-orange-300' : 'border-yellow-400/40 bg-yellow-500/15 text-yellow-300'}`}>
                            {openAlert.severity}
                          </span>
                        ) : (
                          <span className="text-[11px] text-fog-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 xl:col-span-2">
          <MqttInspector />
          <div className="panel p-4">
            <h3 className="panel-title mb-2">Coverage gaps · planned nodes</h3>
            <p className="mb-2.5 text-[11.5px] leading-relaxed text-fog-400">
              These villages have no station or node nearby — risk runs on satellite + terrain only until a ₹1,500 ESP32 node is installed:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {gap.map((v) => (
                <Link
                  key={v.id}
                  to={`/villages/${v.id}`}
                  className="chip border-white/12 bg-white/[0.04] text-fog-300 hover:text-aqua-300"
                >
                  {v.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
