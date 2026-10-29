import { lazy, Suspense, useEffect } from 'react';
import Hero from '../components/hero/Hero';
import { scrollToSection } from '../utils/scrollToSection';
import { HomeSectionSkeleton } from '../components/ui/HomeLoadingSkeleton';
import FeaturedProjects from '../components/FeaturedProjects';

let aboutModule: Promise<typeof import('../components/About')> | undefined;
let contactModule: Promise<typeof import('../components/Contact')> | undefined;
const loadAbout = () => aboutModule ??= import('../components/About');
const loadContact = () => contactModule ??= import('../components/Contact');
const About = lazy(loadAbout);
const Contact = lazy(loadContact);

export default function HomePage() {
  useEffect(() => {
    // Warm both independent boundaries, reusing the promises read by React.lazy.
    void loadAbout();
    void loadContact();
  }, []);

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
      <FeaturedProjects />
      <Suspense fallback={<HomeSectionSkeleton section="about" />}>
        <About />
      </Suspense>
      <Suspense fallback={<HomeSectionSkeleton section="contact" />}>
        <Contact />
      </Suspense>
    </>
  );
}
