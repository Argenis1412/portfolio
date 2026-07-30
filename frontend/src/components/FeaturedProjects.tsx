import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

export default function FeaturedProjects() {
  const { data: projects = [] } = useProjects();
  const { language, t } = useLanguage();
  const featured = [...projects].filter((project) => project.highlighted).slice(0, 3);

  return <section id="projects" className="mx-auto max-w-6xl px-4 py-16">
    <p className="text-xs font-mono uppercase tracking-[0.22em] text-app-primary">{t('home.featured.eyebrow')}</p>
    <h2 className="mt-3 text-3xl text-app-text md:text-4xl">{t('home.featured.title')}</h2>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {featured.map((project) => <article key={project.id} className="rounded-2xl border border-app-border bg-app-surface/50 p-5">
        <h3 className="text-xl text-app-text">{project.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-app-muted">{project.short_description[language]}</p>
        <Link to={`/projects/${project.id}`} className="mt-5 inline-flex text-sm font-semibold text-app-primary hover:text-app-primary-hover">{t('home.featured.link')} →</Link>
      </article>)}
    </div>
  </section>;
}
