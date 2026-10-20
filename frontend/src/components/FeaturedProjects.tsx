import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

export default function FeaturedProjects() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const { language, t } = useLanguage();

  return (
    <section id="projects" aria-labelledby="projects-title" className="home-container pb-10 pt-4 sm:pb-14">
      <h2 id="projects-title" className="text-2xl tracking-tight text-app-text sm:text-3xl">{t('nav.projects')}</h2>
      {isLoading && <p role="status" className="mt-5 text-app-muted">{t('projects.loading')}</p>}
      {isError && <div className="mt-5 text-app-muted">
        <p role="status">{t('projects.error')}</p>
        <button onClick={() => void refetch()} className="mt-3 rounded-lg border border-app-border px-4 py-2 text-app-primary">{t('projects.retry')}</button>
      </div>}
      {!isLoading && !isError && projects.length === 0 && <p className="mt-5 text-app-muted">{t('projects.empty')}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <article key={project.id} className="flex flex-col rounded-xl border border-app-border bg-app-surface p-5">
            <h3 className="text-lg tracking-tight text-app-text">{project.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">{['loja-app', 'portfolio-api', 'patchforge'].includes(project.id) ? t(`home.project.${project.id}`) : project.short_description[language]}</p>
            <ul aria-label={t('projects.stack')} className="my-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
              {project.technologies.slice(0, 4).map((tech) => <li key={tech}>{tech}</li>)}
            </ul>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-app-border pt-2 text-sm font-semibold">
              <Link to={`/projects/${project.id}`} className="py-2 text-app-primary hover:underline">{t('home.featured.link')} <span aria-hidden="true">→</span></Link>
              {project.repository && <a href={project.repository} target="_blank" rel="noopener noreferrer" className="py-2 text-app-text hover:underline">GitHub</a>}
              {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" className="py-2 text-app-text hover:underline">{t('projects.live_demo')}</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
