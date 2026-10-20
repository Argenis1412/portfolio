import { useState, useEffect } from 'react';

export function useCurrentTime(intervalMs: number = 1000): number {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const update = () => setCurrentTime(Date.now());
    update();
    const timer = setInterval(update, intervalMs);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [intervalMs]);

  return currentTime;
}
