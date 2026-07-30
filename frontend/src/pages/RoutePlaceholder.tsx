import { useEffect, useRef, type ReactNode } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface RoutePlaceholderProps {
  title: string;
  children: ReactNode;
}

export default function RoutePlaceholder({ title, children }: RoutePlaceholderProps) {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl rounded-2xl border border-app-border bg-app-surface/50 p-8 shadow-sm">
        <p className="mb-3 text-xs font-mono uppercase tracking-[0.22em] text-app-primary">{t('route.eyebrow')}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-app-text outline-none sm:text-4xl">{title}</h1>
        <div className="mt-4 text-app-muted">{children}</div>
      </div>
    </section>
  );
}
