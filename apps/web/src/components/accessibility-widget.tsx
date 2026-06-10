'use client';

import { useState, useEffect } from 'react';
import { Accessibility, Plus, Minus, Contrast, RotateCcw, X } from 'lucide-react';

const KEY = 'ddots-a11y';

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [font, setFont] = useState(0); // 0–3
  const [contrast, setContrast] = useState(false);
  const [ready, setReady] = useState(false);

  // Load saved prefs once.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { font?: number; contrast?: boolean };
      setFont(Math.max(0, Math.min(3, saved.font ?? 0)));
      setContrast(Boolean(saved.contrast));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Apply + persist.
  useEffect(() => {
    if (!ready) return;
    const el = document.documentElement;
    el.setAttribute('data-font', String(font));
    el.classList.toggle('a11y-contrast', contrast);
    try { localStorage.setItem(KEY, JSON.stringify({ font, contrast })); } catch { /* ignore */ }
  }, [font, contrast, ready]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Accessibility options"
        className="fixed bottom-20 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-teal-400 md:bottom-4"
      >
        <Accessibility className="h-5 w-5" />
      </button>

      {open && (
        <div role="dialog" aria-label="Accessibility settings" className="fixed bottom-32 left-4 z-50 w-64 rounded-xl border bg-white p-4 shadow-xl md:bottom-16">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-navy-900">Accessibility</h2>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-navy-500" /></button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-navy-700/70">Text size</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setFont((f) => Math.max(0, f - 1))} aria-label="Decrease text size" className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-navy-50"><Minus className="h-4 w-4" /></button>
                <div className="flex-1 text-center text-sm font-semibold text-navy-900">{['Default', 'Large', 'Larger', 'Largest'][font]}</div>
                <button onClick={() => setFont((f) => Math.min(3, f + 1))} aria-label="Increase text size" className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-navy-50"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <button
              onClick={() => setContrast((c) => !c)}
              aria-pressed={contrast}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium ${contrast ? 'border-teal-500 bg-teal-50 text-teal-700' : 'text-navy-700 hover:bg-navy-50'}`}
            >
              <span className="flex items-center gap-2"><Contrast className="h-4 w-4" /> High contrast</span>
              <span className="text-xs">{contrast ? 'On' : 'Off'}</span>
            </button>

            <button onClick={() => { setFont(0); setContrast(false); }} className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-navy-500 hover:bg-navy-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
}
