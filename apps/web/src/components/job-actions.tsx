'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Bookmark, Send, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';

export function JobActions({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const isSaved = trpc.jobseekers.isSaved.useQuery({ jobId }, { enabled: status === 'authenticated' });
  const toggleSave = trpc.jobseekers.toggleSave.useMutation({
    onSuccess: (r) => {
      utils.jobseekers.isSaved.invalidate({ jobId });
      toast.success(r.saved ? 'Job saved' : 'Removed from saved');
    },
    onError: (e) => toast.error(e.message),
  });
  const apply = trpc.applications.submit.useMutation({
    onSuccess: () => {
      toast.success('Application sent! Check your dashboard.');
      setShowApply(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function requireAuth(action: () => void) {
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    action();
  }

  return (
    <div className="space-y-3">
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={() => requireAuth(() => setShowApply((v) => !v))}
        disabled={apply.isPending}
      >
        <Send /> Apply Now
      </Button>

      {showApply && (
        <div className="space-y-3 rounded-lg border bg-navy-50/50 p-4">
          <Textarea
            placeholder="Add a short cover letter (optional)…"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() => apply.mutate({ jobId, coverLetter: coverLetter || undefined })}
            disabled={apply.isPending}
          >
            {apply.isPending ? <Loader2 className="animate-spin" /> : <Send />} Submit Application
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => requireAuth(() => toggleSave.mutate({ jobId }))}
        disabled={toggleSave.isPending}
      >
        <Bookmark className={isSaved.data?.saved ? 'fill-teal-500 text-teal-500' : ''} />
        {isSaved.data?.saved ? 'Saved' : 'Save Job'}
      </Button>
    </div>
  );
}
