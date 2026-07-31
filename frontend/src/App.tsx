import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { LogProvider } from './context/LogContext';
import { ChaosModeProvider } from './context/ChaosContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProjectCasePage = lazy(() => import('./pages/ProjectCasePage'));
const DecisionPage = lazy(() => import('./pages/DecisionPage'));
const ProductionEvidencePage = lazy(() => import('./pages/ProductionEvidencePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const Footer = lazy(() => import('./components/Footer'));

const RouteFallback = () => (
  <div className="flex min-h-48 items-center justify-center text-xs font-mono tracking-widest text-app-muted">
    LOADING...
  </div>
);

function RouteShell() {
  return (
    <div className="min-h-screen pt-16 selection:bg-app-primary/30 selection:text-app-text transition-colors duration-300">
      <Navbar />
      <main>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LogProvider>
        <ChaosModeProvider>
          <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
              <BrowserRouter>
                <Routes>
                  <Route element={<RouteShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="projects/:projectId" element={<ProjectCasePage />} />
                    <Route path="decisions/:decisionId" element={<DecisionPage />} />
                    <Route path="production-evidence" element={<ProductionEvidencePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </LazyMotion>
          </MotionConfig>
        </ChaosModeProvider>
      </LogProvider>
    </ThemeProvider>
  );
}

export default App;
