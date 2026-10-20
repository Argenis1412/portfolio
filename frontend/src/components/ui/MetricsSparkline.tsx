import type { MetricSample } from '../../types/metrics';

interface MetricsSparklineProps {
  samples: MetricSample[];
  width?: number;
  height?: number;
  compact?: boolean;
  emptyLabel?: string;
  label?: string;
}

export default function MetricsSparkline({ samples, width = 560, height = 120, compact = false,
  emptyLabel = 'No P95 measurements yet', label = 'Measured P95 history' }: MetricsSparklineProps) {
  if (!samples.length) return <p role="status">{emptyLabel}</p>;
  const padding = 12;
  const max = Math.max(110, ...samples.map(sample => sample.value * 1.1));
  const first = samples[0].timestamp;
  const span = samples[samples.length - 1].timestamp - first;
  const y = (value: number) => height - padding - value / max * (height - padding * 2);
  const points = samples.map(sample => ({
    x: span ? padding + (sample.timestamp - first) / span * (width - padding * 2) : width / 2,
    y: y(sample.value),
  }));
  return (
    <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="max-w-full">
      {[60, 100].map(threshold => <g key={threshold}>
        <line x1={padding} x2={width - padding} y1={y(threshold)} y2={y(threshold)} stroke={threshold === 100 ? 'var(--color-status-error)' : 'var(--color-status-warn)'} strokeDasharray="3 3" />
        {!compact && <text x={padding} y={y(threshold) - 2} fill="currentColor" fontSize="18">{threshold}ms</text>}
      </g>)}
      {points.length > 1 && <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="var(--color-status-ok)" strokeWidth="2" />}
      {points.map((point, index) => <circle key={`${samples[index].timestamp}-${index}`} cx={point.x} cy={point.y} r="3" fill="var(--color-status-ok)"><title>P95: {samples[index].value}ms</title></circle>)}
    </svg>
  );
}
