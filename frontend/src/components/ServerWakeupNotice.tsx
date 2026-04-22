import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics } from '../hooks/useLiveMetrics';
import ErrorNotification from './ui/ErrorNotification';
import { ApiError } from '../api/client';

/**
 * ServerWakeupNotice — driven by useLiveMetrics as the single source of truth.
 *
 * - 'loading': shows a spinner toast after 2.5s (cold-start UX)
 * - 'down' / 'degraded': shows ErrorNotification with traceId + lastSuccessAt
 * - 'operational': both notices disappear automatically
 */
export default function ServerWakeupNotice() {
  const { status, isLoading, isError, error, lastSuccessAt } = useLiveMetrics();
  const [showSpinner, setShowSpinner] = useState(false);
  const { t } = useLanguage();

  // Only show spinner if initial load takes more than 2.5s
  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 2500);
    return () => {
      clearTimeout(timer);
      setShowSpinner(false);
    };
  }, [isLoading]);

  // Extract traceId from the error if it's an ApiError instance
  const traceId =
    isError && error instanceof ApiError ? error.traceId : undefined;

  const errorVisible = status === 'down';

  return (
    <>
      {/* Spinner toast — only during initial cold start > 2.5s */}
      {showSpinner && (
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
      )}

      {/* Error notification — shown when status is 'down' */}
      <ErrorNotification
        visible={errorVisible}
        traceId={traceId}
        lastSuccessAt={lastSuccessAt}
      />
    </>
  );
}

/**
 * Standalone error state for individual sections (isError from React Query).
 * Unchanged — used by Skills, Projects etc. independently.
 */
import { RefreshCw } from 'lucide-react';

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
