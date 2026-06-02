import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-extrabold text-teal-500">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-navy-700/60">The page you're looking for doesn't exist or may have been moved.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link href="/jobs">Browse Jobs</Link></Button>
        <Button asChild variant="outline"><Link href="/">Go Home</Link></Button>
      </div>
    </div>
  );
}
