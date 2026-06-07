'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';

/** Floating "Post a Job" button on mobile public pages (hidden in app/dashboard areas). */
export function PostJobFab() {
  const pathname = usePathname() ?? '';
  const hidden = ['/dashboard', '/admin', '/employer', '/login', '/register'].some((p) => pathname.startsWith(p));
  if (hidden) return null;

  return (
    <Link
      href="/employer/post"
      aria-label="Post a job"
      className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 md:hidden"
    >
      <Plus className="h-5 w-5" /> Post a Job
    </Link>
  );
}
