import { lazy, Suspense } from 'react';
import Hero from '../components/hero/Hero';
import SystemStatusBanner from '../components/SystemStatusBanner';
import LiveMetricsBento from '../components/LiveMetricsBento';

const ChaosPlayground = lazy(() => import('../components/ChaosPlayground'));
const ArchitectureTradeoffs = lazy(() => import('../components/ArchitectureTradeoffs'));
const TraceViewer = lazy(() => import('../components/TraceViewer'));
const LogStream = lazy(() => import('../components/LogStream'));
const FeaturedIncident = lazy(() => import('../components/FeaturedIncident'));
const ChaosModeBanner = lazy(() => import('../components/ChaosModeBanner'));
const DecisionProcessor = lazy(() => import('../components/DecisionProcessor'));
const About = lazy(() => import('../components/About'));
const Experience = lazy(() => import('../components/Experience'));
const Projects = lazy(() => import('../components/Projects'));
const Contact = lazy(() => import('../components/Contact'));
const ServerWakeupNotice = lazy(() => import('../components/ServerWakeupNotice'));
const SocialRail = lazy(() => import('../components/SocialRail'));

const SectionFallback = () => (
  <div className="flex h-24 w-full items-center justify-center text-xs font-mono tracking-widest text-app-muted opacity-40 animate-pulse">
    LOADING...
  </div>
);

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <ChaosModeBanner />
      </Suspense>
      <Suspense fallback={null}>
        <DecisionProcessor />
      </Suspense>
      <Suspense fallback={null}>
        <SocialRail />
      </Suspense>
      <SystemStatusBanner />
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <About />
        <LiveMetricsBento />
        <ArchitectureTradeoffs />
        <ChaosPlayground />
        <TraceViewer />
        <LogStream />
        <FeaturedIncident />
        <Experience />
        <Projects />
        <Contact />
        <ServerWakeupNotice />
      </Suspense>
    </>
  );
}
