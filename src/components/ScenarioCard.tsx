import { CloudLightning, CloudRain, Lock, Sun, FlaskConical } from 'lucide-react';
import type { Scenario } from '../types';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { SCENARIO_META } from '../lib/simulation';

const ICONS: Record<Scenario, typeof Sun> = {
  normal: Sun,
  monsoon: CloudRain,
  cloudburst: CloudLightning,
};

export default function ScenarioCard() {
  const { scenario, setScenario } = useLive();
  const { can } = useAuth();

  if (!can('scenario')) {
    return (
      <div className="panel flex items-center gap-3 px-4 py-3">
        <Lock size={15} className="shrink-0 text-text-800" />
        <p className="text-[12.5px] text-text-800">
          Scenario drills are available to <span className="font-semibold text-text-900">National, State and District</span> roles.
          You can still monitor live risk, alerts and sensors.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={15} className="text-aqua-600" />
          <h3 className="panel-title">Scenario drill — control the weather</h3>
        </div>
        <span className="chip border-violet-400/50 bg-violet-50 text-violet-700 border-text-300 bg-surface-100 text-text-800">JUDGE DRILL MODE · SIMULATED</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(SCENARIO_META) as Scenario[]).map((s) => {
          const Icon = ICONS[s];
          const meta = SCENARIO_META[s];
          const active = scenario === s;
          return (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
                active
                  ? `${meta.chip} shadow-[0_0_20px_-4px_rgba(14,165,233,0.4)] ring-1 ring-surface-300`
                  : 'border-surface-300 bg-white text-text-800 hover:bg-surface-100 hover:text-text-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={s === 'cloudburst' && active ? 'text-red-600' : 'text-text-800'} />
                <span className="text-[13px] font-bold text-text-900">{meta.label}</span>
                {active && <span className="ml-auto text-[9.5px] font-bold uppercase tracking-wider text-text-800">running</span>}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-text-800">{meta.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
