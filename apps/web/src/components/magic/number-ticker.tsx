'use client';

import { useEffect, useRef, useState } from 'react';

/** Animated count-up number. Animates when scrolled into view, with a fallback so the value always shows. */
export function NumberTicker({
  value,
  className,
  suffix = '',
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const duration = 1200;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') { run(); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && run()), { threshold: 0 });
    io.observe(el);
    const t = setTimeout(run, 800); // safety: show value even if observer never fires
    return () => { io.disconnect(); clearTimeout(t); };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {Intl.NumberFormat('en-AE').format(display)}{suffix}
    </span>
  );
}
