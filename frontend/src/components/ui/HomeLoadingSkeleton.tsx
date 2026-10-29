import { useLanguage } from '../../context/LanguageContext';
import Hero from '../hero/Hero';
import Skeleton from './Skeleton';

export function ProjectRowsSkeleton() {
  const { t } = useLanguage();

  return (
    <div role="status">
      <span className="sr-only">{t('projects.loading')}</span>
      <div aria-hidden="true">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="home-project-row home-project-placeholder">
            <Skeleton className="h-7 w-3/4" />
            <div className="min-w-0">
              <Skeleton className="home-project-placeholder-description w-full" />
              <div className="mt-3 flex h-5 gap-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="mt-3 flex h-11 gap-6">
                <Skeleton className="h-11 w-28" />
                <Skeleton className="h-11 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectsSectionSkeleton() {
  const { t, language } = useLanguage();

  return (
    <section className="home-container home-projects" aria-busy="true" lang={language}>
      <div className="home-section-heading">
        <h2>{t('nav.projects')}</h2>
        <p className="text-sm text-app-muted">{t('home.projects.context')}</p>
      </div>
      <div className="mt-6"><ProjectRowsSkeleton /></div>
    </section>
  );
}

export function HomeSectionSkeleton({ section }: { section: 'about' | 'contact' }) {
  const { t, language } = useLanguage();

  return (
    <section className={`home-container home-section home-loading-${section}`} role="status" aria-busy="true" lang={language}>
      <span className="sr-only">{t('section.loading')}</span>
      <div aria-hidden="true" className="max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-4 h-11 w-48" />
      </div>
    </section>
  );
}

export function HomeRouteSkeleton() {
  return <><Hero /><ProjectsSectionSkeleton /><HomeSectionSkeleton section="about" /><HomeSectionSkeleton section="contact" /></>;
}
