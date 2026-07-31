import { lazy, Suspense, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LiveMetricsBento = lazy(() => import('../components/LiveMetricsBento'));
const ChaosPlayground = lazy(() => import('../components/ChaosPlayground'));
const TraceViewer = lazy(() => import('../components/TraceViewer'));
const LogStream = lazy(() => import('../components/LogStream'));
const FeaturedIncident = lazy(() => import('../components/FeaturedIncident'));
const ChaosModeBanner = lazy(() => import('../components/ChaosModeBanner'));
const SystemStatusBanner = lazy(() => import('../components/SystemStatusBanner'));
const DecisionProcessor = lazy(() => import('../components/DecisionProcessor'));

export default function ProductionEvidencePage() {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sectionLinks = [
    ['metrics', 'evidence.navigation.metrics'],
    ['chaos', 'evidence.navigation.chaos'],
    ['observability', 'evidence.navigation.traces'],
    ['logs', 'evidence.navigation.logs'],
    ['incident-history', 'evidence.navigation.incidents'],
  ];

  return (
    <>
      <Suspense fallback={null}>
        <DecisionProcessor />
        <ChaosModeBanner />
        <SystemStatusBanner />
      </Suspense>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-mono uppercase tracking-[0.22em] text-app-primary">
            {t('evidence.eyebrow')}
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-app-text outline-none sm:text-4xl">
            {t('route.evidence.title')}
          </h1>
          <p className="mt-4 text-app-muted">{t('evidence.description')}</p>
          <nav aria-label={t('evidence.navigation.label')} className="mt-6 flex flex-wrap gap-2">
            {sectionLinks.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-app-border px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-app-muted transition-colors hover:border-app-primary hover:text-app-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
              >
                {t(label)}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <Suspense fallback={null}>
        <LiveMetricsBento />
        <ChaosPlayground />
        <TraceViewer />
        <LogStream />
        <FeaturedIncident />
      </Suspense>
    </>
  );
}
