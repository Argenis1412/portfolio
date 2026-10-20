import { useEffect, useRef } from 'react';
import { Github } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { scrollToSection } from '../../utils/scrollToSection';

export default function Hero() {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section id="hero" className="home-container py-10 sm:py-14">
      <div className="max-w-4xl">
        <p className="mb-4 text-xs font-mono uppercase tracking-[0.24em] text-app-primary">{t('hero.eyebrow')}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-bold leading-[1.15] tracking-tight text-app-text sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-app-muted sm:text-lg">{t('hero.subtitle')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => scrollToSection('projects')} className="rounded-lg bg-app-primary px-5 py-3 text-sm font-semibold text-app-primary-text transition-colors hover:bg-app-primary-hover">
            {t('hero.view_projects')}
          </button>
          <a href="https://github.com/Argenis1412" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-app-border px-5 py-3 text-sm font-semibold text-app-text transition-colors hover:border-app-primary hover:text-app-primary">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
