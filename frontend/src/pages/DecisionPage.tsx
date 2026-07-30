import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import RoutePlaceholder from './RoutePlaceholder';

export default function DecisionPage() {
  const { decisionId } = useParams();
  const { t } = useLanguage();

  return (
    <RoutePlaceholder title={t('route.decision.title')}>
      <p>{t('route.decision.description', { decisionId: decisionId ?? '' })}</p>
    </RoutePlaceholder>
  );
}
