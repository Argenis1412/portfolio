import { m, useReducedMotion } from 'framer-motion';
import { Github } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { scrollToSection } from '../../utils/scrollToSection';

export default function Hero() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const animation = reducedMotion ? false : { opacity: 0, y: 12 };

  return (
    <section id="hero" className="mx-auto flex min-h-[58vh] max-w-6xl items-center px-4 py-16 md:py-20">
      <m.div initial={animation} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-3xl">
        <p className="mb-4 text-xs font-mono uppercase tracking-[0.24em] text-app-primary">{t('hero.eyebrow')}</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-app-text md:text-6xl">{t('hero.title')}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-app-muted md:text-xl">{t('hero.subtitle')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => scrollToSection('projects')} className="rounded-full bg-app-primary px-6 py-3 text-sm font-bold text-app-primary-text transition-colors hover:bg-app-primary-hover">
            {t('nav.projects')}
          </button>
          <a href="https://github.com/Argenis1412" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-app-border px-6 py-3 text-sm font-semibold text-app-text transition-colors hover:border-app-primary hover:text-app-primary">
            <Github className="h-4 w-4" /> GitHub
          </a>
          <button onClick={() => scrollToSection('contact')} className="rounded-full border border-app-border px-6 py-3 text-sm font-semibold text-app-text transition-colors hover:border-app-primary hover:text-app-primary">
            {t('nav.contact')}
          </button>
        </div>
      </m.div>
    </section>
  );
}
