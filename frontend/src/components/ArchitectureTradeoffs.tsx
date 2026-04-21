import { m } from 'framer-motion';

const TRADE_OFFS = [
  {
    title: 'Latency vs. Consistency',
    desc: 'Using stale-while-revalidate for metrics dashboard to prioritize UI smooth interaction over real-time accuracy during burst traffic.',
    status: 'ACTIVE',
    impact: 'Low variance in UI latency'
  },
  {
    title: 'Sync vs. Async Processing',
    desc: 'Chaos actions are processed synchronously in the control panel but reflected asynchronously in the observability stream to mimic real-world distributed system behavior.',
    status: 'OPTIMIZED',
    impact: 'Reliable event capture'
  },
  {
    title: 'Structured vs. Text Logging',
    desc: 'Sacrificing human readability in raw streams for key=value formatting to ensure O(1) parsing by automated SRE tools.',
    status: 'ENFORCED',
    impact: 'High signal-to-noise ratio'
  }
];

export default function ArchitectureTradeoffs() {
  return (
    <section id="tradeoffs" className="px-4 max-w-6xl mx-auto py-12">
      <div className="mb-8">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
          Architecture Trade-offs
        </h2>
        <p className="text-sm text-app-muted">Engineering isn't about choices; it's about compromises.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TRADE_OFFS.map((item, i) => (
          <m.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative p-6 rounded-2xl border border-app-border/40 bg-app-surface/20 hover:bg-app-primary/5 transition-colors duration-300"
          >
            <div className="absolute top-4 right-4 text-[9px] font-mono text-app-primary/60 border border-app-primary/20 rounded px-1.5 py-0.5">
              {item.status}
            </div>
            
            <h3 className="text-sm font-bold text-app-text mb-3">{item.title}</h3>
            <p className="text-xs text-app-muted leading-relaxed mb-4">
              {item.desc}
            </p>
            
            <div className="pt-4 border-t border-app-border/20">
              <div className="text-[9px] font-mono text-app-muted uppercase tracking-wider mb-1">Operational Impact</div>
              <div className="text-[11px] font-mono text-app-primary font-bold">
                {'>'} {item.impact}
              </div>
            </div>
          </m.div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-app-primary/5 border border-app-primary/10 rounded-xl">
        <p className="text-[11px] font-mono text-app-muted leading-relaxed">
          <span className="text-app-primary font-bold">PRO-TIP:</span> Toggle [STRESS] or [FAILURE] mode below to see these trade-offs in action. 
          When latency exceeds 100ms, the system automatically prioritizes availability by switching to the async fallback path.
        </p>
      </div>
    </section>
  );
}
