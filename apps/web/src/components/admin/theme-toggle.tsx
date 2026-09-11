'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/** Light/dark switch. Reads the resolved theme, so it works when the stored
 *  preference is "system". */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The server has no idea which theme the browser will pick, so the icon can't
  // be rendered until after hydration without a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border border-navy-200 p-2 text-navy-700 transition-colors hover:bg-navy-50 dark:border-navy-800 dark:text-navy-100 dark:hover:bg-navy-900"
    >
      {/* Reserve the space before mount so the header doesn't shift. */}
      {!mounted ? (
        <span className="block h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
