import { useRef, useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function useAnimatedNumber(target: number, duration = 300): number {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const startValueRef = useRef(target);
  const initializedRef = useRef(false);

  const animateTo = useCallback((from: number, to: number) => {
    startTimeRef.current = performance.now();
    startValueRef.current = from;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = from + (to - from) * eased;

      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startValueRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      startValueRef.current = target;
      return;
    }

    if (prefersReducedMotion) {
      startValueRef.current = target;
      return;
    }

    const from = startValueRef.current;
    if (from === target) return;

    animateTo(from, target);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, prefersReducedMotion, animateTo]);

  if (prefersReducedMotion) return target;

  return displayed;
}
