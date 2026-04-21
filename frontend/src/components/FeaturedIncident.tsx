import { m } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

export default function FeaturedIncident() {
  const { t } = useLanguage();

  return (
    <section id="incident-0042" className="px-4 max-w-6xl mx-auto py-12">
      <m.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass rounded-3xl border border-app-border overflow-hidden bg-gradient-to-br from-app-surface to-app-surface-hover/50"
      >
        <div className="p-1 bg-gradient-to-r from-red-500/20 via-amber-500/20 to-emerald-500/20" />
        
        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-500/10 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest">
                  Archived Incident
                </span>
                <span className="text-app-muted font-mono text-[10px]">Case Study #0042</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                The Redis Connection Leak
              </h2>
            </div>
            
            <div className="flex gap-4 border-l border-app-border/40 pl-4">
              <div className="text-center">
                <div className="text-xs font-mono text-app-muted uppercase">MTTR</div>
                <div className="text-lg font-bold text-emerald-400">14m</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-mono text-app-muted uppercase">IMPACT</div>
                <div className="text-lg font-bold text-red-400">12.4%</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Timeline sidebar */}
            <div className="md:col-span-1 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-app-primary uppercase tracking-widest">Timeline</h3>
                <div className="relative border-l border-app-border/40 pl-4 space-y-6">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]" />
                    <div className="text-[10px] font-mono text-app-muted">04:12 UTC</div>
                    <div className="text-xs font-bold text-app-text mt-1">Spike in 503 errors detected in p95 telemetry.</div>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="text-[10px] font-mono text-app-muted">04:15 UTC</div>
                    <div className="text-xs font-bold text-app-text mt-1">Auto-mitigation engaged: Circuit Breaker isolation.</div>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <div className="text-[10px] font-mono text-app-muted">04:26 UTC</div>
                    <div className="text-xs font-bold text-app-text mt-1">Manual switch to Async Fallback. Stability restored.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis content */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xs font-mono font-bold text-app-primary uppercase tracking-widest mb-3">Post-Mortem Analysis</h3>
                <p className="text-sm text-app-muted leading-relaxed">
                  A connection leak was identified in the Redis client after an unhandled exception in the ingestion worker. 
                  The system's <span className="text-app-text font-bold">hysteresis thresholds</span> prevented immediate flapping, 
                  allowing the decision engine to wait for a 3-count confirmation before de-prioritizing the affected worker.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-app-surface/40 rounded-xl border border-app-border/40 p-4">
                  <div className="text-[10px] font-mono text-app-primary mb-2 uppercase">Core Lesson</div>
                  <p className="text-[11px] text-app-muted italic font-serif">
                    "Availability is a feature, but consistency is a requirement. Falling back to Cache Serving was the correct trade-off."
                  </p>
                </div>
                <div className="bg-app-surface/40 rounded-xl border border-app-border/40 p-4">
                  <div className="text-[10px] font-mono text-app-primary mb-2 uppercase">Technical Debt Fixed</div>
                  <ul className="text-[11px] text-app-muted space-y-1 list-disc pl-3">
                    <li>Added explicit pool exhaustion timeouts.</li>
                    <li>Refactored retry backoff from linear to exponential.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </section>
  );
}
