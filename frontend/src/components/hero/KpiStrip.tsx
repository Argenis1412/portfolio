import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { type MetricsSummary } from '../../api/types';
import DeltaBadge from '../ui/DeltaBadge';
import { useChaosMode } from '../../hooks/useChaosMode';
import { Zap } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

interface KpiStripProps {
  data: MetricsSummary;
  previous: MetricsSummary | null;
  effectiveP95: number;
}

export function KpiStrip({ data, previous, effectiveP95 }: KpiStripProps) {
  const { t } = useLanguage();
  const { preset } = useChaosMode();
  const reduced = useReducedMotion();
  const chaosActive = preset !== 'off';
  const animatedP95 = useAnimatedNumber(effectiveP95);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const card = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const items = [
    {
      label: t('hero.kpi.latency'),
      value: `${Math.round(animatedP95)}ms`,
      delta: <DeltaBadge current={effectiveP95} previous={previous?.p95_ms ?? null} unit="ms" />,
    },
     {
       id: 'error_rate',
       label: t('hero.kpi.error_rate'),
       value: data.error_rate_pct,
       className: data.error_rate > 0.045 ? 'text-status-error' : 'text-app-text',
       delta: <DeltaBadge current={data.error_rate * 100} previous={previous ? previous.error_rate * 100 : null} unit="%" decimals={2} />,
       footnote: t('metrics.error_rate_slo_context'),
     },
    {
      label: t('hero.kpi.requests'),
      value: data.requests_24h.toLocaleString('en-US'),
      delta: null,
    },
    {
      id: 'incidents',
      label: t('hero.kpi.incidents'),
      value: data.total_incidents_24h,
      className: 'text-app-primary cursor-pointer hover:underline',
      delta: <DeltaBadge current={data.total_incidents_24h} previous={previous?.total_incidents_24h ?? null} unit="" />,
      onClick: () => scrollToSection('incidents'),
    },
  ];

  return (
    <m.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-xl mx-auto md:mx-0"
      variants={container}
      initial={reduced ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true }}
    >
      {items.map((item) => (
        <m.div
          key={item.label}
          variants={card}
          className="glass rounded-xl px-4 py-3 flex flex-col gap-1"
          onClick={item.onClick}
          role={item.onClick ? 'button' : undefined}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{item.label}</span>
           <div className="flex items-baseline flex-wrap">
             <span className={`font-mono text-lg font-bold ${item.className ?? 'text-app-text'}`}>
               {item.value}
             </span>
             {item.delta}
             {item.id === 'error_rate' && chaosActive && (
               <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-status-warn border border-status-warn/30 bg-status-warn/5 w-full">
                 <Zap className="w-2.5 h-2.5" />
                 {t('hero.kpi.chaos_active')}
               </span>
             )}
             {item.footnote && (
               <div className="text-[9px] text-status-ok/80 mt-1">
                 {item.footnote}
               </div>
             )}
           </div>
        </m.div>
      ))}
    </m.div>
  );
}

export default KpiStrip;
