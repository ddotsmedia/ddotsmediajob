'use client';

import { useState } from 'react';
import { Wallet, CalendarClock } from 'lucide-react';
import { WpsCalculator } from './wps-calculator';
import { EndOfServiceCalculator } from './end-of-service';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'wps', label: 'Salary Split (WPS)', icon: Wallet },
  { key: 'eos', label: 'End of Service', icon: CalendarClock },
] as const;

export function WpsTools() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('wps');
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
              tab === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'wps' ? <WpsCalculator /> : <EndOfServiceCalculator />}
    </div>
  );
}
