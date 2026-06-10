'use client';

import { toast } from 'sonner';
import { Scale, Check } from 'lucide-react';
import { useCompare, toggleCompare, MAX_COMPARE } from '@/lib/compare';
import { cn } from '@/lib/utils';

export function CompareButton({ slug, title }: { slug: string; title: string }) {
  const list = useCompare();
  const added = list.some((x) => x.slug === slug);
  return (
    <button
      type="button"
      aria-pressed={added}
      title={added ? 'Remove from compare' : 'Add to compare'}
      onClick={() => {
        const { full } = toggleCompare({ slug, title });
        if (full) toast.error(`You can compare up to ${MAX_COMPARE} jobs.`);
      }}
      className={cn(
        'relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
        added ? 'border-teal-500 bg-teal-50 text-teal-700' : 'text-navy-600 hover:bg-navy-50',
      )}
    >
      {added ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
    </button>
  );
}
