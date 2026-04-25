import { useMemo } from 'react';
import { m } from 'framer-motion';
import { BookOpen, BriefcaseBusiness, MapPin } from 'lucide-react';
import Skeleton from './ui/Skeleton';
import { useExperience, useFormation } from '../hooks/useApi';
import type { Experience as ExperienceType, Formation, LocalizedString } from '../api/types';
import { useLanguage } from '../context/LanguageContext';
import { ServerWakeupError } from './ServerWakeupNotice';

type TimelineEntry =
  | ({ kind: 'experience' } & ExperienceType)
  | ({ kind: 'education' } & Formation);

type SignalTone = 'decision' | 'failure' | 'learning' | 'impact';

interface ParsedSignal {
  tone: SignalTone;
  text: string;
}

interface SignalSummary {
  decision: number;
  failure: number;
  learning: number;
  impact: number;
}

const SIGNAL_STYLE: Record<SignalTone, string> = {
  decision: 'border-[var(--color-signal-decision-border)] bg-[var(--color-signal-decision-bg)] text-[var(--color-signal-decision)]',
  failure: 'border-[var(--color-signal-failure-border)] bg-[var(--color-signal-failure-bg)] text-[var(--color-signal-failure)]',
  learning: 'border-[var(--color-signal-learning-border)] bg-[var(--color-signal-learning-bg)] text-[var(--color-signal-learning)]',
  impact: 'border-[var(--color-signal-impact-border)] bg-[var(--color-signal-impact-bg)] text-[var(--color-signal-impact)]',
};

function parseSignals(description: string): ParsedSignal[] {
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(Decision|Failure|Learning|Impact)\]\s*(.*)$/);
      if (!match) {
        return { tone: 'learning' as const, text: line };
      }

      const [, tag, text] = match;
      return {
        tone: tag.toLowerCase() as SignalTone,
        text,
      };
    });
}

function summarizeSignals(signals: ParsedSignal[]): SignalSummary {
  return signals.reduce<SignalSummary>((acc, signal) => {
    acc[signal.tone] += 1;
    return acc;
  }, { decision: 0, failure: 0, learning: 0, impact: 0 });
}

export default function Experience() {
  const { data: experiences = [], isLoading: loadingExp, isError: errorExp } = useExperience();
  const { data: formations = [], isLoading: loadingFmc, isError: errorFmc } = useFormation();
  const { language, t } = useLanguage();

  const loading = loadingExp || loadingFmc;
  const isError = errorExp || errorFmc;

  const sortedEntries = useMemo(() => {
    const entries: TimelineEntry[] = [
      ...experiences.map((entry) => ({ kind: 'experience' as const, ...entry })),
      ...formations.map((entry) => ({ kind: 'education' as const, ...entry })),
    ];
    return entries.sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return b.start_date.localeCompare(a.start_date);
    });
  }, [experiences, formations]);

  const lang = language as keyof LocalizedString;
  const educationCount = sortedEntries.filter((entry) => entry.kind === 'education').length;
  const experienceCount = sortedEntries.filter((entry) => entry.kind === 'experience').length;
  const activeCount = sortedEntries.filter((entry) => entry.current).length;

  const formatDate = (date: string | null, isActual: boolean) => {
    if (!date) return isActual ? t('experience.label.present') : '?';
    const [year, month] = date.split('-');
    return `${t(`months.${month}`)}/${year}`;
  };

  if (loading) {
    return (
      <section id="experience" className="py-16 section-alt">
        <div className="max-w-5xl mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-12" />
          <div className="space-y-6">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-2xl border border-app-border p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-56 mb-6" />
                <div className="grid gap-3 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl" />)}
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
    <section id="experience" className="py-24 section-alt transition-colors duration-300 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-12 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-app-text tracking-widest">
              {t('nav.journey')}
            </h2>
            <p className="mt-4 text-sm md:text-base text-app-muted leading-relaxed mx-auto max-w-2xl">
              {t('experience.timeline_subtitle')}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-app-border/60 bg-app-surface/25 p-4 text-center md:text-left">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-app-muted">{t('experience.summary.academic')}</div>
                <div className="mt-2 text-2xl font-mono font-bold text-[var(--color-signal-decision)]">{educationCount}</div>
                <div className="mt-1 text-xs text-app-muted">{t('experience.summary.academic_desc')}</div>
              </div>
              <div className="rounded-2xl border border-app-border/60 bg-app-surface/25 p-4 text-center md:text-left">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-app-muted">{t('experience.summary.professional')}</div>
                <div className="mt-2 text-2xl font-mono font-bold text-app-primary">{experienceCount}</div>
                <div className="mt-1 text-xs text-app-muted">{t('experience.summary.professional_desc')}</div>
              </div>
              <div className="rounded-2xl border border-app-border/60 bg-app-surface/25 p-4 text-center md:text-left">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-app-muted">{t('experience.summary.current')}</div>
                <div className="mt-2 text-2xl font-mono font-bold text-[var(--color-signal-impact)]">{activeCount}</div>
                <div className="mt-1 text-xs text-app-muted">{t('experience.summary.current_desc')}</div>
              </div>
            </div>
          </div>

          <div className="relative space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-px before:bg-app-border/50">
            {sortedEntries.map((entry, index) => {
              const isEducation = 'course' in entry;
              const title = isEducation ? (entry as Formation).course[lang] : (entry as ExperienceType).role[lang];
              const subtitle = isEducation ? (entry as Formation).institution : (entry as ExperienceType).company;
              const signals = parseSignals(entry.description[lang as keyof typeof entry.description] || '');
              const summary = summarizeSignals(signals);
              const technologies = isEducation ? [] : (entry as ExperienceType).technologies;

              return (
                <m.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="relative pl-10"
                >
                  <span className={`absolute left-0 top-3 h-[22px] w-[22px] rounded-full border-4 ${isEducation ? 'border-blue-400 bg-[#0f172a]' : 'border-app-primary bg-[#1a1510]'}`} />

                  <div className={`glass rounded-2xl border p-6 md:p-7 ${isEducation ? 'border-blue-400/15 shadow-[0_0_0_1px_rgba(96,165,250,0.04)]' : 'border-app-border'}`}>
                    <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[1.4fr_0.7fr] xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-[0.22em] text-app-muted">
                          <span className={`rounded-full border px-2.5 py-1 ${isEducation ? 'border-[var(--color-signal-decision-border)] bg-[var(--color-signal-decision-bg)] text-[var(--color-signal-decision)]' : 'border-app-primary/20 bg-app-primary/10 text-app-primary'}`}>
                            {isEducation ? t('experience.label.education') : t('experience.label.experience')}
                          </span>
                           {entry.current && (
                             <span className="rounded-full bg-status-ok/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-status-ok border border-status-ok/20">
                               {t('experience.status.current')}
                             </span>
                           )}
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-app-text leading-snug">
                          {title}
                        </h3>
                        <p className={`mt-1 text-sm md:text-base ${isEducation ? 'text-[var(--color-signal-decision)]' : 'text-app-primary'}`}>{subtitle}</p>
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-app-muted">
                          {isEducation ? t('experience.entry.academic_note') : t('experience.entry.professional_note')}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-app-border/50 bg-app-surface/20 p-4 text-sm font-mono text-app-muted xl:justify-self-end xl:min-w-[220px]">
                        <div className="flex items-center gap-2 text-app-text mb-3">
                          {isEducation ? <BookOpen className="h-4 w-4 text-[var(--color-signal-decision)]" /> : <BriefcaseBusiness className="h-4 w-4 text-app-primary" />}
                          <span className="text-[10px] uppercase tracking-[0.22em]">{isEducation ? t('experience.entry.track_academic') : t('experience.entry.track_professional')}</span>
                        </div>
                        <div>{formatDate(entry.start_date, false)} - {formatDate(entry.end_date, entry.current)}</div>
                        <div className="mt-2 inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{entry.location}</div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em]">
                          {summary.decision > 0 && <span className="rounded-full border border-[var(--color-signal-decision-border)] bg-[var(--color-signal-decision-bg)] px-2 py-1 text-[var(--color-signal-decision)]">{summary.decision} {t('experience.signal.decision')}</span>}
                          {summary.learning > 0 && <span className="rounded-full border border-[var(--color-signal-learning-border)] bg-[var(--color-signal-learning-bg)] px-2 py-1 text-[var(--color-signal-learning)]">{summary.learning} {t('experience.signal.learning')}</span>}
                          {summary.impact > 0 && <span className="rounded-full border border-[var(--color-signal-impact-border)] bg-[var(--color-signal-impact-bg)] px-2 py-1 text-[var(--color-signal-impact)]">{summary.impact} {t('experience.signal.impact')}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {signals.map((signal) => (
                        <div key={`${entry.id}-${signal.tone}-${signal.text}`} className={`rounded-xl border p-4 ${SIGNAL_STYLE[signal.tone]}`}>
                          <div className="text-[10px] font-mono uppercase tracking-[0.22em] opacity-80 mb-2">
                            {t(`experience.signal.${signal.tone}`)}
                          </div>
                          <p className="text-sm leading-relaxed text-current">{signal.text}</p>
                        </div>
                      ))}
                    </div>

                    {technologies.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2 text-xs font-mono">
                        {technologies.map((tech) => (
                          <span key={tech} className="text-app-primary/80 border border-app-primary/20 bg-app-primary/5 px-2 py-1 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </m.article>
              );
            })}
          </div>
        </m.div>
      </div>
    </section>
  );
}
