import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Brain, Database, LayoutGrid, LogOut, Map, RadioTower, Siren, Users,
} from 'lucide-react';
import type { Cap } from '../store/auth';
import { useAuth } from '../store/auth';
import { useLive } from '../store/live';
import { ROLE_META } from '../data/users';
import { fmtClock, timeAgo } from '../lib/format';

const NAV: { to: string; label: string; icon: typeof LayoutGrid; cap: Cap; end?: boolean }[] = [
  { to: '/', label: 'Command Center', icon: LayoutGrid, cap: 'view-dashboard', end: true },
  { to: '/villages', label: 'Villages', icon: Map, cap: 'view-villages' },
  { to: '/alerts', label: 'Alerts', icon: Siren, cap: 'view-alerts' },
  { to: '/sensors', label: 'Sensor Network', icon: RadioTower, cap: 'view-sensors' },
  { to: '/analytics', label: 'AI & Analytics', icon: Brain, cap: 'view-analytics' },
  { to: '/sources', label: 'Data Sources', icon: Database, cap: 'view-sources' },
  { to: '/admin', label: 'User Management', icon: Users, cap: 'view-admin' },
];

function IstClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const h = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(h);
  }, []);
  return <span className="font-mono text-[12px] text-fog-300 tabular">{fmtClock(now)} IST</span>;
}

export default function Shell() {
  const { user, logout, can } = useAuth();
  const { lastRefresh, alerts } = useLive();
  const navigate = useNavigate();
  if (!user) return null;

  const roleMeta = ROLE_META[user.role];
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="flex min-h-full">
      {/* ---- sidebar ---- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/8 bg-ink-900/80 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0">
            <path fill="#22d3ee" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 1 1-14 0c0-4 3.5-7.8 7-12z" />
            <path fill="#0ea5e9" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 0 1-7 7V2z" />
          </svg>
          <div className="min-w-0">
            <div className="font-display text-[16px] font-bold leading-tight tracking-wide text-fog-100">JAL-DARPAAN</div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-aqua-300/80">Hill flash flood EWS</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((n) => can(n.cap)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                  isActive
                    ? 'bg-aqua-500/15 text-aqua-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]'
                    : 'text-fog-400 hover:bg-white/[0.05] hover:text-fog-100'
                }`
              }
            >
              <n.icon size={16} className="shrink-0" />
              {n.label}
              {n.to === '/alerts' && activeAlerts > 0 && (
                <span className="ml-auto rounded-full bg-red-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-300">
                  {activeAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-4 rounded-xl border p-3 ${roleMeta.color}`}>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">{roleMeta.label}</div>
          <div className="mt-0.5 truncate text-[13px] font-bold text-fog-100">{user.name}</div>
          <div className="truncate text-[11px] text-fog-400">{user.posting}</div>
        </div>
        <button
          className="btn-ghost mt-2 !justify-start !py-2 !text-[12px] !text-fog-400"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
        <div className="mt-3 text-[9.5px] leading-relaxed text-fog-500">
          PS 26192 · Team BhushaktiAI<br />Demo build · simulated feeds
        </div>
      </aside>

      {/* ---- main ---- */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-white/8 bg-ink-950/85 px-4 py-2.5 backdrop-blur-md">
          <span className="flex items-center gap-2 font-display text-[15px] font-bold tracking-wide text-fog-100 lg:hidden">
            JAL-DARPAAN
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-emerald-300">
            <span className="live-dot text-[9px]">●</span> LIVE · store synced {timeAgo(lastRefresh)}
          </span>
          <IstClock />
          <span className="ml-auto flex items-center gap-2">
            <span className={`chip hidden sm:inline-flex ${roleMeta.color}`}>{roleMeta.label}</span>
            <span className="text-[12px] font-semibold text-fog-300">{user.name}</span>
            <button
              className="btn-ghost !px-2.5 !py-1.5 !text-[11px] lg:hidden"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={13} />
            </button>
          </span>
        </header>

        {/* mobile nav */}
        <nav className="flex gap-1.5 overflow-x-auto border-b border-white/8 bg-ink-900/60 px-3 py-2 lg:hidden">
          {NAV.filter((n) => can(n.cap)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                  isActive ? 'bg-aqua-500/15 text-aqua-300' : 'text-fog-400 hover:text-fog-100'
                }`
              }
            >
              <n.icon size={13} /> {n.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[1500px] p-3 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
