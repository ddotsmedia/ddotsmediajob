'use client';

import Link from 'next/link';
import { Scale, X } from 'lucide-react';
import { useCompare, clearCompare } from '@/lib/compare';

export function CompareBar() {
  const list = useCompare();
  if (list.length === 0) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-white px-4 py-2 shadow-xl md:bottom-6">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-900"><Scale className="h-4 w-4 text-teal-600" /> {list.length} to compare</span>
      <Link href="/compare" className="rounded-full bg-teal-600 px-3 py-1 text-sm font-semibold text-white hover:bg-teal-700">Compare</Link>
      <button onClick={clearCompare} aria-label="Clear compare" className="text-navy-400 hover:text-red-500"><X className="h-4 w-4" /></button>
    </div>
  );
}
