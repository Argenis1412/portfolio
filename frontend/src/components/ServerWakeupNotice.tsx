import { useState, useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { RefreshCw } from 'lucide-react';



export default function ServerWakeupNotice() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [showLoading, setShowLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (isFetching === 0 && isMutating === 0) {
      const t = setTimeout(() => setShowLoading(false), 0);
      return () => clearTimeout(t);
    }

    // Mostrar toast solo si tarda más de 2.5s
    const timeout = setTimeout(() => setShowLoading(true), 2500);
    return () => {
      clearTimeout(timeout);
    };
  }, [isFetching, isMutating]);

  if (!showLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 bg-app-surface/95 backdrop-blur-md border border-app-primary/50 text-app-text p-4 rounded-xl shadow-[0_0_20px_rgba(212,163,115,0.2)] z-50 flex items-start gap-4 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500"
    >
      <div className="w-5 h-5 border-2 border-app-primary border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
      <p className="text-sm font-medium leading-relaxed">
        {t('server.wakeup.loading')}
      </p>
    </div>
  );
}

/**
 * Componente separado para el estado de error de cold start.
 * Se usa en cada sección que tenga isError de React Query.
 */
export function ServerWakeupError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4 py-12 px-4 text-center">
      <div className="text-4xl">⏱️</div>
      <p className="text-app-muted text-sm max-w-sm leading-relaxed">
        {t('server.wakeup.error')}
      </p>
      <button
        onClick={onRetry ?? (() => window.location.reload())}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-app-primary/10 border border-app-primary/30 text-app-primary text-sm font-medium hover:bg-app-primary/20 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        {t('loading')}
      </button>
    </div>
  );
}
