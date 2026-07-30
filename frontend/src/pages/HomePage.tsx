import { lazy, Suspense, useEffect } from 'react';
import Hero from '../components/hero/Hero';
import { scrollToSection } from '../utils/scrollToSection';

const ArchitectureTradeoffs = lazy(() => import('../components/ArchitectureTradeoffs'));
const About = lazy(() => import('../components/About'));
const Experience = lazy(() => import('../components/Experience'));
const Contact = lazy(() => import('../components/Contact'));
const SocialRail = lazy(() => import('../components/SocialRail'));
const FeaturedProjects = lazy(() => import('../components/FeaturedProjects'));
const HiringSections = lazy(() => import('../components/HiringSections'));

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
        <SocialRail />
      </Suspense>
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedProjects />
        <HiringSections section="proof" />
        <ArchitectureTradeoffs />
        <HiringSections section="principles" />
        <Experience />
        <Contact />
        <About />
      </Suspense>
    </>
  );
}
