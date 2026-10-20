import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricsSparkline from '../components/ui/MetricsSparkline';
const samples = [30, 70, 110].map((value, i) => ({ value, timestamp: 1000 + i * 15_000 }));
describe('measured P95 chart', () => {
  it('shows an empty state without fabricated samples', () => {
    const { container } = render(<MetricsSparkline samples={[]} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('No P95 measurements yet');
  });
  it('renders exactly the observations received and retains thresholds', () => {
    const { container } = render(<MetricsSparkline samples={samples} />);
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('polyline')).toHaveLength(1);
    expect(screen.getByText('60ms')).toBeTruthy();
    expect(screen.getByText('100ms')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Measured P95 history');
  });
  it('renders one observation as a point, without inventing an earlier sample', () => {
    const { container } = render(<MetricsSparkline samples={[samples[0]]} />);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelector('polyline')).toBeNull();
    expect(container.innerHTML).not.toContain('NaN');
  });
  it('keeps uneven observation times spaced proportionally', () => {
    const { container } = render(<MetricsSparkline samples={[samples[0], { ...samples[1], timestamp: 2000 }, samples[2]]} width={300} />);
    const points = [...container.querySelectorAll('circle')].map(point => Number(point.getAttribute('cx')));
    expect(points[1] - points[0]).toBeLessThan(points[2] - points[1]);
  });
});
