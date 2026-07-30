import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

export default function ProjectCasePage() {
  const { projectId } = useParams();
  const { language, t } = useLanguage();
  const { data: projects = [] } = useProjects();
  const project = projects.find((item) => item.id === projectId);
  const study = project?.case_study;

  if (!project || !study) return <section className="mx-auto max-w-4xl px-4 py-20"><h1>{t('route.project.title')}</h1><p>{t('route.project.description', { projectId: projectId ?? '' })}</p></section>;

  return (
    <article className="mx-auto max-w-4xl px-4 py-16"><p className="font-mono text-xs text-app-primary">{t('projects.case_study')}</p><h1 className="mt-3 text-4xl text-app-text">{project.name}</h1><p className="mt-4 text-app-muted">{project.short_description[language]}</p><div className="mt-8 grid gap-4 md:grid-cols-2">{(['problem','constraints','solution','architecture','testing','reliability','impact'] as const).map((key) => <section key={key} className="rounded-xl border border-app-border p-4"><h2 className="text-sm uppercase text-app-primary">{key}</h2><p className="mt-2 text-app-muted">{study[key][language]}</p></section>)}</div><section className="mt-8"><h2 className="text-2xl text-app-text">Evidence</h2>{study.evidence.map((item) => <div key={item.source} className="mt-3 rounded-xl border border-app-border p-4"><p className="font-semibold text-app-text">{item.label[language]} <span className="font-mono text-xs text-app-primary">{item.classification}</span></p><p className="text-app-muted">{item.value}</p><p className="mt-2 text-xs text-app-muted">Source: {item.source}</p></div>)}</section></article>
  );
}
