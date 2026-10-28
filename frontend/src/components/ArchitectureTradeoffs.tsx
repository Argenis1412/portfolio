import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

export default function ArchitectureTradeoffs() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const tradeOffs = ['json', 'delivery', 'protection'] as const;

  return (
    <section id="tradeoffs" className="px-4 max-w-6xl mx-auto py-12">
      <div className="mb-8">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
          {t('tradeoffs.title')}
        </h2>
        <p className="text-sm text-app-muted">{t('tradeoffs.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tradeOffs.map((id, i) => (
          <m.div
            key={id}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl border border-app-border/40 bg-app-surface/20 hover:bg-app-primary/5 transition-colors duration-300"
          >
            <h3 className="text-sm font-bold text-app-text mb-3">{t(`tradeoffs.${id}.title`)}</h3>
            <p className="text-xs text-app-muted leading-relaxed mb-4">
              {t(`tradeoffs.${id}.desc`)}
            </p>

            <div className="pt-4 border-t border-app-border/20">
              <div className="text-[9px] font-mono text-app-muted uppercase tracking-wider mb-1">{t('tradeoffs.limit_label')}</div>
              <div className="text-[11px] font-mono text-app-primary font-bold">
                {t(`tradeoffs.${id}.limit`)}
              </div>
            </div>
          </m.div>
        ))}
      </div>
    </section>
  );
}
