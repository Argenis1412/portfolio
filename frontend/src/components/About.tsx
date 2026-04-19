import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAbout, useSkills } from '../hooks/useApi';
import { ChevronRight } from 'lucide-react';

const CATEGORY_ORDER = ['backend', 'banco_dados', 'database', 'devops', 'frontend', 'testing', 'tools', 'automation'];

export default function About() {
  const { t } = useLanguage();
  const { data: about } = useAbout();
  const { data: skills = [], isLoading: isLoadingSkills } = useSkills();

  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const github = about?.github ?? 'https://github.com/Argenis1412';
  const linkedin = about?.linkedin ?? 'https://linkedin.com/in/argenis';

  // Sort and filter categories based on data
  const allCats = Array.from(new Set(skills.map((s) => s.categoria)));
  const categories = [
    ...CATEGORY_ORDER.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <section id="about" className="py-12 px-4 max-w-6xl mx-auto">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
      >
        {/* Text column */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-3">
            {t('about.title')}
          </h2>
          <p className="text-sm text-app-muted leading-relaxed mb-6">
            {t('about.bio')}
          </p>

          {!isLoadingSkills && categories.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-app-text mb-4">
                {t('stack.section_title')}
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const isExpanded = expandedCat === category;
                  const catSkills = skills.filter((s) => s.categoria === category);
                  
                  return (
                    <div key={category} className="border border-app-border rounded-lg bg-app-surface overflow-hidden">
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : category)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-app-surface-hover transition-colors focus-visible:outline-none"
                      >
                        <span className="text-xs font-mono uppercase tracking-widest text-app-text">
                          {t(`stack.category.${category}`)}
                        </span>
                        <ChevronRight 
                          className={`w-4 h-4 text-app-primary transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <m.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="p-3 pt-0 flex flex-wrap gap-1.5 border-t border-app-border/50">
                              {catSkills.map((skill) => (
                                <span
                                  key={skill.nome}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-app-muted hover:text-app-primary hover:bg-app-primary/5 transition-colors border border-transparent hover:border-app-primary/10"
                                >
                                  ▹ {skill.nome}
                                </span>
                              ))}
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Social links */}
          <div className="flex gap-3 mt-4">
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg border border-app-border bg-app-surface hover:border-app-primary hover:text-app-primary transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.8c1.02.005 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
              </svg>
              {t('about.github')}
            </a>
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg border border-app-border bg-app-surface hover:border-app-primary hover:text-app-primary transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.59 0 4.25 2.36 4.25 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.57V9h3.55v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
              </svg>
              {t('about.linkedin')}
            </a>
          </div>
        </div>

        {/* Photo column */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] rounded-lg p-3 border-2 border-app-primary/60 shadow-[8px_8px_0_0_rgba(212,163,115,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_rgba(212,163,115,1)] transition-all duration-300">
            <div className="w-full h-full overflow-hidden bg-app-surface-hover rounded filter grayscale hover:grayscale-0 transition-all duration-500">
              <picture>
                <source srcSet="/profile.webp" type="image/webp" />
                <img
                  src="/profile.jpg"
                  alt="Argenis"
                  width="320"
                  height="320"
                  loading="lazy"
                  className="w-full h-full object-cover object-top"
                />
              </picture>
            </div>
            {/* Aesthetic tint overlay (fades on hover) */}
            <div className="absolute inset-2 bg-app-primary/10 mix-blend-multiply opacity-100 hover:opacity-0 transition-opacity duration-500 pointer-events-none rounded"></div>
          </div>
        </div>
      </m.div>
    </section>
  );
}
