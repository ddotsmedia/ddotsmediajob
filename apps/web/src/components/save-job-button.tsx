'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isJobSaved, toggleSavedJob, subscribeSavedJobs } from '@/lib/saved-jobs';

/** Bookmark toggle for a job. `slug` is the stable id we persist (see lib/saved-jobs). */
export function SaveJobButton({ slug, title, className }: { slug: string; title: string; className?: string }) {
  // Start false on server AND first client render (avoids hydration mismatch);
  // the effect reconciles with localStorage right after mount.
  const [saved, setSaved] = useState(false);

  const sync = useCallback(() => setSaved(isJobSaved(slug)), [slug]);

  useEffect(() => {
    sync();
    return subscribeSavedJobs(sync); // re-sync on any change (this tab + other tabs)
  }, [sync]);

  function toggle(e: React.MouseEvent) {
    // Cards wrap the button in a link/overlay — don't navigate on save.
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleSavedJob(slug));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved jobs` : `Save ${title}`}
      title={saved ? 'Saved' : 'Save job'}
      className={cn(
        'relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
        saved ? 'border-teal-300 bg-teal-50 text-teal-600' : 'border-slate-200 bg-white text-slate-400 hover:border-teal-300 hover:text-teal-600',
        className,
      )}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}
