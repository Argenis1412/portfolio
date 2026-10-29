import { lazy, Suspense, useEffect } from 'react';
import Hero from '../components/hero/Hero';
import { scrollToSection } from '../utils/scrollToSection';
import { HomeSectionSkeleton, ProjectsSectionSkeleton } from '../components/ui/HomeLoadingSkeleton';

const About = lazy(() => import('../components/About'));
const Contact = lazy(() => import('../components/Contact'));
const FeaturedProjects = lazy(() => import('../components/FeaturedProjects'));

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
      <Suspense fallback={<ProjectsSectionSkeleton />}>
        <FeaturedProjects />
      </Suspense>
      <Suspense fallback={<HomeSectionSkeleton section="about" />}>
        <About />
      </Suspense>
      <Suspense fallback={<HomeSectionSkeleton section="contact" />}>
        <Contact />
      </Suspense>
    </>
  );
}
