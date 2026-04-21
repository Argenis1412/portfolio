import { useMemo } from 'react';
import type { TraceEntry } from '../../services/TraceEmitter';

export interface MetricSample {
  value: number;
  timestamp: number;
}

interface MetricsSparklineProps {
  samples: MetricSample[];
  traces?: TraceEntry[];
  width?: number;
  height?: number;
  compact?: boolean;
}

const TRACE_STYLE: Record<TraceEntry['type'], { stroke: string; fill: string; label: string }> = {
  traffic_spike: { stroke: '#fbbf24', fill: '#fbbf24', label: 'SPIKE' },
  forced_failure: { stroke: '#f87171', fill: '#f87171', label: '503' },
  cache_stress: { stroke: '#60a5fa', fill: '#60a5fa', label: 'CACHE' },
  queue_drain: { stroke: '#10b981', fill: '#10b981', label: 'DRAIN' },
  manual_retry: { stroke: '#3b82f6', fill: '#3b82f6', label: 'RETRY' },
  latency_injection: { stroke: '#f59e0b', fill: '#f59e0b', label: 'LATENCY' },
};

export default function MetricsSparkline({
  samples,
  traces = [],
  width = 220,
  height = 64,
  compact = false,
}: MetricsSparklineProps) {
  const model = useMemo(() => {
    // Build a flat baseline if there isn't enough real data yet
    const PLACEHOLDER_VALUE = 30; // below 60ms healthy threshold — visually neutral
    const REFERENCE_TIME = 1713620000000; // Stable reference for placeholders
    const effectiveSamples: MetricSample[] =
      samples.length >= 2
        ? samples
        : Array.from({ length: 10 }, (_, i) => ({
            value: PLACEHOLDER_VALUE,
            timestamp: REFERENCE_TIME - (9 - i) * 15_000,
          }));

    const _samples =
      effectiveSamples.length === 1
        ? [
            { value: effectiveSamples[0].value, timestamp: effectiveSamples[0].timestamp - 15000 },
            effectiveSamples[0],
          ]
        : effectiveSamples;

    const paddingX = compact ? 4 : 8;
    const paddingY = compact ? 6 : 10;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const values = effectiveSamples.map((sample) => sample.value);
    const min = Math.min(...values, 0, 40);
    const max = Math.max(...values, 120);
    const range = max - min || 1;

    const pointAt = (sample: MetricSample, index: number) => {
      const x = paddingX + (index / (_samples.length - 1)) * innerW;
      const y = paddingY + innerH - ((sample.value - min) / range) * innerH;
      return { x, y };
    };

    const points = _samples.map(pointAt);
    const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const annotations = traces
      .filter((trace) => trace.timestamp instanceof Date)
      .map((trace) => {
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        _samples.forEach((sample, index) => {
          const distance = Math.abs(sample.timestamp - trace.timestamp.getTime());
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        return {
          trace,
          point: points[closestIndex],
        };
      })
      .slice(0, compact ? 2 : 4);

    return { min, max, points, polyline, annotations };
  }, [compact, height, samples, traces, width]);

  if (!model) return null;

  const thresholdLines = [60, 100].map((threshold) => {
    const y = 6 + (height - 12) - ((threshold - model.min) / ((model.max - model.min) || 1)) * (height - 12);
    return { threshold, y };
  });

  const recentPoints = model.points.slice(-3);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14d3a5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14d3a5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {thresholdLines.map(({ threshold, y }) => (
        <g key={threshold}>
          <line
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke={threshold === 100 ? '#ef4444' : '#f59e0b'}
            strokeOpacity={compact ? 0.12 : 0.18}
            strokeDasharray="2 2"
            strokeWidth="1"
          />
          {!compact && (
            <text x={width - 2} y={y - 2} textAnchor="end" fontSize="8" fontFamily="monospace" fill="#7c7469" opacity="0.5">
              {threshold}ms
            </text>
          )}
        </g>
      ))}

      {/* Area under the curve */}
      <path
        d={`M ${model.points[0].x},${height} L ${model.points.map(p => `${p.x},${p.y}`).join(' L ')} L ${model.points[model.points.length - 1].x},${height} Z`}
        fill="url(#sparkline-gradient)"
        stroke="none"
      />

      <polyline
        fill="none"
        stroke="#14d3a5"
        strokeWidth={compact ? '1.5' : '1.8'}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={model.polyline}
      />

      {model.annotations.map(({ trace, point }) => {
        const style = TRACE_STYLE[trace.type];
        const isSpike = trace.type === 'traffic_spike';
        const markerColor = isSpike ? '#ef4444' : style.stroke;
        
        return (
          <g key={trace.id}>
            <line
              x1={point.x}
              y1="0"
              x2={point.x}
              y2={height}
              stroke={markerColor}
              strokeWidth="1.2"
              strokeDasharray={isSpike ? "none" : "3 2"}
              strokeOpacity={0.8}
            />
            {!compact && (
              <g transform={`translate(${point.x + 4}, 12)`}>
                <rect 
                   x="-2" y="-10" width={trace.type.length * 5 + 10} height="14" 
                   fill={markerColor} rx="2" 
                />
                <text x="2" y="1" fontSize="9" fontWeight="bold" fill="#000" fontFamily="monospace">
                  {isSpike ? 'SPIKE' : style.label}
                </text>
                {(trace.impactPct || trace.latencyDelta) && (
                  <g transform="translate(0, 14)">
                    <rect 
                      x="-2" y="0" width={trace.type.length * 5 + 10} height="12" 
                      fill="#000" fillOpacity="0.6" rx="2" 
                    />
                    <text x="2" y="9" fontSize="7" fill="#fff" fontFamily="monospace opacity-80">
                      {trace.impactPct && `aff:${trace.impactPct}`} {trace.latencyDelta && `Δ:${trace.latencyDelta}`}
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        );
      })}

      {recentPoints.map((point, index) => (
        <circle
          key={`${point.x}-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === recentPoints.length - 1 ? '3' : '2'}
          fill="#14d3a5"
          stroke="#000"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}
