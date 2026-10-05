import { useMemo } from 'react';
import { Radio, TerminalSquare } from 'lucide-react';
import { useLive } from '../store/live';
import { VILLAGES } from '../data/villages';
import { makeMqttPacket } from '../lib/simulation';

export default function MqttInspector() {
  const { villagesLive, tick } = useLive();

  const packet = useMemo(() => {
    const candidates = VILLAGES.filter((v) => {
      const l = villagesLive[v.id];
      return l && (l.nodeStatus === 'online' || l.nodeStatus === 'low-battery');
    });
    if (!candidates.length) return null;
    const v = candidates[tick % candidates.length];
    return makeMqttPacket(v, villagesLive[v.id]);
  }, [villagesLive, tick]);

  if (!packet) return null;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalSquare size={15} className="text-emerald-300" />
          <h3 className="panel-title">MQTT telemetry · live inspector</h3>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-emerald-300">
          <Radio size={11} className="live-dot" /> mosquitto :1883
        </span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="chip border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
            topic: jaldarpaan/telemetry/{packet.village_code}
          </span>
          <span className="text-fog-500">QoS 1 · retained=false · packet #{1000 + tick}</span>
        </div>
        <pre className="overflow-x-auto rounded-xl border border-emerald-400/15 bg-[#04120c] p-3.5 font-mono text-[12px] leading-relaxed text-emerald-200">
{JSON.stringify(packet, null, 2)}
        </pre>
        <p className="mt-2 text-[11px] leading-relaxed text-fog-400">
          This is the <span className="font-semibold text-fog-200">exact production ESP32 payload</span> defined in the proposal —
          the simulator and real ₹1,500 nodes emit identical JSON, so hardware plugs in with <span className="text-aqua-300">zero code change</span>.
        </p>
      </div>
    </div>
  );
}
