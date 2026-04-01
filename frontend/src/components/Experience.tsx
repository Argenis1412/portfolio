import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { GraduationCap, MapPin, Briefcase } from 'lucide-react';
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


  const formatDate = (date: string | null, isActual: boolean) => {
    if (!date) return isActual ? (language === 'pt' ? 'Presente' : language === 'es' ? 'Presente' : 'Present') : '?';
    const [year, month] = date.split('-');
    const months: Record<string, Record<string, string>> = {
      pt: { '01':'jan','02':'fev','03':'mar','04':'abr','05':'mai','06':'jun','07':'jul','08':'ago','09':'set','10':'out','11':'nov','12':'dez' },
      en: { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' },
      es: { '01':'ene','02':'feb','03':'mar','04':'abr','05':'may','06':'jun','07':'jul','08':'ago','09':'sep','10':'oct','11':'nov','12':'dic' },
    };
    return `${months[language]?.[month] ?? month}/${year}`;
  };

  if (loading) {
    return (
      <section id="experience" className="py-16 section-alt">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-10 w-48 mx-auto mb-16" />
          <div className="relative border-l border-app-border ml-3 md:ml-6 space-y-12 pb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="relative pl-8 md:pl-12">
                <div className="absolute w-6 h-6 rounded-full -left-[12.5px] top-1 bg-app-surface-hover border-4 border-app-bg" />
                <div className="glass rounded-xl p-8 border border-app-border">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-6" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-12 rounded" />
                    <Skeleton className="h-5 w-12 rounded" />
                  </div>
                </div>
              </div>
            ))}
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

  return (
    <section id="experience" className="py-16 section-alt transition-colors duration-300 relative group overflow-hidden">
      {/* Dynamic hover glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-app-primary/5 dark:bg-app-primary/10 rounded-full blur-[120px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="max-w-4xl mx-auto px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center text-app-text tracking-widest">
            {t('nav.journey')}
        </h2>

        <div className="relative border-l border-app-border ml-3 md:ml-6 space-y-12 pb-8">
          {entries.map((entry) => {
            const isEducation = entry.kind === 'education';
            const lang = language as keyof LocalizedString;
            const title = isEducation
              ? (entry as { kind: 'education' } & Formacao).curso[lang]
              : (entry as ExperienceType).cargo[lang];
            const subtitle = isEducation
              ? (entry as Formacao).instituicao
              : (entry as ExperienceType).empresa;
            const description = entry.descricao[language as keyof typeof entry.descricao];
            const techs = isEducation ? [] : (entry as ExperienceType).tecnologias;

            return (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5 }}
                className="relative pl-8 md:pl-12"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute w-6 h-6 rounded-full -left-[12.5px] top-1 border-4 border-app-bg flex items-center justify-center
                    ${entry.atual
                      ? 'bg-app-primary'
                      : isEducation
                        ? 'bg-app-primary/40'
                        : 'bg-app-muted'
                    }`}
                >
                  {isEducation ? (
                    <GraduationCap className="w-3 h-3 text-white" />
                  ) : (
                    <Briefcase className="w-3 h-3 text-white" />
                  )}
                </div>

                <div className="glass rounded-xl p-6 md:p-8 border border-app-border hover:border-app-primary hover:shadow-[0_0_30px_rgba(212,163,115,0.25)] transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      {/* Education / Experience badge */}
                      {isEducation && (
                        <span className="inline-block text-xs font-semibold text-app-primary bg-app-primary/10 border border-app-primary/20 px-2 py-0.5 rounded-full mb-2 uppercase tracking-widest">
                          {language === 'pt' ? 'Formação' : language === 'es' ? 'Formación' : 'Education'}
                        </span>
                      )}
                      <h3 className="text-xl md:text-2xl font-bold text-app-text leading-snug">{title}</h3>
                      <div className="text-app-primary font-medium text-base mt-1">{subtitle}</div>
                    </div>
                    <div className="text-sm font-medium text-app-muted bg-app-surface-hover/80 px-4 py-2 rounded-full w-fit whitespace-nowrap">
                      {formatDate(entry.data_inicio, false)} — {formatDate(entry.data_fim, entry.atual)}
                    </div>
                  </div>

                  <div className="text-sm text-app-muted mb-5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    {entry.localizacao}
                  </div>

                  <p className="text-app-text leading-relaxed mb-4">{description}</p>

                  {techs.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-app-border">
                      {techs.map(tech => (
                        <span key={tech} className="text-xs font-semibold text-app-primary bg-app-primary/5 px-2 py-1 rounded border border-app-primary/10">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      </div>
    </section>
  );
}
