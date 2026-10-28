import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

// Editorial order for the home page; the API's ordering contract stays unchanged.
const projectOrder = ['portfolio-api', 'housing-finance-gps', 'loja-app', 'patchforge'];

export default function FeaturedProjects() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const { language, t } = useLanguage();
  const rank = (id: string) => {
    const index = projectOrder.indexOf(id);
    return index === -1 ? projectOrder.length : index;
  };
  const orderedProjects = [...projects].sort((a, b) => rank(a.id) - rank(b.id));

  return (
    <section id="projects" aria-labelledby="projects-title" className="home-container home-projects">
      <div className="home-section-heading">
        <h2 id="projects-title">{t('nav.projects')}</h2>
        <p className="text-sm text-app-muted">{t('home.projects.context')}</p>
      </div>
      {isLoading && <p role="status" className="mt-5 text-app-muted">{t('projects.loading')}</p>}
      {isError && <div className="mt-5 text-app-muted">
        <p role="status">{t('projects.error')}</p>
        <button onClick={() => void refetch()} className="home-link mt-3 text-app-primary">{t('projects.retry')}</button>
      </div>}
      {!isLoading && !isError && projects.length === 0 && <p className="mt-5 text-app-muted">{t('projects.empty')}</p>}
      <div className="mt-6">
        {orderedProjects.map((project) => (
          <article key={project.id} aria-labelledby={`project-${project.id}`} className="home-project-row">
            <h3 id={`project-${project.id}`}>{project.name}</h3>
            <div className="min-w-0">
              <p className="max-w-2xl leading-relaxed text-app-muted">{project.id === 'patchforge' ? t(`home.project.${project.id}`) : project.short_description[language]}</p>
              <ul aria-label={t('projects.stack')} className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-app-muted">
                {project.technologies.slice(0, 4).map((tech) => <li key={tech}>{tech}</li>)}
              </ul>
              <div className="mt-3 flex flex-wrap gap-x-6 text-sm font-semibold">
                {project.case_study && <Link to={`/projects/${project.id}`} className="home-link text-app-primary">{t('home.featured.link')}</Link>}
                {project.repository && <a href={project.repository} target="_blank" rel="noopener noreferrer" className="home-link text-app-text">{t('home.projects.code')}</a>}
                {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" className="home-link text-app-text">{t('projects.live_demo')}</a>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
