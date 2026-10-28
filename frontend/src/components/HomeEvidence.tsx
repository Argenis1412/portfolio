import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function HomeEvidence() {
  const { t } = useLanguage();

  return (
    <section id="system" aria-labelledby="system-title" className="home-container home-section">
      <div className="home-editorial-grid">
        <div>
          <h2 id="system-title">{t('home.system.title')}</h2>
          <p className="mt-4 max-w-sm leading-relaxed text-app-muted">{t('home.system.body')}</p>
          <Link to="/production-evidence" className="home-link mt-5 text-app-primary">{t('home.system.link')}</Link>
        </div>
        <dl className="home-evidence-list">
          {['backend', 'browser', 'history'].map(source => (
            <div key={source}>
              <dt className="font-semibold text-app-text">{t(`home.system.${source}.title`)}</dt>
              <dd className="mt-2 leading-relaxed text-app-muted">{t(`home.system.${source}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
