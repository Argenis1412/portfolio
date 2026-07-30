import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import RoutePlaceholder from './RoutePlaceholder';

export default function ProjectCasePage() {
  const { projectId } = useParams();
  const { t } = useLanguage();

  return (
    <RoutePlaceholder title={t('route.project.title')}>
      <p>{t('route.project.description', { projectId: projectId ?? '' })}</p>
    </RoutePlaceholder>
  );
}
