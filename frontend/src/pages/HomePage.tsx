import { lazy, Suspense, useEffect } from 'react';
import Hero from '../components/hero/Hero';
import SystemStatusBanner from '../components/SystemStatusBanner';
import LiveMetricsBento from '../components/LiveMetricsBento';
import { scrollToSection } from '../utils/scrollToSection';

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
  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;

    let attempts = 0;
    let timer: number | undefined;
    const scrollToHashSection = () => {
      if (document.getElementById(sectionId)) {
        scrollToSection(sectionId);
        return;
      }

      if (attempts < 20) {
        attempts += 1;
        timer = window.setTimeout(scrollToHashSection, 50);
      }
    };

    scrollToHashSection();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

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
