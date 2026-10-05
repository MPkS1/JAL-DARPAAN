import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, User } from '../types';
import { DEMO_USERS } from '../data/users';

const SESSION_KEY = 'jd_session_v1';

export type Cap =
  | 'view-dashboard'
  | 'view-villages'
  | 'view-alerts'
  | 'view-sensors'
  | 'view-analytics'
  | 'view-sources'
  | 'view-admin'
  | 'scenario'
  | 'alert-ack'
  | 'alert-issue'
  | 'alert-resolve';

/** Role × capability matrix — mirrors the production JWT claim design (docs/PLAN.md §4). */
export const CAP_MATRIX: Record<Cap, Role[]> = {
  'view-dashboard': ['national', 'state', 'district', 'field', 'village'],
  'view-villages': ['national', 'state', 'district', 'field', 'village'],
  'view-alerts': ['national', 'state', 'district', 'field', 'village'],
  'view-sensors': ['national', 'state', 'district', 'field'],
  'view-analytics': ['national', 'state', 'district'],
  'view-sources': ['national', 'state'],
  'view-admin': ['national'],
  scenario: ['national', 'state', 'district'],
  'alert-ack': ['national', 'state', 'district', 'field'],
  'alert-issue': ['national', 'state', 'district'],
  'alert-resolve': ['national', 'state'],
};

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  can: (cap: Cap) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const email = JSON.parse(raw) as string;
    return DEMO_USERS.find((u) => u.email === email) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadSession());

  const login = useCallback((email: string, password: string) => {
    const u = DEMO_USERS.find(
      (d) => d.email.toLowerCase() === email.trim().toLowerCase() && d.password === password,
    );
    if (!u) return { ok: false, error: 'Invalid credentials. Use a demo account chip below — judges never need to type.' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(u.email));
    setUser(u);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const can = useCallback(
    (cap: Cap) => (user ? CAP_MATRIX[cap].includes(user.role) : false),
    [user],
  );

  const value = useMemo(() => ({ user, login, logout, can }), [user, login, logout, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
