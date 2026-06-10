import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm hover:bg-navy-50">
          ← Prev
        </Link>
      )}
      {/* Numbered pages on sm+, compact indicator on mobile. */}
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) => {
          const gap = i > 0 && p - pages[i - 1]! > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="px-1 text-navy-700/40">…</span>}
              <Link
                href={makeHref(p)}
                className={cn(
                  'rounded-lg border px-3.5 py-2 text-sm',
                  p === page ? 'border-teal-500 bg-teal-500 text-white' : 'hover:bg-navy-50',
                )}
              >
                {p}
              </Link>
            </span>
          );
        })}
      </div>
      <span className="px-3 text-sm font-medium text-navy-700/70 sm:hidden">Page {page} of {totalPages}</span>
      {page < totalPages && (
        <Link href={makeHref(page + 1)} className="flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm hover:bg-navy-50">
          Next →
        </Link>
      )}
    </nav>
  );
}
