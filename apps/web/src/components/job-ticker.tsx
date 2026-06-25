import Link from 'next/link';
import { emirateBySlug, formatJobDate } from '@ddots/shared';

export type TickerItem = { slug: string; title: string; emirateSlug: string; publishedAt: Date | string | null };

/** Auto-scrolling marquee of the latest jobs. Pauses on hover; respects reduced-motion. */
export function JobTicker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  // Duplicate the list so the -50% translate loops seamlessly.
  const loop = [...items, ...items];
  return (
    <div className="ticker-pause overflow-hidden text-white" style={{ background: '#2d8a70' }}>
      <div className="mx-auto flex max-w-[100vw] items-center">
        <span className="z-10 shrink-0 bg-teal-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">Live</span>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-ticker flex w-max gap-8 whitespace-nowrap py-1.5 pl-8 text-xs">
            {loop.map((j, i) => (
              <Link key={`${j.slug}-${i}`} href={`/jobs/${j.slug}`} className="inline-flex items-center gap-1.5 hover:underline">
                🆕 <span className="font-semibold">{j.title}</span> in {emirateBySlug(j.emirateSlug)?.name ?? j.emirateSlug}
                <span className="text-white/60">· {formatJobDate(j.publishedAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
