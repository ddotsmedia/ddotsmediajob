import Link from 'next/link';
import { cn } from '@/lib/utils';

/** 4-dot 2x2 brand mark + wordmark. */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)} aria-label="DdotsMediaJobs home">
      <span className="logo-dots" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className={cn('font-display text-lg font-extrabold tracking-tight', dark ? 'text-white' : 'text-navy-900')}>
        <span className="text-teal-500">Ddots</span>MediaJobs
      </span>
    </Link>
  );
}
