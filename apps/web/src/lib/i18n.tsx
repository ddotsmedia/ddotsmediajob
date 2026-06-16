'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type Locale, type MessageKey, t as translate, isRtl } from '@ddots/shared';

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: MessageKey) => string };
const LocaleContext = createContext<Ctx>({ locale: 'en', setLocale: () => {}, t: (k) => translate('en', k) });

const STORAGE_KEY = 'ddots_locale';

function applyDir(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // On mount: stored choice → else Arabic browser language auto-detect.
  useEffect(() => {
    let initial: Locale = 'en';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'ar') initial = stored;
      else if (navigator.language?.toLowerCase().startsWith('ar')) initial = 'ar';
    } catch {
      /* ignore */
    }
    setLocaleState(initial);
    applyDir(initial);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    applyDir(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const tt = useCallback((key: MessageKey) => translate(locale, key), [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale, t: tt }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  return useContext(LocaleContext);
}
