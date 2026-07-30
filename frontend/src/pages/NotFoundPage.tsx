import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-app-primary">404</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-4xl font-bold text-app-text outline-none sm:text-5xl">
          {t('not_found.title')}
        </h1>
        <p className="mt-4 text-app-muted">{t('not_found.description')}</p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-lg border border-app-primary/50 bg-app-primary/10 px-4 py-3 text-sm font-semibold text-app-primary transition-colors hover:bg-app-primary/20 focus:outline-none focus:ring-2 focus:ring-app-primary focus:ring-offset-2 focus:ring-offset-app-bg"
        >
          {t('not_found.home')}
        </Link>
      </div>
    </section>
  );
}
