import { useLanguage } from '../context/LanguageContext';
import RoutePlaceholder from './RoutePlaceholder';

export default function ProductionEvidencePage() {
  const { t } = useLanguage();

  return (
    <RoutePlaceholder title={t('route.evidence.title')}>
      <p>{t('route.evidence.description')}</p>
    </RoutePlaceholder>
  );
}
