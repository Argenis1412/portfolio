import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { scrollToSection } from '../../utils/scrollToSection';

export default function Hero() {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section id="hero" className="home-container home-hero">
      <div className="max-w-4xl">
        <p className="mb-4 text-base text-app-muted">{t('home.intro.role')}</p>
        <h1 ref={headingRef} tabIndex={-1}>{t('home.intro.title')}</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-app-muted sm:text-lg">{t('home.intro.body')}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
          <button onClick={() => scrollToSection('projects')} className="home-button">
            {t('hero.view_projects')}
          </button>
          <Link to="/production-evidence" className="home-link text-app-text">{t('home.intro.system')}</Link>
        </div>
      </div>
    </section>
  );
}
