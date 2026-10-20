import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArchitectureTradeoffs from '../components/ArchitectureTradeoffs';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

const sections = ['problem', 'constraints', 'solution', 'architecture', 'testing', 'reliability', 'impact'] as const;

export default function ProjectCasePage() {
  const { projectId } = useParams();
  const { language, t } = useLanguage();
  const { data: projects = [], isLoading, isError } = useProjects();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [projectId, isLoading, isError]);

  if (isLoading) return <section className="mx-auto max-w-4xl px-4 py-20"><h1 ref={headingRef} tabIndex={-1}>{t('route.project.title')}</h1><p>{t('case.loading')}</p></section>;
  if (isError) return <section className="mx-auto max-w-4xl px-4 py-20"><h1 ref={headingRef} tabIndex={-1}>{t('route.project.title')}</h1><p>{t('case.error')}</p></section>;
  const project = projects.find((item) => item.id === projectId);
  const study = project?.case_study;
  if (!project || !study) return <section className="mx-auto max-w-4xl px-4 py-20"><h1 ref={headingRef} tabIndex={-1}>{t('route.project.title')}</h1><p>{t('route.project.description', { projectId: projectId ?? '' })}</p></section>;
  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <p className="font-mono text-xs text-app-primary">{t('projects.case_study')}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-4xl tracking-tight text-app-text">{project.name}</h1>
      <p className="mt-4 text-app-muted">{project.short_description[language]}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-app-primary">
        {project.repository && <a href={project.repository} target="_blank" rel="noopener noreferrer" className="py-2 hover:underline">GitHub</a>}
        {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" className="py-2 hover:underline">{t('projects.live_demo')}</a>}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((key) => <section key={key} className="rounded-xl border border-app-border p-4">
          <h2 className="text-sm text-app-primary">{t(`case.section.${key}`)}</h2>
          <p className="mt-2 text-app-muted">{study[key][language]}</p>
        </section>)}
      </div>
      <section className="mt-8">
        <h2 className="text-2xl text-app-text">{t('evidence.title')}</h2>
        {study.evidence.map((item) => <div key={item.source} className="mt-3 rounded-xl border border-app-border p-4">
          <p className="font-semibold text-app-text">{item.label[language]} <span className="font-mono text-xs text-app-primary">{item.classification}</span></p>
          <p className="text-app-muted">{item.value}</p>
          <p className="mt-2 break-words text-xs text-app-muted">{t('evidence.source')}: {item.source}</p>
        </div>)}
      </section>
      {project.id === 'portfolio-api' && <section className="mt-8 border-t border-app-border pt-6">
        <h2 className="text-2xl tracking-tight">{t('case.engineering')}</h2>
        <div className="mt-3 flex flex-col items-start gap-2 text-sm text-app-primary">
          {['deterministic-validation', 'json-first', 'redis-streams-monolith'].map(id => <Link key={id} to={`/decisions/${id}`} className="py-2 hover:underline">{t(`decision.${id}.title`)}</Link>)}
          <Link to="/production-evidence" className="py-2 font-semibold hover:underline">{t('case.observations')} →</Link>
        </div>
        <details className="mt-4">
          <summary className="w-fit cursor-pointer py-2 text-sm text-app-primary">{t('tradeoffs.title')}</summary>
          <ArchitectureTradeoffs />
        </details>
      </section>}
    </article>
  );
}
