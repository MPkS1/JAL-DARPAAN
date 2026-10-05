import { useEffect, useState } from 'react';
import { Lock, MousePointerClick } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { VILLAGES } from '../data/villages';
import { BANDS } from '../lib/risk';
import KpiRow from '../components/KpiRow';
import MapPanel from '../components/MapPanel';
import VillagePanel from '../components/VillagePanel';
import ScenarioCard from '../components/ScenarioCard';
import ChartsRow from '../components/ChartsRow';
import AlertFeed from '../components/AlertFeed';
import MqttInspector from '../components/MqttInspector';

function Ticker() {
  const { villagesLive } = useLive();
  const make = (suffix: string) =>
    VILLAGES.map((v) => {
      const l = villagesLive[v.id];
      const meta = l ? BANDS[l.band] : null;
      return (
        <span key={`${v.id}-${suffix}`} className="flex items-center gap-1.5 whitespace-nowrap px-3 font-mono text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta?.hex ?? '#64789a' }} />
          <span className="text-fog-300">{v.name}</span>
          <span style={{ color: meta?.hex ?? '#64789a' }}>{l ? `${l.score.toFixed(0)} ${l.band}` : '—'}</span>
          <span className="text-aqua-300/80">{l ? `${l.rainMmHr.toFixed(1)} mm/h` : ''}</span>
          <span className="px-2 text-fog-500">|</span>
        </span>
      );
    });

  return (
    <div className="panel overflow-hidden py-2" title="Live village risk ticker">
      <div className="marquee-track">
        {make('a')}
        {make('b')}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { villagesLive, alerts } = useLive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const ownVillageId = user?.role === 'village' ? user.scopeVillageId ?? null : null;

  // Village-pradhan view: focus own village automatically
  useEffect(() => {
    if (ownVillageId) setSelectedId(ownVillageId);
  }, [ownVillageId]);

  const handleSelect = (id: string) => {
    if (ownVillageId && id !== ownVillageId) {
      setLocked(true);
      return;
    }
    setLocked(false);
    setSelectedId(id);
  };

  const selected = selectedId ? VILLAGES.find((v) => v.id === selectedId) ?? null : null;
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalAlerts = alerts.filter((a) => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length;

  const ownVillage = ownVillageId ? VILLAGES.find((v) => v.id === ownVillageId) : undefined;

  return (
    <div className="space-y-3">
      <Ticker />
      <KpiRow villages={VILLAGES} live={villagesLive} activeAlerts={activeAlerts} criticalAlerts={criticalAlerts} />
      <ScenarioCard />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <MapPanel live={villagesLive} selectedId={selectedId} onSelect={handleSelect} />
        </div>
        <div className="xl:col-span-2">
          {locked ? (
            <div className="panel flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
              <Lock size={28} className="text-amber-300" />
              <h3 className="panel-title">Outside your panchayat scope</h3>
              <p className="max-w-sm text-[12.5px] leading-relaxed text-fog-300">
                As <span className="font-semibold text-fog-100">Village Pradhan</span> you have drill-down access to your own
                village{ownVillage ? <span className="text-aqua-300"> “{ownVillage.name}”</span> : null} only. District and state
                officers see every village — ask your DDMA officer for escalation.
              </p>
              {ownVillage && (
                <button className="btn-primary !py-2 !text-[12.5px]" onClick={() => { setLocked(false); setSelectedId(ownVillage.id); }}>
                  Back to {ownVillage.name}
                </button>
              )}
            </div>
          ) : selected ? (
            <VillagePanel village={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="panel flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
              <MousePointerClick size={28} className="text-aqua-300" />
              <h3 className="panel-title">Village drill-down</h3>
              <p className="max-w-sm text-[12.5px] leading-relaxed text-fog-300">
                Click any village marker on the 2D map — or switch to <span className="font-semibold text-fog-100">3D terrain</span> for
                the satellite flyover — to open live climate, sensors, WHY explanation, arrival countdown and the evacuation card.
              </p>
            </div>
          )}
        </div>
      </div>

      <ChartsRow villages={VILLAGES} live={villagesLive} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <AlertFeed limit={6} />
        </div>
        <div className="xl:col-span-2">
          <MqttInspector />
        </div>
      </div>
    </div>
  );
}
