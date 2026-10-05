import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CloudRainWind, Lock, MountainSnow, RadioTower, ShieldCheck, Siren, Waves } from 'lucide-react';
import { useAuth } from '../store/auth';
import { DEMO_USERS, ROLE_META } from '../data/users';

const FEATURES = [
  { icon: Waves, text: 'Fuses IMD · CWC · India-WRIS stations with GPM IMERG, SMAP & Sentinel-1 — free satellite feeds' },
  { icon: RadioTower, text: '₹1,500 ESP32 gap-filler nodes stream the exact production MQTT telemetry' },
  { icon: Siren, text: 'Village-level alerts 1–3 h ahead with arrival countdown, shelter & evacuation route' },
  { icon: ShieldCheck, text: 'Explainable AI — every alert shows WHY (SHAP-style) with 2-source confirmation' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const drops = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: (i * 37 + 11) % 100,
        delay: (i % 13) * 0.45,
        duration: 1.5 + ((i * 7) % 10) / 9,
        height: 40 + ((i * 13) % 50),
      })),
    [],
  );

  if (user) return <Navigate to="/" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(email, password);
    if (res.ok) {
      navigate('/');
    } else {
      setError(res.error ?? 'Login failed');
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <div className="relative grid min-h-full lg:grid-cols-2">
      {/* rain overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {drops.map((d) => (
          <span
            key={d.id}
            className="rain-drop"
            style={{
              left: `${d.left}%`,
              height: d.height,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* brand column */}
      <div className="relative z-10 hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-11 w-11">
            <path fill="#22d3ee" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 1 1-14 0c0-4 3.5-7.8 7-12z" />
            <path fill="#0ea5e9" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 0 1-7 7V2z" />
          </svg>
          <div>
            <div className="font-display text-[24px] font-bold leading-none tracking-wide">JAL-DARPAAN</div>
            <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-aqua-300/90">
              AI Guardian Against Hill Flash Floods
            </div>
          </div>
        </div>

        <div className="max-w-lg space-y-5">
          <h1 className="font-display text-[34px] font-bold leading-tight">
            Village-level flash flood warnings,{' '}
            <span className="text-aqua-300">1–3 hours before disaster strikes.</span>
          </h1>
          <div className="space-y-3.5">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-aqua-400/25 bg-aqua-500/10">
                  <f.icon size={15} className="text-aqua-300" />
                </span>
                <p className="text-[13px] leading-relaxed text-fog-300">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-fog-500">
          <span className="flex items-center gap-1.5"><MountainSnow size={13} className="text-aqua-400" /> Pilot: Rudraprayag, Uttarakhand (Mandakini valley)</span>
          <span className="flex items-center gap-1.5"><CloudRainWind size={13} className="text-aqua-400" /> SIH 2026 · PS 26192 · MHA/NDRF</span>
        </div>
      </div>

      {/* form column */}
      <div className="relative z-10 flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <svg viewBox="0 0 24 24" className="h-9 w-9">
              <path fill="#22d3ee" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 1 1-14 0c0-4 3.5-7.8 7-12z" />
              <path fill="#0ea5e9" d="M12 2c3.5 4.2 7 8 7 12a7 7 0 0 1-7 7V2z" />
            </svg>
            <div>
              <div className="font-display text-[20px] font-bold leading-none tracking-wide">JAL-DARPAAN</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-aqua-300/90">
                Hill flash flood early warning
              </div>
            </div>
          </div>

          <div className="panel p-6 sm:p-7">
            <h2 className="font-display text-[20px] font-bold">Operations sign-in</h2>
            <p className="mt-1 text-[12.5px] text-fog-400">
              Role-based access — National → State → District → Field → Village, mirroring the production JWT + RBAC design.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="email" className="metric-label mb-1.5 block">Official e-mail</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="national@jaldarpaan.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="password" className="metric-label mb-1.5 block">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div key={shakeKey} className="animate-shake flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-[12.5px] text-red-300">
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full">
                Sign in to Command Center <ArrowRight size={16} />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">
              <span className="h-px flex-1 bg-white/10" /> one-click demo logins <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2">
              {DEMO_USERS.map((u) => {
                const meta = ROLE_META[u.role];
                return (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(u.password);
                      setError(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition hover:bg-white/[0.06] ${meta.color}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-fog-100">{meta.label}</span>
                      <span className="block truncate font-mono text-[11px] text-fog-400">{u.email}</span>
                    </span>
                    <ArrowRight size={14} className="shrink-0 opacity-70" />
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-fog-500">
              All demo accounts use password <span className="font-mono text-fog-300">Demo@1234</span> — chips auto-fill both fields.
            </p>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-fog-500">
            “Government already spent crores on these stations — JAL-DARPAAN makes them save lives.”
          </p>
        </div>
      </div>
    </div>
  );
}
