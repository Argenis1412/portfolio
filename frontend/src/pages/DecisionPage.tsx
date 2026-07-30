import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const decisions: Record<string, { title: string; summary: string; tradeoff: string }> = {
  'deterministic-validation': { title: 'Deterministic change validation', summary: 'Validate changes through repeatable checks before release.', tradeoff: 'Slower feedback is accepted in exchange for reproducibility.' },
  'json-first': { title: 'JSON-first reads', summary: 'Static portfolio reads use validated JSON contracts before network-dependent paths.', tradeoff: 'Freshness is bounded to protect availability.' },
  'redis-streams-monolith': { title: 'Durable Redis Streams and a resilient monolith', summary: 'Keep operational flow durable without distributing responsibility prematurely.', tradeoff: 'The monolith remains deliberate until service boundaries earn their cost.' },
};

export default function DecisionPage() {
  const { decisionId } = useParams();
  const { t } = useLanguage();

  const decision = decisions[decisionId ?? ''];
  if (!decision) return <section className="mx-auto max-w-4xl px-4 py-20"><h1>{t('route.decision.title')}</h1><p>{t('route.decision.description', { decisionId: decisionId ?? '' })}</p></section>;
  return <article className="mx-auto max-w-4xl px-4 py-16"><p className="font-mono text-xs text-app-primary">Engineering decision</p><h1 className="mt-3 text-4xl text-app-text">{decision.title}</h1><p className="mt-5 text-app-muted">{decision.summary}</p><section className="mt-8 rounded-xl border border-app-border p-5"><h2 className="text-xl text-app-text">Accepted trade-off</h2><p className="mt-2 text-app-muted">{decision.tradeoff}</p><p className="mt-4 text-xs font-mono text-app-primary">REPRODUCED · Source: repository decision record</p></section></article>;
}
