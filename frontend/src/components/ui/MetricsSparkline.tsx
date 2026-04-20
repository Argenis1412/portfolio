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
};

export default function MetricsSparkline({
  samples,
  traces = [],
  width = 220,
  height = 64,
  compact = false,
}: MetricsSparklineProps) {
  const model = useMemo(() => {
    if (samples.length < 2) return null;

    const paddingX = compact ? 4 : 8;
    const paddingY = compact ? 6 : 10;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const values = samples.map((sample) => sample.value);
    const min = Math.min(...values, 0, 40);
    const max = Math.max(...values, 120);
    const range = max - min || 1;

    const pointAt = (sample: MetricSample, index: number) => {
      const x = paddingX + (index / (samples.length - 1)) * innerW;
      const y = paddingY + innerH - ((sample.value - min) / range) * innerH;
      return { x, y };
    };

    const points = samples.map(pointAt);
    const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const annotations = traces
      .filter((trace) => trace.timestamp instanceof Date)
      .map((trace) => {
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        samples.forEach((sample, index) => {
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
      {thresholdLines.map(({ threshold, y }) => (
        <g key={threshold}>
          <line
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke={threshold === 100 ? '#ef4444' : '#f59e0b'}
            strokeOpacity={compact ? 0.18 : 0.24}
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          {!compact && (
            <text x={width - 2} y={y - 2} textAnchor="end" fontSize="9" fill="#7c7469">
              {threshold}ms
            </text>
          )}
        </g>
      ))}

      <polyline
        fill="none"
        stroke="#14d3a5"
        strokeWidth={compact ? '1.6' : '2'}
        strokeLinejoin="miter"
        strokeLinecap="square"
        points={model.polyline}
      />

      {model.annotations.map(({ trace, point }, index) => {
        const style = TRACE_STYLE[trace.type];
        const x = Math.min(width - 26, point.x + 4 + index * 2);
        return (
          <g key={trace.id}>
            <line
              x1={point.x}
              y1="2"
              x2={point.x}
              y2={height - 2}
              stroke={style.stroke}
              strokeWidth="1"
              strokeOpacity={0.75}
            />
            {!compact && (
              <text x={x} y="10" fontSize="9" fill={style.fill}>
                {style.label}
              </text>
            )}
          </g>
        );
      })}

      {recentPoints.map((point, index) => (
        <circle
          key={`${point.x}-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === recentPoints.length - 1 ? '2.8' : '2.2'}
          fill="#14d3a5"
        />
      ))}
    </svg>
  );
}
