import { useMemo } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { TraceEntry } from '../../services/TraceEmitter';
import { type MetricSample } from '../../types/metrics';
import { useAnimatedPolyline } from '../../hooks/useAnimatedPolyline';

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

function annotationWidth(label: string, meta?: string) {
  const base = Math.max(40, label.length * 6 + 12);
  const metaWidth = meta ? Math.max(base, meta.length * 5 + 12) : base;
  return metaWidth;
}

function severityColor(impactPct?: string): string {
  const pct = impactPct ? parseFloat(impactPct) : NaN;
  if (isNaN(pct) || pct < 10) return '#10b981';
  if (pct <= 50) return '#f59e0b';
  return '#ef4444';
}

export default function MetricsSparkline({
  samples,
  traces = [],
  width = 220,
  height = 64,
  compact = false,
}: MetricsSparklineProps) {
  const prefersReducedMotion = useReducedMotion();

  const model = useMemo(() => {
    const PLACEHOLDER_VALUE = 30;
    const REFERENCE_TIME = 1713620000000;
    const effectiveSamples: MetricSample[] =
      samples.length >= 2
        ? samples
        : Array.from({ length: 10 }, (_, i) => ({
            value: PLACEHOLDER_VALUE,
            timestamp: REFERENCE_TIME - (9 - i) * 15_000,
            source: 'real',
            confidence: 98,
          }));

    const _samples =
      effectiveSamples.length === 1
        ? [
            { ...effectiveSamples[0], timestamp: effectiveSamples[0].timestamp - 15000 },
            effectiveSamples[0],
          ]
        : effectiveSamples;

    const paddingX = compact ? 4 : 8;
    const paddingY = compact ? 6 : 10;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const values = effectiveSamples.map((sample) => sample.value);
    const sampleMin = Math.min(...values);
    const sampleMax = Math.max(...values);
    const padding = Math.max(10, Math.round((sampleMax - sampleMin || 20) * 0.2));
    const min = Math.max(0, sampleMin - padding);
    const max = sampleMax + padding;
    const range = max - min || 1;
    const baseline = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    const pointAt = (sample: MetricSample, index: number) => {
      const x = paddingX + (index / (_samples.length - 1)) * innerW;
      const y = paddingY + innerH - ((sample.value - min) / range) * innerH;
      return { x, y };
    };

    const points = _samples.map(pointAt);
    const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const segmentPathForSource = (source: MetricSample['source']) => {
      const segmentPoints = _samples
        .map((sample, index) => ({ sample, point: points[index] }))
        .filter(({ sample }) => sample.source === source)
        .map(({ point }) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join(' ');
      return segmentPoints;
    };

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

    return {
      min,
      max,
      baseline,
      points,
      polyline,
      syntheticPolyline: segmentPathForSource('synthetic'),
      realPolyline: segmentPathForSource('real'),
      annotations,
      samples: _samples,
    };
  }, [compact, height, samples, traces, width]);

  const animatedMainPolyline = useAnimatedPolyline(model.polyline, 350);
  const animatedRealPolyline = useAnimatedPolyline(model.realPolyline, 350);
  const animatedSyntheticPolyline = useAnimatedPolyline(model.syntheticPolyline, 350);

  if (!model) return null;

  const areaPathD = (() => {
    const pts = animatedMainPolyline.trim().split(/\s+/).filter(Boolean);
    if (pts.length < 2) return '';
    const firstX = pts[0].split(',')[0];
    const lastX = pts[pts.length - 1].split(',')[0];
    return `M ${firstX},${height} L ${pts.join(' L ')} L ${lastX},${height} Z`;
  })();

  const thresholdLines = [60, 100].map((threshold) => {
    const y = 6 + (height - 12) - ((threshold - model.min) / ((model.max - model.min) || 1)) * (height - 12);
    return { threshold, y };
  });

  const baselineY = 6 + (height - 12) - ((model.baseline - model.min) / ((model.max - model.min) || 1)) * (height - 12);

  const latestPoint = model.points.at(-1);
  const latestSample = model.samples.at(-1);
  const effectiveP95 = latestSample?.value ?? 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14d3a5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14d3a5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {thresholdLines.map(({ threshold, y }) => {
        const isApproaching =
          threshold === 60
            ? effectiveP95 >= 45 && effectiveP95 <= 60
            : effectiveP95 >= 85 && effectiveP95 <= 100;
        const color = threshold === 100 ? '#ef4444' : '#f59e0b';
        return (
          <g key={threshold}>
            {isApproaching && (
              prefersReducedMotion
                ? <rect x={0} y={y - 4} width={width} height={8} fill={color} opacity={0.08} />
                : <m.rect
                    x={0}
                    y={y - 4}
                    width={width}
                    height={8}
                    fill={color}
                    animate={{ opacity: [0.05, 0.15, 0.05] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  />
            )}
            <line
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke={color}
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
        );
      })}

      <line
        x1="0"
        y1={baselineY}
        x2={width}
        y2={baselineY}
        stroke="#94a3b8"
        strokeOpacity={compact ? 0.18 : 0.28}
        strokeDasharray="4 3"
        strokeWidth="1"
      />
      {!compact && (
        <text x="6" y={baselineY - 4} fontSize="8" fontFamily="monospace" fill="#94a3b8" opacity="0.75">
          avg {model.baseline}ms
        </text>
      )}

      {areaPathD && (
        <path
          d={areaPathD}
          fill="url(#sparkline-gradient)"
          stroke="none"
        />
      )}

      <polyline
        fill="none"
        stroke="#14d3a5"
        strokeWidth={compact ? '1.5' : '2'}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={animatedMainPolyline}
        strokeOpacity="0.18"
      />

      {animatedRealPolyline && (
        <polyline
          fill="none"
          stroke="#14d3a5"
          strokeWidth={compact ? '1.5' : '2'}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={animatedRealPolyline}
        />
      )}

      {animatedSyntheticPolyline && (
        <polyline
          fill="none"
          stroke="#a855f7"
          strokeWidth={compact ? '1.5' : '2'}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="5 3"
          points={animatedSyntheticPolyline}
          strokeOpacity="0.95"
        />
      )}

      {model.annotations.map(({ trace, point }, index, annotations) => {
        const style = TRACE_STYLE[trace.type];
        const isSpike = trace.type === 'traffic_spike';
        const markerColor = isSpike ? '#ef4444' : style.stroke;
        const metaText = `${trace.impactPct ? `aff:${trace.impactPct}` : ''}${trace.impactPct && trace.latencyDelta ? ' ' : ''}${trace.latencyDelta ? `Δ:${trace.latencyDelta}` : ''}`.trim();
        const boxWidth = annotationWidth(isSpike ? 'SPIKE' : style.label, metaText || undefined);
        const desiredX = point.x + 4;
        const clampedX = Math.min(desiredX, width - boxWidth - 6);
        const previous = annotations[index - 1];
        const isCrowded = previous ? Math.abs(previous.point.x - point.x) < boxWidth * 0.9 : false;
        const lane = isCrowded ? index % 3 : index % 2;
        const laneHeights = [18, 38, 58];
        const labelX = previous && isCrowded && clampedX <= previous.point.x ? Math.max(6, clampedX - 20) : clampedX;
        const labelY = Math.max(16, Math.min(laneHeights[lane], height - (metaText ? 34 : 20)));
        const metaSeverity = severityColor(trace.impactPct);

        return (
          <m.g
            key={trace.id}
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.08 }}
          >
            <m.line
              x1={point.x}
              y1={0}
              x2={point.x}
              y2={height}
              stroke={markerColor}
              strokeWidth="1"
              strokeDasharray={isSpike ? 'none' : '3 2'}
              initial={{ strokeOpacity: prefersReducedMotion ? 0.45 : 0 }}
              animate={{ strokeOpacity: 0.45 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.08 }}
            />
            {!compact && (
              <g transform={`translate(${labelX}, ${labelY})`}>
                <rect
                  x="-2" y="-10" width={boxWidth} height="14"
                  fill={markerColor} rx="2" fillOpacity="0.82"
                />
                <text x="2" y="1" fontSize="9" fontWeight="bold" fill="#000" fontFamily="monospace">
                  {isSpike ? 'SPIKE' : style.label}
                </text>
                {metaText && (
                  <g transform="translate(0, 14)">
                    <rect
                      x="-2" y="0" width={boxWidth} height="12"
                      fill={metaSeverity} fillOpacity="0.4" rx="2"
                    />
                    <text x="2" y="9" fontSize="7" fill="#fff" fontFamily="monospace">
                      {metaText}
                    </text>
                  </g>
                )}
              </g>
            )}
          </m.g>
        );
      })}

      {latestPoint && latestSample && (
        prefersReducedMotion
          ? (
            <circle
              cx={latestPoint.x}
              cy={latestPoint.y}
              r={compact ? 2.5 : 3}
              fill={latestSample.source === 'synthetic' ? '#a855f7' : '#14d3a5'}
              stroke="#020617"
              strokeWidth="0.7"
            />
          )
          : (
            <m.circle
              cx={latestPoint.x}
              cy={latestPoint.y}
              r={compact ? 2.5 : 3}
              fill={latestSample.source === 'synthetic' ? '#a855f7' : '#14d3a5'}
              stroke="#020617"
              strokeWidth="0.7"
              animate={{ r: compact ? [2.5, 3.5, 2.5] : [3, 4, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          )
      )}
    </svg>
  );
}
