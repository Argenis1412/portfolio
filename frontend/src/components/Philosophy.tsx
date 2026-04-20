import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { usePhilosophy } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import type { LocalizedString } from '../api';
import Skeleton from './ui/Skeleton';

function localize(obj: LocalizedString, lang: string): string {
  return obj[lang as keyof LocalizedString] ?? obj.en;
}

export default function Philosophy() {
  const { data: inspirations = [], isLoading } = usePhilosophy();
  const { language, t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const effectiveActiveId = activeId || (inspirations.length > 0 ? inspirations[0].id.toString() : null);

  const handleImgError = (id: string) =>
    setImgErrors(prev => ({ ...prev, [id]: true }));

  if (isLoading) {
    return (
      <section id="philosophy" className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <Skeleton className="h-10 w-64 mx-auto mb-16" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/4 flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="md:w-3/4">
              <Skeleton className="h-8 w-1/2 mb-4" />
              <Skeleton className="h-48 w-48 mb-6" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (inspirations.length === 0) return null;

  const activeInspiration = inspirations.find(i => i.id.toString() === effectiveActiveId) || inspirations[0];
  const imgFailed = imgErrors[activeInspiration.id];

  return (
    <section id="philosophy" className="py-20 relative overflow-hidden transition-colors duration-300 group">
      <div className="max-w-6xl mx-auto px-4">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-center text-app-text tracking-widest">
              {t('philosophy.title')}
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-8 min-h-[400px]">
            {/* Tabs List */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar border-b md:border-b-0 md:border-l border-app-border w-full md:w-1/4 flex-shrink-0">
              {inspirations.map((item) => {
                const isActive = effectiveActiveId === item.id.toString();

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id.toString())}
                    className={`
                      px-5 py-4 text-sm text-left transition-all duration-300 border-b-2 md:border-b-0 md:border-l-2 -mb-[2px] md:-mb-0 md:-ml-[1px]
                      ${isActive 
                        ? 'bg-app-primary/5 border-app-primary' 
                        : 'hover:bg-app-surface-hover border-transparent'}
                    `}
                  >
                    <div className="flex flex-col">
                      <span className={`font-mono text-base ${isActive ? 'text-app-primary' : 'text-app-muted hover:text-app-text'}`}>
                        {item.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tab Panel */}
            <div className="w-full md:w-3/4 md:pl-4">
              <AnimatePresence mode="wait">
                <m.div
                  key={activeInspiration.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col sm:flex-row-reverse gap-6 sm:gap-16 items-start"
                >
                  {/* Photo Profile */}
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-56 h-56 md:w-80 md:h-80 rounded-full overflow-hidden border-2 border-app-primary/30 shadow-[0_0_40px_rgba(212,163,115,0.15)] bg-app-surface-hover">
                      {imgFailed ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-20 h-20 text-app-muted" />
                        </div>
                      ) : (
                         <img
                          src={activeInspiration.image_url}
                          alt={activeInspiration.name}
                          loading="lazy"
                          draggable={false}
                          onError={() => handleImgError(activeInspiration.id)}
                          className="w-full h-full object-cover object-top"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 mt-2">
                    <h3 className="text-xl md:text-2xl font-bold text-app-text mb-1">
                      {activeInspiration.name}
                    </h3>
                    <p className="text-sm font-mono text-app-primary tracking-widest mb-6">
                      {localize(activeInspiration.role, language)}
                    </p>
                    
                    <p className="text-app-muted leading-relaxed">
                      {localize(activeInspiration.description, language)}
                    </p>
                  </div>
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
