'use client';

import { useEffect, useState } from 'react';

/**
 * Count-up number. Renders the real `value` on the server and on first client
 * paint (so it's always correct, even without JS, and hydration matches), then
 * animates 0 → value once mounted. No IntersectionObserver — the final value
 * always shows.
 */
export function NumberTicker({
  value,
  className,
  suffix = '',
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value); // guarantee exact final value
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      {Intl.NumberFormat('en-AE').format(display)}{suffix}
    </span>
  );
}
