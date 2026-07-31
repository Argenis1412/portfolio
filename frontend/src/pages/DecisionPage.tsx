import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const decisionIds = ['deterministic-validation', 'json-first', 'redis-streams-monolith'] as const;

export default function DecisionPage() {
  const { decisionId } = useParams();
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [decisionId]);

  if (!decisionIds.includes(decisionId as typeof decisionIds[number])) return <section className="mx-auto max-w-4xl px-4 py-20"><h1 ref={headingRef} tabIndex={-1}>{t('route.decision.title')}</h1><p>{t('route.decision.description', { decisionId: decisionId ?? '' })}</p></section>;
  const key = `decision.${decisionId}`;
  return <article className="mx-auto max-w-4xl px-4 py-16"><p className="font-mono text-xs text-app-primary">{t('route.decision.title')}</p><h1 ref={headingRef} tabIndex={-1} className="mt-3 text-4xl text-app-text">{t(`${key}.title`)}</h1><p className="mt-5 text-app-muted">{t(`${key}.summary`)}</p><section className="mt-8 rounded-xl border border-app-border p-5"><h2 className="text-xl text-app-text">{t('decision.tradeoff')}</h2><p className="mt-2 text-app-muted">{t(`${key}.tradeoff`)}</p><p className="mt-4 text-xs font-mono text-app-primary">{t('decision.evidence')}</p></section></article>;
}
