'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'ddots-install-dismissed';
const VISITS_KEY = 'ddots-visits';

/**
 * Custom "Add to home screen" banner. Shows from the 2nd visit onward (never on
 * the first), only when the browser reports installability, and never again once
 * installed or dismissed.
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Count this visit up-front.
    try {
      const visits = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch {
      /* private mode — ignore */
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      try {
        const visits = Number(localStorage.getItem(VISITS_KEY) ?? '0');
        if (visits >= 2 && !localStorage.getItem(DISMISS_KEY)) setShow(true);
      } catch {
        setShow(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !evt) return null;

  async function install() {
    await evt!.prompt();
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  }
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto max-w-md rounded-2xl border bg-white p-4 shadow-xl md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Download className="h-5 w-5" /></span>
        <div>
          <p className="font-display font-bold text-navy-900">Install DdotsMediaJobs</p>
          <p className="mt-0.5 text-sm text-navy-700/70">Get instant job alerts and apply in one tap.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Add to home screen</button>
            <button onClick={dismiss} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
