import React, { useState, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { postChaosSpike, postChaosFailure, type ChaosResponse } from '../api';

interface LogEntry {
  id: number;
  type: 'spike' | 'failure' | 'error';
  message: string;
  timestamp: string;
}

const COOLDOWN_SECONDS = 30;

export default function ChaosPlayground() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [spikeLoading, setSpikeLoading] = useState(false);
  const [failureLoading, setFailureLoading] = useState(false);
  const [spikeCooldown, setSpikeCooldown] = useState(0);
  const [failureCooldown, setFailureCooldown] = useState(0);
  const idRef = useRef(0);

  const startCooldown = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      id: ++idRef.current,
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const invalidateMetrics = useCallback(() => {
    // Force metrics to refetch immediately so the dashboard reacts
    queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
  }, [queryClient]);

  const handleSpike = useCallback(async () => {
    if (spikeLoading || spikeCooldown > 0) return;
    setSpikeLoading(true);
    try {
      const res: ChaosResponse = await postChaosSpike();
      addLog(
        'spike',
        t('chaos.log.spike_ok', {
          n: res.requests_sent ?? 0,
          t: ((res.elapsed_ms ?? 0) / 1000).toFixed(1),
          d: res.requests_dropped ?? 0,
        }),
      );
      invalidateMetrics();
      startCooldown(setSpikeCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog('error', t('chaos.log.error', { msg }));
    } finally {
      setSpikeLoading(false);
    }
  }, [spikeLoading, spikeCooldown, t, addLog, invalidateMetrics, startCooldown]);

  const handleFailure = useCallback(async () => {
    if (failureLoading || failureCooldown > 0) return;
    setFailureLoading(true);
    try {
      const res: ChaosResponse = await postChaosFailure();
      addLog(
        'failure',
        t('chaos.log.failure_ok', { t: res.recovery_ms ?? 0 }),
      );
      invalidateMetrics();
      startCooldown(setFailureCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog('error', t('chaos.log.error', { msg }));
    } finally {
      setFailureLoading(false);
    }
  }, [failureLoading, failureCooldown, t, addLog, invalidateMetrics, startCooldown]);

  const spikeDisabled = spikeLoading || spikeCooldown > 0;
  const failureDisabled = failureLoading || failureCooldown > 0;

  return (
    <section
      aria-label="Chaos Playground"
      className="px-4 max-w-6xl mx-auto py-8"
    >
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-2xl p-6 md:p-8 border border-app-border"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">🔥</span>
          <h3 className="font-mono text-lg font-bold text-app-text uppercase tracking-wider">
            {t('chaos.title')}
          </h3>
        </div>

        <p className="text-sm text-app-muted mb-1 max-w-lg">
          {t('chaos.subtitle')}
        </p>

        {/* Honest disclaimer */}
        <p className="text-xs font-mono text-app-muted/70 mb-6 max-w-lg italic">
          {t('chaos.disclaimer')}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleSpike}
            disabled={spikeDisabled}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200 ${
              spikeDisabled
                ? 'bg-app-surface-hover text-app-muted cursor-not-allowed opacity-60'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 active:scale-[0.97]'
            }`}
          >
            {spikeLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                {t('chaos.spike_running')}
              </>
            ) : spikeCooldown > 0 ? (
              t('chaos.cooldown', { s: spikeCooldown })
            ) : (
              <>⚡ {t('chaos.spike')}</>
            )}
          </button>

          <button
            onClick={handleFailure}
            disabled={failureDisabled}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200 ${
              failureDisabled
                ? 'bg-app-surface-hover text-app-muted cursor-not-allowed opacity-60'
                : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50 active:scale-[0.97]'
            }`}
          >
            {failureLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                {t('chaos.failure_running')}
              </>
            ) : failureCooldown > 0 ? (
              t('chaos.cooldown', { s: failureCooldown })
            ) : (
              <>💥 {t('chaos.failure')}</>
            )}
          </button>
        </div>

        {/* Response log */}
        <AnimatePresence mode="popLayout">
          {logs.length > 0 && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl bg-app-bg/60 border border-app-border p-4 mb-5 font-mono text-xs space-y-1.5 max-h-[200px] overflow-y-auto"
            >
              {logs.map((entry) => (
                <m.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <span className="text-app-muted flex-shrink-0">{entry.timestamp}</span>
                  <span
                    className={
                      entry.type === 'error'
                        ? 'text-red-400'
                        : entry.type === 'failure'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }
                  >
                    {entry.type === 'error' ? '✗' : entry.type === 'failure' ? '⚠' : '✓'}
                  </span>
                  <span className="text-app-text">{entry.message}</span>
                </m.div>
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {/* War story narrative */}
        <div className="border-t border-app-border pt-4">
          <p className="text-sm text-app-muted italic leading-relaxed">
            "{t('chaos.narrative')}"
          </p>
        </div>
      </m.div>
    </section>
  );
}
