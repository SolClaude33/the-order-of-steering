import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { StoreProvider } from './lib/store';
import { AuthProvider } from './lib/auth';

const MissionApp = lazy(() => import('./pages/MissionApp'));
export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = location.pathname.startsWith('/app')
      ? 'Missions | The Order of Steering'
      : 'The Order of Steering';
  }, [location.pathname]);
  useEffect(() => {
    if (!location.hash) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      if (['main-content', 'app-main'].includes(target.id)) target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/app/*"
        element={
          <AuthProvider>
            <StoreProvider>
              <Suspense
                fallback={
                  <div className="app-loading">
                    <div />
                    <span>Opening the Order…</span>
                  </div>
                }
              >
                <MissionApp />
              </Suspense>
            </StoreProvider>
          </AuthProvider>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
