import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User } from 'lucide-react';
import { usePhilosophy } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import type { LocalizedString } from '../api';
import Skeleton from './ui/Skeleton';

/** Returns the string for the active language from a LocalizedString object. */
function localize(obj: LocalizedString, lang: string): string {
  return obj[lang as keyof LocalizedString] ?? obj.en;
}

export default function Philosophy() {
  const { data: inspirations = [], isLoading } = usePhilosophy();
  const { language, t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section
      id="philosophy"
      aria-labelledby="philosophy-heading"
      className="py-20 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,163,115,0.07),transparent)]"
      />

      <div className="max-w-4xl mx-auto px-4">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2
            id="philosophy-heading"
            className="text-3xl md:text-5xl font-bold text-app-text tracking-tight"
          >
            {t('philosophy.title')}
          </h2>
          <div
            aria-hidden="true"
            className="mt-4 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-app-primary to-transparent"
          />
        </motion.div>

        {/* Card list */}
        <div
          role="list"
          className="space-y-4"
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            : inspirations.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const tooltip = isExpanded
                  ? t('philosophy.collapse_tooltip')
                  : t('philosophy.expand_tooltip');

                return (
                  <motion.div
                    key={item.id}
                    role="listitem"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.45, delay: index * 0.07 }}
                    className="glass rounded-xl border border-app-border overflow-hidden hover:border-app-primary/50 transition-colors duration-300"
                  >
                    {/* Card header — always visible, acts as trigger */}
                    <button
                      id={`philosophy-btn-${item.id}`}
                      aria-expanded={isExpanded}
                      aria-controls={`philosophy-panel-${item.id}`}
                      title={tooltip}
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                    >
                      {/* Avatar / image */}
                      <div
                        aria-hidden="true"
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-app-surface-hover border border-app-border flex items-center justify-center overflow-hidden"
                      >
                        <img
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                          className="w-full h-full object-cover"
                        />
                        {/* Fallback icon shown on image error via JS above */}
                        <span hidden>
                          <User className="w-6 h-6 text-app-muted" />
                        </span>
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-app-text truncate">{item.name}</p>
                        <p className="text-sm text-app-primary truncate">
                          {localize(item.role, language)}
                        </p>
                      </div>

                      {/* Chevron indicator */}
                      <motion.div
                        aria-hidden="true"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex-shrink-0 text-app-muted"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </button>

                    {/* Expandable panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.section
                          id={`philosophy-panel-${item.id}`}
                          role="region"
                          aria-labelledby={`philosophy-btn-${item.id}`}
                          key="panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-6 pt-1 border-t border-app-border/60">
                            <p className="text-app-text leading-relaxed text-sm md:text-base">
                              {localize(item.description, language)}
                            </p>
                          </div>
                        </motion.section>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
        </div>
      </div>
    </section>
  );
}
