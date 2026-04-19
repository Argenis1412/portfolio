import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { MapPin } from 'lucide-react';
import { useExperience, useFormacao } from '../hooks/useApi';
import type { Experience as ExperienceType, Formacao, LocalizedString } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { ServerWakeupError } from './ServerWakeupNotice';

type TimelineEntry =
  | ({ kind: 'experience' } & ExperienceType)
  | ({ kind: 'education' } & Formacao);

export default function Experience() {
  const { data: experiences = [], isLoading: loadingExp, isError: errorExp } = useExperience();
  const { data: formacoes = [], isLoading: loadingFmc, isError: errorFmc } = useFormacao();
  const { language, t } = useLanguage();

  const loading = loadingExp || loadingFmc;
  const isError = errorExp || errorFmc;

  const entries: TimelineEntry[] = [
    ...experiences.map(e => ({ kind: 'experience' as const, ...e })),
    ...formacoes.map(f => ({ kind: 'education' as const, ...f })),
  ].sort((a, b) => {
    if (a.atual !== b.atual) return a.atual ? -1 : 1;
    return b.data_inicio.localeCompare(a.data_inicio);
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length > 0 && !activeId) {
      setActiveId(entries[0].id.toString());
    }
  }, [entries, activeId]);

  const formatDate = (date: string | null, isActual: boolean) => {
    if (!date) return isActual ? t('experience.label.present') : '?';
    const [year, month] = date.split('-');
    return `${t(`months.${month}`)}/${year}`;
  };

  if (loading) {
    return (
      <section id="experience" className="py-16 section-alt">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-10 w-48 mx-auto mb-16" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/4 flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="md:w-3/4">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/4 mb-8" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="experience" className="py-16 section-alt">
        <ServerWakeupError />
      </section>
    );
  }

  const activeEntry = entries.find(e => e.id.toString() === activeId) || entries[0];
  if (!activeEntry) return null;

  const lang = language as keyof LocalizedString;

  return (
    <section id="experience" className="py-24 section-alt transition-colors duration-300 relative group overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-12">
            <span className="text-xl md:text-2xl font-mono text-app-primary">02.</span>
            <h2 className="text-2xl md:text-4xl font-bold text-app-text tracking-widest">
              Where I've Worked
            </h2>
            <div className="hidden md:block h-px flex-grow bg-app-border opacity-50 ml-4 max-w-xs" />
          </div>

          <div className="flex flex-col md:flex-row gap-8 min-h-[400px]">
            {/* Tabs List */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar border-b md:border-b-0 md:border-l border-app-border w-full md:w-1/4 flex-shrink-0">
              {entries.map((entry) => {
                const isEducation = entry.kind === 'education';
                const subtitle = isEducation ? (entry as Formacao).instituicao : (entry as ExperienceType).empresa;
                const isActive = activeId === entry.id.toString();

                return (
                  <button
                    key={entry.id}
                    onClick={() => setActiveId(entry.id.toString())}
                    className={`
                      px-4 py-3 md:py-4 text-sm font-mono text-left whitespace-nowrap md:whitespace-normal transition-all duration-300 border-b-2 md:border-b-0 md:border-l-2 -mb-[2px] md:-mb-0 md:-ml-[1px]
                      ${isActive 
                        ? 'text-app-primary bg-app-primary/5 border-app-primary' 
                        : 'text-app-muted hover:text-app-text hover:bg-app-surface-hover border-transparent'}
                    `}
                  >
                    {subtitle}
                  </button>
                );
              })}
            </div>

            {/* Tab Panel */}
            <div className="w-full md:w-3/4 md:pl-4">
              <AnimatePresence mode="wait">
                <m.div
                  key={activeEntry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {(() => {
                    const isEducation = activeEntry.kind === 'education';
                    const title = isEducation
                      ? (activeEntry as { kind: 'education' } & Formacao).curso[lang]
                      : (activeEntry as ExperienceType).cargo[lang];
                    const subtitle = isEducation
                      ? (activeEntry as Formacao).instituicao
                      : (activeEntry as ExperienceType).empresa;
                    const description = activeEntry.descricao[lang as keyof typeof activeEntry.descricao] || '';
                    const techs = isEducation ? [] : (activeEntry as ExperienceType).tecnologias;
                    
                    // Split description by newlines to form list items loosely
                    const bullets = description.split('\n').filter(s => s.trim().length > 0);

                    return (
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-app-text leading-snug mb-2">
                          {title} <span className="text-app-primary">@ {subtitle}</span>
                        </h3>
                        
                        <div className="text-sm font-mono text-app-muted mb-6 flex items-center gap-4">
                          <span>{formatDate(activeEntry.data_inicio, false)} — {formatDate(activeEntry.data_fim, activeEntry.atual)}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{activeEntry.localizacao}</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                          {bullets.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-4 text-app-muted hover:text-app-text transition-colors">
                              <span className="text-app-primary mt-1.5 flex-shrink-0 text-[10px]">▶</span>
                              <span className="leading-relaxed">{bullet}</span>
                            </li>
                          ))}
                        </ul>

                        {techs.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs font-mono">
                            {techs.map(tech => (
                              <span key={tech} className="text-app-primary/80 border border-app-primary/20 bg-app-primary/5 px-2 py-1 rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
