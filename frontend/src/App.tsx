import React, { Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { ThemeProvider } from './context/ThemeContext';
import { LazyMotion, domAnimation } from 'framer-motion';

const LiveMetricsBento = React.lazy(() => import('./components/LiveMetricsBento'));
const ChaosPlayground = React.lazy(() => import('./components/ChaosPlayground'));
const ServerWakeupNotice = React.lazy(() => import('./components/ServerWakeupNotice'));
const Skills = React.lazy(() => import('./components/Skills'));
const Projects = React.lazy(() => import('./components/Projects'));
const Experience = React.lazy(() => import('./components/Experience'));
const Contact = React.lazy(() => import('./components/Contact'));
const Footer = React.lazy(() => import('./components/Footer'));

function App() {
  return (
    <ThemeProvider>
      <LazyMotion features={domAnimation}>
        <div className="min-h-screen flex flex-col pt-16 selection:bg-app-primary/30 selection:text-app-text transition-colors duration-300">
          <Navbar />
          <main className="flex-grow">
            <Hero />
            
            <Suspense fallback={<div className="h-24 w-full flex items-center justify-center text-app-muted text-sm opacity-50 tracking-widest mt-12 animate-pulse">CARGANDO...</div>}>
              <LiveMetricsBento />
              <ChaosPlayground />
              <Skills />
              <Projects />
              <Experience />
              <Contact />
              <ServerWakeupNotice />
            </Suspense>
          </main>
          
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </div>
      </LazyMotion>
    </ThemeProvider>
  );
}

export default App;
