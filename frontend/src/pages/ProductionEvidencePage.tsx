import { lazy, Suspense } from 'react';
import { useLanguage } from '../context/LanguageContext';
import RoutePlaceholder from './RoutePlaceholder';

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

  return (
    <>
      <Suspense fallback={null}>
        <DecisionProcessor />
        <ChaosModeBanner />
        <SystemStatusBanner />
      </Suspense>
      <RoutePlaceholder title={t('route.evidence.title')}><p>{t('route.evidence.description')}</p></RoutePlaceholder>
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
