import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { scrollToSection } from '../utils/scrollToSection';
import { useLiveMetrics, type SystemStatus } from '../hooks/useLiveMetrics';

// ─── LiveStatusBadge ────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
  SystemStatus,
  { dot: string; text: string; i18nKey: string }
> = {
  loading:     { dot: 'bg-app-muted animate-pulse',   text: 'text-app-muted',   i18nKey: 'metrics.status.loading' },
  operational: { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-500', i18nKey: 'metrics.api_live' },
  degraded:    { dot: 'bg-amber-400',                 text: 'text-amber-400',   i18nKey: 'metrics.status.degraded' },
  down:        { dot: 'bg-red-500',                   text: 'text-red-500',     i18nKey: 'metrics.status.down' },
};

function LiveStatusBadge({ status, latencyMs }: { status: SystemStatus; latencyMs?: number }) {
  const { t } = useLanguage();
  const cfg = BADGE_CONFIG[status];
  return (
    <span
      title={t('metrics.latency_tooltip')}
      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-app-border bg-app-surface/60 backdrop-blur-sm select-none"
    >
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={cfg.text}>
        {t(cfg.i18nKey)}
        {status === 'operational' && latencyMs !== undefined && (
          <span className="text-app-muted ml-1">· {latencyMs}ms</span>
        )}
        {status === 'degraded' && latencyMs !== undefined && (
          <span className="text-app-muted ml-1">· {latencyMs}ms</span>
        )}
      </span>
    </span>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  const { status, data } = useLiveMetrics();

  return (
    <section id="hero" className="pt-20 pb-12 md:pt-28 md:pb-20 px-4 max-w-6xl mx-auto relative overflow-hidden min-h-screen flex items-center">
      {/* Background decoration - very subtle copper glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-app-primary/5 rounded-full blur-[120px] -z-10"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.8 }}
        className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
      >
        <div className="text-center md:text-left order-2 md:order-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 text-app-text"
          >
            {t('hero.title')}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-5"
          >
            <LiveStatusBadge status={status} latencyMs={data?.p95_ms} />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-4 text-lg md:text-xl text-app-muted mb-10 max-w-xl mx-auto md:mx-0 whitespace-pre-line"
          >
            {t('hero.subtitle')}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-center md:justify-start gap-4"
          >
            <button
              onClick={() => scrollToSection('projects')}
              className="bg-app-primary hover:bg-app-primary-hover text-white font-bold py-3 px-8 rounded-full transition-smooth premium-shadow"
            >
              {t('nav.projects')}
            </button>
            <button
              data-testid="hero-contact-cta"
              onClick={() => scrollToSection('contato')}
              className="bg-transparent hover:bg-app-surface-hover text-app-text font-semibold py-3 px-8 rounded-full transition-smooth border border-app-border"
            >
              {t('nav.contact')}
            </button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 1 }}
          className="order-1 md:order-2 flex justify-center md:justify-end relative mr-0 md:mr-4"
        >
          {/* Intense bronze glow background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[308px] h-[308px] md:w-[430px] md:h-[430px] bg-app-primary/20 rounded-full blur-[70px] -z-10 animate-pulse"></div>
          
          <div className="relative w-[276px] h-[276px] md:w-[368px] md:h-[368px] rounded-full p-1.5 bg-gradient-to-tr from-app-primary to-transparent shadow-[0_0_30px_rgba(212,163,115,0.3)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-app-surface-hover flex items-center justify-center relative">
               <picture>
                 <source srcSet="/profile.webp" type="image/webp" />
                 <img 
                   src="/profile.jpg" 
                   alt="Profile" 
                   fetchPriority="high"
                   className="w-full h-full object-cover rounded-full filter grayscale-[10%] brightness-110" 
                 />
               </picture>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
