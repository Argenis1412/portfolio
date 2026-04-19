/**
 * Skills → Technology Stack
 *
 * Minimal icon grid. No progress bars, no level indicators.
 * Groups by category. Signal only.
 */
import { m } from 'framer-motion';
import { useSkills } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import { ServerWakeupError } from './ServerWakeupNotice';

// Category display order (featured first)
const CATEGORY_ORDER = ['backend', 'banco_dados', 'database', 'devops', 'frontend', 'testing', 'tools', 'automation'];

export default function Skills() {
  const { data: skills = [], isLoading, isError } = useSkills();
  const { t } = useLanguage();

  if (isLoading) return null;

  if (isError) {
    return (
      <section id="stack" className="py-16">
        <ServerWakeupError />
      </section>
    );
  }

  // Sort categories by preferred order
  const allCats = Array.from(new Set(skills.map((s) => s.categoria)));
  const categories = [
    ...CATEGORY_ORDER.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <section id="stack" className="py-12 section-alt transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Section header — monospace, like every other ops section */}
          <div className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
              {t('stack.section_title')}
            </h2>
          </div>

          {/* Grid of category blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category, idx) => (
              <m.div
                key={category}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="glass rounded-xl p-4 border border-app-border"
              >
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-app-primary mb-3">
                  {t(`stack.category.${category}`)}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills
                    .filter((s) => s.categoria === category)
                    .map((skill) => (
                      <span
                        key={skill.nome}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-app-text bg-app-surface-hover border border-app-border"
                      >
                        {skill.nome}
                      </span>
                    ))}
                </div>
              </m.div>
            ))}
          </div>
        </m.div>
      </div>
    </section>
  );
}
