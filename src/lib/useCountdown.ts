import { useState, useEffect, useRef } from 'react';
import { daysUntil, parseLocalDate } from './daysUntil';

export { daysUntil, parseLocalDate };

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  past: boolean;
}

function computeCountdown(dateStr: string | null): CountdownParts | null {
  if (!dateStr) return null;
  const target = parseLocalDate(dateStr).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: diff < 0 };
  // Use Math.ceil for days so it matches the shared daysUntil() helper —
  // a wedding tomorrow shows "1 day to go", not 0.
  return {
    days: Math.ceil(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    past: false,
  };
}

/** Single authoritative countdown. Ticks at 1s only when the tab is visible; pauses when hidden. */
export function useCountdown(dateStr: string | null): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(() => computeCountdown(dateStr));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!dateStr) {
      setParts(null);
      return;
    }

    const tick = () => setParts(computeCountdown(dateStr));
    tick();

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(tick, 1000);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else { tick(); start(); }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dateStr]);

  return parts;
}
