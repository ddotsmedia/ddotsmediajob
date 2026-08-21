import { useEffect, useState } from 'react';

/**
 * Value that settles `delay` ms after the last change.
 *
 * The admin search box drives a server query; without this, typing
 * "receptionist" fires twelve requests and the results flicker through
 * partial-word matches before landing.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
