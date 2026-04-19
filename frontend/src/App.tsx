import React, { Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { ThemeProvider } from './context/ThemeContext';
import { LogProvider } from './context/LogContext';
import { LazyMotion, domAnimation } from 'framer-motion';

// Above-fold critical path (eager)
const SystemStatusBanner = React.lazy(() => import('./components/SystemStatusBanner'));
const LiveMetricsBento   = React.lazy(() => import('./components/LiveMetricsBento'));

// Operational sections
const ChaosPlayground = React.lazy(() => import('./components/ChaosPlayground'));
const TraceViewer     = React.lazy(() => import('./components/TraceViewer'));
const LogStream       = React.lazy(() => import('./components/LogStream'));

// Info sections

const About           = React.lazy(() => import('./components/About'));
const Experience      = React.lazy(() => import('./components/Experience'));
const Philosophy      = React.lazy(() => import('./components/Philosophy'));
const Projects        = React.lazy(() => import('./components/Projects'));
const Contact         = React.lazy(() => import('./components/Contact'));
const ServerWakeupNotice = React.lazy(() => import('./components/ServerWakeupNotice'));
const Footer          = React.lazy(() => import('./components/Footer'));

const SectionFallback = () => (
  <div className="h-24 w-full flex items-center justify-center text-app-muted text-xs opacity-40 tracking-widest font-mono animate-pulse">
    LOADING...
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <LogProvider>
        <LazyMotion features={domAnimation}>
          <div className="min-h-screen flex flex-col pt-16 selection:bg-app-primary/30 selection:text-app-text transition-colors duration-300">
            <Navbar />

            {/* System Status Banner — appears only when degraded/down */}
            <Suspense fallback={null}>
              <SystemStatusBanner />
            </Suspense>

            <main className="flex-grow">
              {/* 1 — Hero: KPI strip above the fold */}
              <Hero />

              <Suspense fallback={<SectionFallback />}>

                {/* 2 — About: bio + photo + links */}
                <About />

                {/* 3 — Live Metrics: tiles + sparkline */}
                <LiveMetricsBento />

                {/* 4 — Chaos Playground: control panel */}
                <ChaosPlayground />

                {/* 5 — Trace Viewer: per-request waterfall */}
                <TraceViewer />

                {/* 6 — Log Stream: terminal event stream */}
                <LogStream />


                {/* 8 — Experience + Education */}
                <Experience />

                {/* 9 — Philosophy (below the fold, secondary) */}
                <Philosophy />

                {/* 10 — Projects */}
                <Projects />

                {/* 11 — Contact */}
                <Contact />

                {/* Server wakeup notice (cold start UX) */}
                <ServerWakeupNotice />
              </Suspense>
            </main>

            <Suspense fallback={null}>
              <Footer />
            </Suspense>
          </div>
        </LazyMotion>
      </LogProvider>
    </ThemeProvider>
  );
}

export default App;
