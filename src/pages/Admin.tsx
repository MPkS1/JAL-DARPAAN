import { Check, KeyRound, Minus, Users } from 'lucide-react';
import type { Role } from '../types';
import { CAP_MATRIX } from '../store/auth';
import type { Cap } from '../store/auth';
import { useAuth } from '../store/auth';
import { DEMO_USERS, DIRECTORY_ONLY, ROLE_META } from '../data/users';
import { VILLAGES } from '../data/villages';
import { DATA_SOURCES } from '../data/sources';

const CAPS: { cap: Cap; label: string }[] = [
  { cap: 'view-dashboard', label: 'Command Center (map 2D/3D, KPIs, charts)' },
  { cap: 'view-villages', label: 'Village drill-down / detail pages' },
  { cap: 'view-alerts', label: 'Alerts — view feed' },
  { cap: 'alert-ack', label: 'Alerts — acknowledge' },
  { cap: 'alert-issue', label: 'Alerts — issue evacuation advisory' },
  { cap: 'alert-resolve', label: 'Alerts — resolve / close' },
  { cap: 'scenario', label: 'Scenario drills (monsoon / cloudburst)' },
  { cap: 'view-sensors', label: 'Sensor Network page' },
  { cap: 'view-analytics', label: 'AI & Analytics page' },
  { cap: 'view-sources', label: 'Data Sources page' },
  { cap: 'view-admin', label: 'User Management page' },
];

const ROLES: Role[] = ['national', 'state', 'district', 'field', 'village'];

export default function Admin() {
  const { user } = useAuth();
  const nodes = VILLAGES.filter((v) => v.nodeId).length;

  const coverage = [
    { label: 'Districts piloted', value: '1', sub: 'Rudraprayag, Uttarakhand' },
    { label: 'Villages registered', value: String(VILLAGES.length), sub: '30 m micro-watersheds' },
    { label: 'ESP32 nodes live', value: String(nodes), sub: 'exact production payload' },
    { label: 'Data feeds fused', value: String(DATA_SOURCES.length), sub: 'open + MoU adapters' },
    { label: 'Roles enforced', value: '5', sub: 'JWT-shaped demo session' },
  ];

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-violet-300" />
          <h2 className="font-display text-[16px] font-bold">User management · National Command only</h2>
        </div>
        <p className="text-[11.5px] text-fog-400">
          Mirrors the production design: <span className="font-mono text-fog-200">POST /auth/login → JWT role claims</span> enforced on every API route and UI action.
        </p>
      </div>

      {/* capability matrix */}
      <div className="panel overflow-hidden">
        <div className="border-b border-white/8 px-4 py-3">
          <h3 className="panel-title">Role × capability matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="table-head">Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className={`table-head text-center ${user?.role === r ? 'text-aqua-300' : ''}`}>
                    {ROLE_META[r].label}
                    {user?.role === r && <div className="text-[9px] font-normal normal-case tracking-normal text-fog-500">your role</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {CAPS.map(({ cap, label }) => (
                <tr key={cap} className="hover:bg-white/[0.03]">
                  <td className="table-cell">{label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="table-cell text-center">
                      {CAP_MATRIX[cap].includes(r) ? (
                        <Check size={15} className="mx-auto text-emerald-300" />
                      ) : (
                        <Minus size={14} className="mx-auto text-fog-500 opacity-60" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* demo logins */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h3 className="panel-title flex items-center gap-2"><KeyRound size={14} className="text-amber-300" /> Login-enabled demo accounts</h3>
            <span className="font-mono text-[10.5px] text-fog-500">password Demo@1234</span>
          </div>
          <div className="divide-y divide-white/6">
            {DEMO_USERS.map((u) => (
              <div key={u.email} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-fog-100">{u.name}</span>
                    <span className={`chip ${ROLE_META[u.role].color}`}>{ROLE_META[u.role].label}</span>
                  </div>
                  <div className="text-[11.5px] text-fog-400">{u.org} · {u.posting}</div>
                </div>
                <span className="font-mono text-[11px] text-aqua-300">{u.email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* directory */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h3 className="panel-title">Officer directory (provisioned, not demo-login)</h3>
            <span className="font-mono text-[10.5px] text-fog-500">{DIRECTORY_ONLY.length} entries</span>
          </div>
          <div className="divide-y divide-white/6">
            {DIRECTORY_ONLY.map((u) => (
              <div key={u.email} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-fog-100">{u.name}</span>
                    <span className={`chip ${ROLE_META[u.role].color}`}>{ROLE_META[u.role].label}</span>
                  </div>
                  <div className="text-[11.5px] text-fog-400">{u.org} · {u.posting}</div>
                </div>
                <span className="font-mono text-[11px] text-fog-400">{u.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* coverage */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {coverage.map((c) => (
          <div key={c.label} className="panel p-4">
            <div className="metric-label">{c.label}</div>
            <div className="metric-num mt-1 text-[24px] leading-tight text-aqua-300">{c.value}</div>
            <div className="mt-0.5 text-[11px] text-fog-400">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
