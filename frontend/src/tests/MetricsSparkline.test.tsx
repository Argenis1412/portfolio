import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricsSparkline from '../components/ui/MetricsSparkline';
import type { MetricSample } from '../types/metrics';
import type { TraceEntry } from '../services/TraceEmitter';

function makeSamples(values: number[], source: MetricSample['source'] = 'real'): MetricSample[] {
  const base = 1713620000000;
  return values.map((value, i) => ({
    value,
    timestamp: base + i * 15_000,
    source,
    confidence: 98,
  }));
}

function makeTrace(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: 'trace-1',
    type: 'forced_failure',
    timestamp: new Date(1713620030000),
    impactPct: '25%',
    latencyDelta: '+12ms',
    ...overrides,
  } as TraceEntry;
}

describe('MetricsSparkline', () => {
  it('renders with minimal samples (placeholder path)', () => {
    const { container } = render(<MetricsSparkline samples={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('renders animated polylines when given real samples', () => {
    const samples = makeSamples([30, 35, 40, 38, 42, 45, 50, 48, 44, 40, 37, 33]);
    const { container } = render(<MetricsSparkline samples={samples} />);
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the area fill path', () => {
    const samples = makeSamples([30, 40, 50, 45]);
    const { container } = render(<MetricsSparkline samples={samples} />);
    const path = container.querySelector('path[fill="url(#sparkline-gradient)"]');
    expect(path).toBeTruthy();
    expect(path?.getAttribute('d')).toMatch(/^M .+ Z$/);
  });

  it('renders threshold lines at 60ms and 100ms', () => {
    const samples = makeSamples([30, 35, 40, 38]);
    const { container } = render(<MetricsSparkline samples={samples} />);
    const texts = container.querySelectorAll('text');
    const thresholdLabels = Array.from(texts).filter(t => t.textContent?.match(/^\d+ms$/));
    expect(thresholdLabels).toHaveLength(2);
    expect(thresholdLabels[0].textContent).toBe('60ms');
    expect(thresholdLabels[1].textContent).toBe('100ms');
  });

  it('shows static glow rect when value exceeds threshold', () => {
    const samples = makeSamples([65, 68, 70, 72]);
    const { container } = render(<MetricsSparkline samples={samples} />);
    const rects = container.querySelectorAll('rect');
    const glowRect = Array.from(rects).find(r => r.getAttribute('opacity') === '0.12');
    expect(glowRect).toBeTruthy();
  });

  it('renders annotation markers with severity-colored meta badges', () => {
    const samples = makeSamples([30, 35, 40, 38, 42, 45]);
    const trace = makeTrace({ impactPct: '60%' });
    const { container } = render(<MetricsSparkline samples={samples} traces={[trace]} />);
    const metaRects = container.querySelectorAll('rect[fill-opacity="0.4"]');
    expect(metaRects.length).toBeGreaterThan(0);
    expect(metaRects[0].getAttribute('fill')).toBe('#ef4444');
  });

  it('applies green severity for low impact', () => {
    const samples = makeSamples([30, 35, 40, 38, 42, 45]);
    const trace = makeTrace({ impactPct: '5%' });
    const { container } = render(<MetricsSparkline samples={samples} traces={[trace]} />);
    const metaRects = container.querySelectorAll('rect[fill-opacity="0.4"]');
    expect(metaRects.length).toBeGreaterThan(0);
    expect(metaRects[0].getAttribute('fill')).toBe('#10b981');
  });

  it('applies yellow severity for medium impact', () => {
    const samples = makeSamples([30, 35, 40, 38, 42, 45]);
    const trace = makeTrace({ impactPct: '30%' });
    const { container } = render(<MetricsSparkline samples={samples} traces={[trace]} />);
    const metaRects = container.querySelectorAll('rect[fill-opacity="0.4"]');
    expect(metaRects.length).toBeGreaterThan(0);
    expect(metaRects[0].getAttribute('fill')).toBe('#f59e0b');
  });

  it('renders latest-point circle', () => {
    const samples = makeSamples([30, 35, 40]);
    const { container } = render(<MetricsSparkline samples={samples} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('renders in compact mode without labels', () => {
    const samples = makeSamples([30, 35, 40, 38]);
    const { container } = render(<MetricsSparkline samples={samples} compact />);
    const texts = container.querySelectorAll('text');
    const thresholdLabels = Array.from(texts).filter(t => t.textContent?.match(/^\d+ms$/));
    expect(thresholdLabels).toHaveLength(0);
  });

  it('renders synthetic polyline with dashed stroke', () => {
    const mixed = [
      ...makeSamples([30, 35], 'real'),
      ...makeSamples([40, 38], 'synthetic'),
    ];
    mixed[2].timestamp = mixed[1].timestamp + 15_000;
    mixed[3].timestamp = mixed[2].timestamp + 15_000;
    const { container } = render(<MetricsSparkline samples={mixed} />);
    const dashed = container.querySelector('polyline[stroke-dasharray="5 3"]');
    expect(dashed).toBeTruthy();
  });
});
