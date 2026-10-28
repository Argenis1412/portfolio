import { lazy, Suspense, useEffect } from 'react';
import Hero from '../components/hero/Hero';
import HomeEvidence from '../components/HomeEvidence';
import { scrollToSection } from '../utils/scrollToSection';

const About = lazy(() => import('../components/About'));
const Contact = lazy(() => import('../components/Contact'));
const FeaturedProjects = lazy(() => import('../components/FeaturedProjects'));

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
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedProjects />
        <HomeEvidence />
        <About />
        <Contact />
      </Suspense>
    </>
  );
}
