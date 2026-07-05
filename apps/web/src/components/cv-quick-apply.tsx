'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, FileCheck2, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

/** Logged-in one-click apply that sends the jobseeker's stored CV. Renders nothing for
 *  guests or users without a CV on file (they use the WhatsApp / guest-apply paths). */
export function CvQuickApply({ jobId, className }: { jobId: string; className?: string }) {
  const { status } = useSession();
  const me = trpc.jobseekers.me.useQuery(undefined, { enabled: status === 'authenticated' });
  const [applied, setApplied] = useState(false);
  const submit = trpc.applications.submit.useMutation({
    onSuccess: () => { setApplied(true); toast.success('Applied — your CV was sent to the employer'); },
    onError: (e) => {
      if (e.data?.code === 'CONFLICT') { setApplied(true); toast.info('You already applied to this job'); }
      else toast.error(e.message);
    },
  });

  if (status !== 'authenticated') return null;
  const cv = me.data?.resumeUrl;
  if (!cv) return null;

  if (applied) {
    return (
      <Button disabled variant="outline" className={`w-full ${className ?? ''}`}>
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Applied
      </Button>
    );
  }

  return (
    <Button
      className={`w-full ${className ?? ''}`}
      onClick={() => { if (confirm('Send your CV to this employer?')) submit.mutate({ jobId, resumeUrl: cv }); }}
      disabled={submit.isPending}
    >
      {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Quick Apply with CV
    </Button>
  );
}
