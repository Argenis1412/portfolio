import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User } from 'lucide-react';
import { usePhilosophy } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import type { LocalizedString } from '../api';
import Skeleton from './ui/Skeleton';

/** Returns the localized string for the active language. */
function localize(obj: LocalizedString, lang: string): string {
  return obj[lang as keyof LocalizedString] ?? obj.en;
}

export default function Philosophy() {
  const { data: inspirations = [], isLoading } = usePhilosophy();
  const { language, t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id));

  const handleImgError = (id: string) =>
    setImgErrors(prev => ({ ...prev, [id]: true }));

  return (
    <section
      id="philosophy"
      aria-labelledby="philosophy-heading"
      className="py-20 relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,163,115,0.07),transparent)]"
      />

      <div className="max-w-4xl mx-auto px-4">
        {/* Heading */}
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
        </motion.div>

        {/* Cards */}
        <div role="list" className="space-y-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            : inspirations.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const imgFailed = imgErrors[item.id];

                return (
                  <motion.div
                    key={item.id}
                    role="listitem"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.45, delay: index * 0.07 }}
                    className="glass rounded-xl border border-app-border overflow-hidden hover:border-app-primary/40 transition-colors duration-300"
                  >
                    {/* ── Collapsed header (always visible) ── */}
                    <button
                      id={`philosophy-btn-${item.id}`}
                      aria-expanded={isExpanded}
                      aria-controls={`philosophy-panel-${item.id}`}
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                    >
                      {/* Avatar in header - Hidden when expanded to avoid saturation */}
                      <AnimatePresence>
                        {!isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, width: 0, marginRight: 0 }}
                            animate={{ opacity: 1, width: 48, marginRight: 16 }}
                            exit={{ opacity: 0, width: 0, marginRight: 0 }}
                            transition={{ duration: 0.3 }}
                            aria-hidden="true"
                            className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border border-app-border bg-app-surface-hover flex items-center justify-center"
                          >
                            {imgFailed ? (
                              <User className="w-6 h-6 text-app-muted" />
                            ) : (
                              <img
                                src={item.image_url}
                                alt=""
                                loading="lazy"
                                draggable={false}
                                onError={() => handleImgError(item.id)}
                                className="w-full h-full object-cover object-top"
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-app-text truncate">{item.name}</p>
                        <p className="text-sm text-app-primary truncate">
                          {localize(item.role, language)}
                        </p>
                      </div>

                      {/* Chevron */}
                      <motion.div
                        aria-hidden="true"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex-shrink-0 text-app-muted"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </button>

                    {/* ── Expanded panel ── */}
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
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-6 pt-3 border-t border-app-border/60">
                            <div className="flex flex-col sm:flex-row gap-5 items-start">

                              {/* ── Large photo (Shown only here when expanded) ── */}
                              {!imgFailed && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.75 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  className="flex-shrink-0 self-center sm:self-start"
                                >
                                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-app-primary/30 shadow-[0_0_30px_rgba(212,163,115,0.2)]">
                                    <img
                                      src={item.image_url}
                                      alt={item.name}
                                      loading="lazy"
                                      draggable={false}
                                      onError={() => handleImgError(item.id)}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  </div>
                                </motion.div>
                              )}

                              {/* ── Description ── */}
                              <motion.p
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="text-app-text leading-relaxed text-sm md:text-base pt-2"
                              >
                                {localize(item.description, language)}
                              </motion.p>
                            </div>
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
