import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/auth';
import { LiveProvider } from './store/live';
import Shell from './components/Shell';
import Restricted from './components/Restricted';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Villages from './pages/Villages';
import VillageDetail from './pages/VillageDetail';
import Alerts from './pages/Alerts';
import Sensors from './pages/Sensors';
import Analytics from './pages/Analytics';
import Sources from './pages/Sources';
import Admin from './pages/Admin';
import type { Cap } from './store/auth';

function Protected() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Shell />;
}

/** Wraps a page with its capability check (deep-link defence; nav already hides gated pages). */
function Gated({ cap, children }: { cap: Cap; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(cap)) {
    return (
      <Restricted
        cap={cap}
        title={cap === 'view-admin' ? 'National Command only' : 'Your role cannot open this page'}
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <LiveProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/villages" element={<Villages />} />
              <Route path="/villages/:id" element={<VillageDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route
                path="/sensors"
                element={
                  <Gated cap="view-sensors">
                    <Sensors />
                  </Gated>
                }
              />
              <Route
                path="/analytics"
                element={
                  <Gated cap="view-analytics">
                    <Analytics />
                  </Gated>
                }
              />
              <Route
                path="/sources"
                element={
                  <Gated cap="view-sources">
                    <Sources />
                  </Gated>
                }
              />
              <Route
                path="/admin"
                element={
                  <Gated cap="view-admin">
                    <Admin />
                  </Gated>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LiveProvider>
    </AuthProvider>
  );
}
