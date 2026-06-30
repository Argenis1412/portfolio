import { useRef, useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function parsePoints(points: string): number[][] {
  if (!points) return [];
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return [x, y];
    })
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

function serializePoints(points: number[][]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function useAnimatedPolyline(targetPoints: string, duration = 350): string {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(targetPoints);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const fromPointsRef = useRef<number[][]>([]);
  const currentPointsRef = useRef<number[][]>([]);
  const initializedRef = useRef(false);

  const animateBetween = useCallback((fromPts: number[][], toPts: number[][]) => {
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      const interpolated = fromPts.map(([fx, fy], i) => {
        const [tx, ty] = toPts[i];
        return [fx + (tx - fx) * eased, fy + (ty - fy) * eased];
      });
      currentPointsRef.current = interpolated;

      setDisplayed(serializePoints(interpolated));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentPointsRef.current = toPts;
        fromPointsRef.current = toPts;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const pts = parsePoints(targetPoints);
      fromPointsRef.current = pts;
      currentPointsRef.current = pts;
      return;
    }

    if (prefersReducedMotion) {
      const pts = parsePoints(targetPoints);
      fromPointsRef.current = pts;
      currentPointsRef.current = pts;
      return;
    }

    const toPts = parsePoints(targetPoints);
    const fromPts = currentPointsRef.current.length === toPts.length
      ? currentPointsRef.current
      : fromPointsRef.current;

    // Skip interpolation when point count changes — snap directly
    if (fromPts.length !== toPts.length || toPts.length === 0) {
      fromPointsRef.current = toPts;
      currentPointsRef.current = toPts;
      return;
    }

    animateBetween(fromPts, toPts);

    return () => cancelAnimationFrame(rafRef.current);
  }, [targetPoints, prefersReducedMotion, animateBetween]);

  if (prefersReducedMotion) return targetPoints;

  return displayed;
}
