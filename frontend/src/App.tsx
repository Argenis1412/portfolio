import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { HomeRouteSkeleton } from './components/ui/HomeLoadingSkeleton';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProjectCasePage = lazy(() => import('./pages/ProjectCasePage'));
const DecisionPage = lazy(() => import('./pages/DecisionPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const Footer = lazy(() => import('./components/Footer'));

function RouteFallback() {
  if (useLocation().pathname === '/') return <HomeRouteSkeleton />;
  return <div role="status" aria-busy="true" className="flex min-h-48 items-center justify-center text-xs font-mono tracking-widest text-app-muted">LOADING...</div>;
}

function RouteShell() {
  const isHome = useLocation().pathname === '/';

  return (
    <div className={`${isHome ? 'home-page ' : ''}min-h-screen pt-16 selection:bg-app-primary/30 selection:text-app-text transition-colors duration-300`}>
      <Navbar />
      <main>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer compact={isHome} />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>
          <BrowserRouter>
            <Routes>
              <Route element={<RouteShell />}>
                <Route index element={<HomePage />} />
                <Route path="projects/:projectId" element={<ProjectCasePage />} />
                <Route path="decisions/:decisionId" element={<DecisionPage />} />
                <Route path="production-evidence" element={<Navigate to="/projects/portfolio-api" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </LazyMotion>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
