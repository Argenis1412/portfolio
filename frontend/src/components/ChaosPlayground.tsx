/**
 * ChaosPlayground — Redesigned as an operational control panel.
 *
 * Three action cards (Spike / Failure / Cache Stress).
 * Active Incidents panel with TTL tracking.
 * Terminal-style log with request_id and structured format.
 * Writes events to shared LogContext.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { postChaosSpike, postChaosFailure, postChaosCache, type ChaosResponse } from '../api';
import { useLog } from '../hooks/useLog';
import { emitTrace } from '../services/TraceEmitter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalEntry {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  requestId: string;
  timestamp: string;
}

// Shared trace store moved to src/services/TraceEmitter.ts

function genReqId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

const COOLDOWN_SECONDS = 30;

// ─── Action Card ─────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: string;
  titleKey: string;
  descKey: string;
  accentClass: string;
  borderClass: string;
  hoverClass: string;
  loading: boolean;
  cooldown: number;
  loadingKey: string;
  actionKey: string;
  disabled: boolean;
  onClick: () => void;
  disclaimer?: string;
}

function ActionCard({
  icon, titleKey, descKey, accentClass, borderClass, hoverClass,
  loading, cooldown, loadingKey, actionKey, disabled, onClick, disclaimer,
}: ActionCardProps) {
  const { t } = useLanguage();
  return (
    <div className={`glass rounded-xl p-4 flex flex-col gap-3 border ${borderClass} transition-all duration-200`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className={`font-mono text-sm font-bold ${accentClass}`}>{t(titleKey)}</span>
      </div>
      <p className="text-xs text-app-muted leading-relaxed">{t(descKey)}</p>
      {disclaimer && (
        <p className="text-[10px] font-mono text-app-muted/60 italic">{disclaimer}</p>
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all duration-200 mt-auto ${
          disabled
            ? 'bg-app-surface-hover text-app-muted cursor-not-allowed opacity-60'
            : `${hoverClass} border ${borderClass} active:scale-[0.97]`
        }`}
      >
        {loading ? (
          <>
            <span className={`w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin`} />
            {t(loadingKey)}
          </>
        ) : cooldown > 0 ? (
          `Cooldown (${cooldown}s)`
        ) : (
          t(actionKey)
        )}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChaosPlayground() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { addEntry, incidents, addIncident } = useLog();

  // Terminal log (local, lightweight)
  const [terminal, setTerminal] = useState<TerminalEntry[]>([]);
  const termIdRef = useRef(0);

  // Loading states
  const [spikeLoading, setSpikeLoading] = useState(false);
  const [failureLoading, setFailureLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);

  // Cooldowns
  const [spikeCooldown, setSpikeCooldown] = useState(0);
  const [failureCooldown, setFailureCooldown] = useState(0);
  const [cacheCooldown, setCacheCooldown] = useState(0);

  const [, setTick] = useState(0); // forces re-render for TTL countdown

  // Tick timer for TTL display — only for UI re-renders, state is global
  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const startCooldown = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(COOLDOWN_SECONDS);
    const iv = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const addTerminalEntry = useCallback((level: TerminalEntry['level'], message: string, requestId: string) => {
    const entry: TerminalEntry = {
      id: ++termIdRef.current,
      level,
      message,
      requestId,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
    setTerminal((prev) => [entry, ...prev].slice(0, 12));
  }, []);

  const invalidateMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
  }, [queryClient]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSpike = useCallback(async () => {
    if (spikeLoading || spikeCooldown > 0) return;
    setSpikeLoading(true);
    const rid = genReqId();
    addTerminalEntry('INFO', `chaos.spike triggered request_id=${rid}`, rid);
    addEntry('INFO', 'chaos.spike status=TRIGGERED type=TRAFFIC_SPIKE', rid);
    try {
      const res: ChaosResponse = await postChaosSpike();
      const elapsed = res.elapsed_ms ?? 0;
      addTerminalEntry('WARN', `traffic.spike completed requests=${res.requests_sent ?? 0} dropped=${res.requests_dropped ?? 0} elapsed_ms=${elapsed} request_id=${rid}`, rid);
      addEntry('WARN', `traffic.spike status=COMPLETED elapsed_ms=${elapsed} dropped=${res.requests_dropped ?? 0}`, rid);
      addIncident('traffic_spike', 'chaos.action.spike.title');
      emitTrace({
        id: `trace-${rid}`,
        requestId: rid,
        type: 'traffic_spike',
        endpoint: '/chaos/spike',
        status: 'ok',
        totalMs: elapsed,
        apiMs: Math.round(elapsed * 0.15),
        dbMs: Math.round(elapsed * 0.70),
        cacheMs: Math.round(elapsed * 0.15),
        timestamp: new Date(),
      });
      invalidateMetrics();
      startCooldown(setSpikeCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `chaos.spike failed error="${msg}" request_id=${rid}`, rid);
      addEntry('ERROR', `chaos.spike status=FAILED error="${msg}"`, rid);
    } finally {
      setSpikeLoading(false);
    }
  }, [spikeLoading, spikeCooldown, addTerminalEntry, addEntry, addIncident, invalidateMetrics, startCooldown]);

  const handleFailure = useCallback(async () => {
    if (failureLoading || failureCooldown > 0) return;
    setFailureLoading(true);
    const rid = genReqId();
    addTerminalEntry('INFO', `chaos.failure triggered request_id=${rid}`, rid);
    addEntry('INFO', 'chaos.failure status=TRIGGERED type=FORCED_503', rid);
    try {
      const res: ChaosResponse = await postChaosFailure();
      const recovery = res.recovery_ms ?? 0;
      addTerminalEntry('WARN', `forced.failure 503 triggered recovery_ms=${recovery} request_id=${rid}`, rid);
      addEntry('WARN', `forced.failure status=503 recovery_ms=${recovery}`, rid);
      addIncident('forced_failure', 'chaos.action.failure.title');
      emitTrace({
        id: `trace-${rid}`,
        requestId: rid,
        type: 'forced_failure',
        endpoint: '/chaos/failure',
        status: 'error',
        totalMs: recovery,
        apiMs: Math.round(recovery * 0.10),
        dbMs: Math.round(recovery * 0.80),
        cacheMs: Math.round(recovery * 0.10),
        timestamp: new Date(),
      });
      invalidateMetrics();
      startCooldown(setFailureCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `chaos.failure error="${msg}" request_id=${rid}`, rid);
      addEntry('ERROR', `chaos.failure status=FAILED error="${msg}"`, rid);
    } finally {
      setFailureLoading(false);
    }
  }, [failureLoading, failureCooldown, addTerminalEntry, addEntry, addIncident, invalidateMetrics, startCooldown]);

  const handleCache = useCallback(async () => {
    if (cacheLoading || cacheCooldown > 0) return;
    setCacheLoading(true);
    const rid = genReqId();
    addTerminalEntry('INFO', `cache.stress triggered requests=10 request_id=${rid}`, rid);
    addEntry('INFO', 'cache.stress status=TRIGGERED type=CACHE_STRESS', rid);
    try {
      const res = await postChaosCache();
      addTerminalEntry('INFO', `cache.stress completed requests_sent=${res.requests_sent} elapsed_ms=${res.elapsed_ms} request_id=${rid}`, rid);
      addEntry('INFO', `cache.stress status=DONE requests=${res.requests_sent} elapsed_ms=${res.elapsed_ms}`, rid);
      addIncident('cache_stress', 'chaos.action.cache.title');
      emitTrace({
        id: `trace-${rid}`,
        requestId: rid,
        type: 'cache_stress',
        endpoint: '/sobre, /stack, /projetos×3',
        status: 'ok',
        totalMs: res.elapsed_ms,
        apiMs: Math.round(res.elapsed_ms * 0.20),
        dbMs: Math.round(res.elapsed_ms * 0.30),
        cacheMs: Math.round(res.elapsed_ms * 0.50),
        timestamp: new Date(),
      });
      startCooldown(setCacheCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `cache.stress failed error="${msg}" request_id=${rid}`, rid);
      addEntry('ERROR', `cache.stress status=FAILED error="${msg}"`, rid);
    } finally {
      setCacheLoading(false);
    }
  }, [cacheLoading, cacheCooldown, addTerminalEntry, addEntry, addIncident, startCooldown]);

  const activeIncidents = incidents.filter((i) => Date.now() - i.startedAt < i.ttl);
  const resolvedIncidents = incidents.filter((i) => Date.now() - i.startedAt >= i.ttl);

  return (
    <section id="chaos" aria-label="Chaos Playground" className="px-4 max-w-6xl mx-auto py-12">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
            {t('chaos.title')}
          </h2>
          <p className="text-sm text-app-muted max-w-lg">{t('chaos.subtitle')}</p>
          <p className="text-xs font-mono text-app-primary/70 mt-1">{t('chaos.note')}</p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <ActionCard
            icon="⚡"
            titleKey="chaos.action.spike.title"
            descKey="chaos.action.spike.desc"
            accentClass="text-amber-400"
            borderClass="border-amber-500/20"
            hoverClass="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            loading={spikeLoading}
            cooldown={spikeCooldown}
            loadingKey="chaos.spike_running"
            actionKey="chaos.action.spike.title"
            disabled={spikeLoading || spikeCooldown > 0}
            onClick={handleSpike}
          />
          <ActionCard
            icon="💥"
            titleKey="chaos.action.failure.title"
            descKey="chaos.action.failure.desc"
            accentClass="text-red-400"
            borderClass="border-red-500/20"
            hoverClass="bg-red-500/10 text-red-400 hover:bg-red-500/20"
            loading={failureLoading}
            cooldown={failureCooldown}
            loadingKey="chaos.failure_running"
            actionKey="chaos.action.failure.title"
            disabled={failureLoading || failureCooldown > 0}
            onClick={handleFailure}
          />
          <ActionCard
            icon="🗄"
            titleKey="chaos.action.cache.title"
            descKey="chaos.action.cache.desc"
            accentClass="text-blue-400"
            borderClass="border-blue-500/20"
            hoverClass="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            loading={cacheLoading}
            cooldown={cacheCooldown}
            loadingKey="chaos.action.cache.running"
            actionKey="chaos.action.cache.title"
            disabled={cacheLoading || cacheCooldown > 0}
            onClick={handleCache}
            disclaimer={t('chaos.action.cache.disclaimer')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* Active Incidents panel */}
          <div className="glass rounded-xl p-4 border border-app-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono uppercase tracking-widest text-app-muted">Incident History</span>
              {activeIncidents.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            
            {incidents.length === 0 ? (
              <p className="text-xs font-mono text-app-muted/50">{t('chaos.incidents.empty')}</p>
            ) : (
              <div className="space-y-4">
                {/* Active/Mitigating */}
                {activeIncidents.length > 0 && (
                  <div className="space-y-2">
                    {activeIncidents.map((inc) => {
                      const elapsed = Date.now() - inc.startedAt;
                      const remaining = Math.max(0, Math.ceil((inc.ttl - elapsed) / 1000));
                      const isInvestigating = elapsed < 5000;
                      
                      return (
                        <div key={inc.id} className="flex flex-col gap-1 border-l-2 border-amber-500/30 pl-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                              {t(inc.labelKey)}
                            </span>
                            <span className="text-[10px] font-mono text-app-muted opacity-60">
                              {remaining}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isInvestigating 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                            }`}>
                              {isInvestigating ? 'INVESTIGATING' : 'MITIGATING'}
                            </span>
                            <div className="flex-grow h-[2px] bg-app-border/30 rounded-full overflow-hidden">
                              <m.div 
                                initial={{ width: '100%' }}
                                animate={{ width: `${(remaining / (inc.ttl/1000)) * 100}%` }}
                                className="h-full bg-amber-500/40"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Resolved */}
                {resolvedIncidents.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-app-border/20">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-app-muted/60 block mb-2">Resolved</span>
                    {resolvedIncidents.slice(0, 3).map((inc) => (
                      <div key={inc.id} className="flex items-center justify-between opacity-50">
                        <span className="text-[10px] font-mono text-app-text">{t(inc.labelKey)}</span>
                        <span className="text-[9px] font-mono text-emerald-500/70">RESOLVED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terminal log */}
          <AnimatePresence mode="popLayout">
            <div className="rounded-xl bg-[#0a0a0a] border border-app-border p-4 font-mono text-xs overflow-y-auto max-h-[220px]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                <span className="text-[10px] text-app-muted/50 ml-2 uppercase tracking-widest">chaos-log</span>
              </div>
              {terminal.length === 0 ? (
                <p className="text-app-muted/40">{'>'} {t('logs.waiting')}</p>
              ) : (
                terminal.map((entry) => (
                  <m.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 mb-1"
                  >
                    <span className="text-app-muted/50 flex-shrink-0">[{entry.timestamp}]</span>
                    <span className={
                      entry.level === 'ERROR' ? 'text-red-400 flex-shrink-0' :
                      entry.level === 'WARN' ? 'text-amber-400 flex-shrink-0' :
                      'text-emerald-400/70 flex-shrink-0'
                    }>{entry.level.padEnd(5)}</span>
                    <span className="text-app-text/80 break-all">{entry.message}</span>
                  </m.div>
                ))
              )}
            </div>
          </AnimatePresence>
        </div>
      </m.div>
    </section>
  );
}
