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
import { postChaosDrain, postChaosRetry, postChaosLatency, type ChaosResponse } from '../api/chaosService';
import { useLog } from '../hooks/useLog';
import { useChaosMode, type ChaosPreset } from '../hooks/useChaosMode';
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
          t('chaos.cooldown', { s: cooldown })
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
  const { preset, setPreset } = useChaosMode();

  // Terminal log (local, lightweight)
  const [terminal, setTerminal] = useState<TerminalEntry[]>([]);
  const termIdRef = useRef(0);

  // Loading states
  const [drainLoading, setDrainLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [latencyLoading, setLatencyLoading] = useState(false);

  // Cooldowns
  const [drainCooldown, setDrainCooldown] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const [latencyCooldown, setLatencyCooldown] = useState(0);

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

  const handleDrain = useCallback(async () => {
    if (drainLoading || drainCooldown > 0) return;
    setDrainLoading(true);
    const rid = genReqId();
    const traceId = `trace-${rid}`;
    addTerminalEntry('INFO', `chaos.drain triggered request_id=${rid} trace_id=${traceId}`, rid);
    addEntry('INFO', `chaos.drain status=TRIGGERED type=QUEUE_DRAIN trace_id=${traceId}`, rid);
    try {
      const res: ChaosResponse = await postChaosDrain();
      const purged = res.tasks_purged ?? 0;
      addTerminalEntry('WARN', `queue.drain completed tasks_purged=${purged} request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('WARN', `queue.drain status=COMPLETED tasks_purged=${purged} trace_id=${traceId}`, rid);
      addIncident('queue_drain', 'chaos.action.drain.title', {
        impactPct: '0%',
        durationMs: res.elapsed_ms ?? 50,
        origin: 'synthetic',
      });
      emitTrace({ id: `trace-${rid}`, traceId, requestId: rid, type: 'queue_drain', origin: 'synthetic', endpoint: '/chaos/drain', status: 'ok', totalMs: 50, apiMs: 10, dbMs: 40, cacheMs: 0, timestamp: new Date(), impactPct: '0%', latencyDelta: '-40ms', durationMs: res.elapsed_ms ?? 50 });
      invalidateMetrics();
      startCooldown(setDrainCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `chaos.drain failed error="${msg}" request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('ERROR', `chaos.drain status=FAILED error="${msg}" trace_id=${traceId}`, rid);
    } finally { setDrainLoading(false); }
  }, [drainLoading, drainCooldown, addTerminalEntry, addEntry, addIncident, invalidateMetrics, startCooldown]);

  const handleRetry = useCallback(async () => {
    if (retryLoading || retryCooldown > 0) return;
    setRetryLoading(true);
    const rid = genReqId();
    const traceId = `trace-${rid}`;
    addTerminalEntry('INFO', `chaos.retry triggered request_id=${rid} trace_id=${traceId}`, rid);
    addEntry('INFO', `chaos.retry status=TRIGGERED type=MANUAL_RETRY trace_id=${traceId}`, rid);
    try {
      await postChaosRetry();
      addTerminalEntry('INFO', `manual.retry dispatched request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('INFO', `manual.retry status=COMPLETED trace_id=${traceId}`, rid);
      addIncident('manual_retry', 'chaos.action.retry.title', {
        impactPct: '5%',
        durationMs: 120,
        origin: 'synthetic',
      });
      emitTrace({ id: `trace-${rid}`, traceId, requestId: rid, type: 'manual_retry', origin: 'synthetic', endpoint: '/chaos/retry', status: 'ok', totalMs: 120, apiMs: 20, dbMs: 100, cacheMs: 0, timestamp: new Date(), impactPct: '5%', latencyDelta: '+80ms', durationMs: 120 });
      invalidateMetrics();
      startCooldown(setRetryCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `chaos.retry failed error="${msg}" request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('ERROR', `chaos.retry status=FAILED error="${msg}" trace_id=${traceId}`, rid);
    } finally { setRetryLoading(false); }
  }, [retryLoading, retryCooldown, addTerminalEntry, addEntry, addIncident, invalidateMetrics, startCooldown]);

  const handleLatency = useCallback(async () => {
    if (latencyLoading || latencyCooldown > 0) return;
    setLatencyLoading(true);
    const rid = genReqId();
    const traceId = `trace-${rid}`;
    addTerminalEntry('INFO', `chaos.latency triggered request_id=${rid} trace_id=${traceId}`, rid);
    addEntry('INFO', `chaos.latency status=TRIGGERED type=LATENCY_INJECTION trace_id=${traceId}`, rid);
    try {
      const res: ChaosResponse = await postChaosLatency();
      addTerminalEntry('WARN', `latency.injection status=TIMEOUT latency_ms=${res.latency_ms} circuit_breaker=OPEN request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('WARN', `latency.injection status=TIMEOUT latency_ms=${res.latency_ms} circuit_breaker=OPEN trace_id=${traceId}`, rid);
      addIncident('latency_injection', 'chaos.action.latency.title', {
        impactPct: '100%',
        durationMs: res.latency_ms ?? 3000,
        origin: 'synthetic',
      });
      emitTrace({ id: `trace-${rid}`, traceId, requestId: rid, type: 'latency_injection', origin: 'synthetic', endpoint: '/chaos/latency', status: 'error', totalMs: res.latency_ms || 3000, apiMs: 50, dbMs: (res.latency_ms || 3000) - 50, cacheMs: 0, timestamp: new Date(), impactPct: '100%', latencyDelta: `+${((res.latency_ms || 3000)/1000).toFixed(1)}s`, durationMs: res.latency_ms ?? 3000 });
      invalidateMetrics();
      startCooldown(setLatencyCooldown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addTerminalEntry('ERROR', `chaos.latency error="${msg}" request_id=${rid} trace_id=${traceId}`, rid);
      addEntry('ERROR', `chaos.latency status=FAILED error="${msg}" trace_id=${traceId}`, rid);
    } finally { setLatencyLoading(false); }
  }, [latencyLoading, latencyCooldown, addTerminalEntry, addEntry, addIncident, invalidateMetrics, startCooldown]);

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

        {/* Chaos Preset Selector */}
        <div className="glass rounded-xl p-4 border border-app-border mt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-app-text uppercase tracking-widest flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${preset !== 'off' ? 'bg-violet-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${preset !== 'off' ? 'bg-violet-500' : 'bg-emerald-500'}`}></span>
                </span>
                {t('chaos.presets.title')}
              </h3>
              <p className="text-[10px] font-mono text-app-muted">
                {preset === 'off' ? t('chaos.presets.desc_off') : t('chaos.presets.desc_active', { p: preset.toUpperCase() })}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-app-surface p-1 rounded-lg border border-app-border">
              {(['off', 'mild', 'stress', 'failure'] as ChaosPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPreset(p);
                    addEntry('DECISION', `manual_override chaos_preset=${p.toUpperCase()} status=APPLIED`);
                  }}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all duration-200 ${
                    preset === p
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                      : 'text-app-muted hover:text-app-text hover:bg-app-surface-hover'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          {preset !== 'off' && (
            <m.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-app-border/40 text-[10px] font-mono text-violet-300/70 italic"
            >
              {preset === 'mild' && t('chaos.presets.mild_effect')}
              {preset === 'stress' && t('chaos.presets.stress_effect')}
              {preset === 'failure' && t('chaos.presets.failure_effect')}
            </m.div>
          )}
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <ActionCard
            icon="🌬️"
            titleKey="chaos.action.drain.title"
            descKey="chaos.action.drain.desc"
            accentClass="text-emerald-400"
            borderClass="border-emerald-500/20"
            hoverClass="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            loading={drainLoading}
            cooldown={drainCooldown}
            loadingKey="chaos.action.drain.running"
            actionKey="chaos.action.drain.action"
            disabled={drainLoading || drainCooldown > 0}
            onClick={handleDrain}
          />
          <ActionCard
            icon="⏳"
            titleKey="chaos.action.latency.title"
            descKey="chaos.action.latency.desc"
            accentClass="text-amber-400"
            borderClass="border-amber-500/20"
            hoverClass="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            loading={latencyLoading}
            cooldown={latencyCooldown}
            loadingKey="chaos.action.latency.running"
            actionKey="chaos.action.latency.action"
            disabled={latencyLoading || latencyCooldown > 0}
            onClick={handleLatency}
          />
          <ActionCard
            icon="🔄"
            titleKey="chaos.action.retry.title"
            descKey="chaos.action.retry.desc"
            accentClass="text-blue-400"
            borderClass="border-blue-500/20"
            hoverClass="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            loading={retryLoading}
            cooldown={retryCooldown}
            loadingKey="chaos.action.retry.running"
            actionKey="chaos.action.retry.action"
            disabled={retryLoading || retryCooldown > 0}
            onClick={handleRetry}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* Active Incidents panel */}
          <div className="glass rounded-xl p-4 border border-app-border">
            <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-app-muted">{t('chaos.incidents.history')}</span>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isInvestigating 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                            }`}>
                              {isInvestigating ? 'INVESTIGATING' : 'MITIGATING'}
                            </span>
                            {inc.origin && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${inc.origin === 'synthetic' ? 'bg-violet-500/10 border-violet-500/20 text-violet-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}>
                                {inc.origin}
                              </span>
                            )}
                            {inc.impactPct && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-200">
                                impact {inc.impactPct}
                              </span>
                            )}
                            {inc.durationMs !== undefined && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-app-border/30 bg-app-surface/40 text-app-muted">
                                duration {inc.durationMs}ms
                              </span>
                            )}
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
                    <span className="text-[10px] font-mono uppercase tracking-widest text-app-muted/60 block mb-2">{t('chaos.incidents.resolved_section')}</span>
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
                <p className="text-white/40">{'>'} {t('logs.waiting')}</p>
              ) : (
                terminal.map((entry) => (
                  <m.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 mb-1"
                  >
                    <span className="text-white/60 flex-shrink-0">[{entry.timestamp}]</span>
                    <span className={
                      entry.level === 'ERROR' ? 'text-red-400 flex-shrink-0' :
                      entry.level === 'WARN' ? 'text-amber-400 flex-shrink-0' :
                      'text-emerald-400/70 flex-shrink-0'
                    }>{entry.level.padEnd(5)}</span>
                    <span className="text-white/90 break-all">{entry.message}</span>
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
