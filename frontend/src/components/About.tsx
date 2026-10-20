import { useLanguage } from '../context/LanguageContext';
import { useSkills } from '../hooks/useApi';
import Experience from './Experience';

export default function About() {
  const { t } = useLanguage();
  const { data: skills = [] } = useSkills();

  return (
    <section id="about" aria-labelledby="about-title" className="home-container border-t border-app-border py-10 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="about-title" className="text-2xl tracking-tight sm:text-3xl">{t('nav.about')}</h2>
          <p className="mt-4 leading-relaxed text-app-muted">{t('about.bio')}</p>
          {skills.length > 0 && <details className="mt-4">
            <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-app-primary">{t('stack.section_title')}</summary>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm text-app-muted">
              {skills.map((skill) => <li key={`${skill.category}-${skill.name}`} className="rounded-md border border-app-border px-2 py-1">{skill.name}</li>)}
            </ul>
          </details>}
        </div>
        <picture className="shrink-0">
          <source srcSet="/profile.webp" type="image/webp" />
          <img src="/profile.jpg" alt="Argenis Lopez" width="112" height="112" loading="lazy" className="h-28 w-28 rounded-xl border border-app-border object-cover" />
        </picture>
      </div>
      <details className="mt-4">
        <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-app-primary">{t('about.experience')}</summary>
        <Experience />
      </details>
    </section>
  );
}
