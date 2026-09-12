'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const STEPS = 30;
const STEP_MS = 30;

/**
 * Counts up to a number. Non-numeric values ("—" when a query failed, "…" while
 * it loads) render as-is — they are states, not quantities.
 *
 * Counts from the PREVIOUS value, not from zero: these cards poll every 30s, so
 * restarting at zero on every refresh would make a steady 4 flicker down and
 * back up.
 */
export function AnimatedNumber({ value, className }: { value: number | string; className?: string }) {
  const target = typeof value === 'number' ? value : null;
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(target ?? 0);
  const from = useRef(target ?? 0);

  useEffect(() => {
    if (target === null) return;
    if (reduce) {
      setDisplay(target);
      from.current = target;
      return;
    }
    const start = from.current;
    const diff = target - start;
    if (diff === 0) return;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const next = step >= STEPS ? target : Math.round(start + (diff * step) / STEPS);
      setDisplay(next);
      if (step >= STEPS) {
        from.current = target;
        clearInterval(timer);
      }
    }, STEP_MS);
    return () => {
      // Land on the target if unmounted mid-count, so the next mount doesn't
      // animate from a half-finished number.
      from.current = target;
      clearInterval(timer);
    };
  }, [target, reduce]);

  return <div className={className}>{target === null ? value : display}</div>;
}
