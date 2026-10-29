import { useLanguage } from '../context/LanguageContext';
import { useSkills } from '../hooks/useApi';
import Experience from './Experience';

export default function About() {
  const { t } = useLanguage();
  const { data: skills = [], isLoading: skillsLoading } = useSkills();

  return (
    <section id="about" aria-labelledby="about-title" className="home-container home-section">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="about-title">{t('home.about.title')}</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-app-muted">{t('home.about.body')}</p>
          {skillsLoading && <div className="mt-4 h-11" aria-hidden="true" />}
          {skills.length > 0 && <details className="mt-4">
            <summary className="home-link w-fit cursor-pointer text-sm font-semibold text-app-primary">{t('stack.section_title')}</summary>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-app-muted">
              {skills.map((skill) => <li key={`${skill.category}-${skill.name}`}>{skill.name}</li>)}
            </ul>
          </details>}
        </div>
        <picture className="shrink-0">
          <source srcSet="/profile.webp" type="image/webp" />
          <img src="/profile.jpg" alt="Argenis Lopez" width="176" height="176" loading="lazy" className="h-36 w-36 sm:h-44 sm:w-44 rounded-full border border-app-border object-cover" />
        </picture>
      </div>
      <details className="mt-4">
        <summary className="home-link w-fit cursor-pointer text-sm font-semibold text-app-primary">{t('about.experience')}</summary>
        <Experience />
      </details>
    </section>
  );
}
