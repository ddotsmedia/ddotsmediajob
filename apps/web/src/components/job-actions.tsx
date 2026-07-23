'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Bookmark, Send, Loader2, Upload, Sparkles, Mail } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/primitives';
import { ReportJobButton } from '@/components/report-job-button';
import { WhatsappApplyButton } from '@/components/whatsapp-apply-button';

export function JobActions({
  jobId,
  title,
  slug,
  company,
  applyEmail,
  applyWhatsapp,
  contactWhatsapp,
}: {
  jobId: string;
  title: string;
  slug: string;
  company?: string | null;
  applyEmail?: string | null;
  applyWhatsapp?: string | null;
  contactWhatsapp?: string | null;
}) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const authed = status === 'authenticated';
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' });
  const [cvUrl, setCvUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const isSaved = trpc.jobseekers.isSaved.useQuery({ jobId }, { enabled: authed });
  const toggleSave = trpc.jobseekers.toggleSave.useMutation({
    onSuccess: (r) => { utils.jobseekers.isSaved.invalidate({ jobId }); toast.success(r.saved ? 'Job saved' : 'Removed from saved'); },
    onError: (e) => toast.error(e.message),
  });
  const apply = trpc.applications.submit.useMutation({
    onSuccess: () => { toast.success('Application sent! Check your dashboard.'); setShowApply(false); },
    onError: (e) => toast.error(e.message),
  });
  const guestApply = trpc.applications.guestApply.useMutation({
    onSuccess: () => { toast.success('Application sent! Check your email for confirmation.'); setShowApply(false); },
    onError: (e) => toast.error(e.message),
  });
  const presignGuest = trpc.applications.presignGuestCv.useMutation();
  const coverLetterAI = trpc.ai.coverLetter.useMutation({
    onSuccess: (r) => { setCoverLetter(r.coverLetter); toast.success('Cover letter drafted'); },
    onError: (e) => toast.error(e.message),
  });

  async function uploadGuestCv(file: File) {
    if (file.size > 8_000_000) return toast.error('CV must be under 8 MB');
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await presignGuest.mutateAsync({ filename: file.name, contentType: file.type });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setCvUrl(publicUrl);
      toast.success('CV uploaded');
    } catch { toast.error('Upload failed'); } finally { setUploading(false); }
  }

  const hasWa = !!(applyWhatsapp || contactWhatsapp);

  return (
    <div className="space-y-3">
      {hasWa && (
        <WhatsappApplyButton slug={slug} title={title} company={company} applyWhatsapp={applyWhatsapp} contactWhatsapp={contactWhatsapp} className="w-full" />
      )}
      {applyEmail && (
        <a
          href={`mailto:${applyEmail}?subject=${encodeURIComponent(`Application for ${title}`)}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          <Mail className="h-4 w-4" /> Apply via Email
        </a>
      )}

      <Button variant="accent" size="lg" className="w-full" onClick={() => setShowApply((v) => !v)} disabled={apply.isPending}>
        <Send /> Apply Now
      </Button>

      {showApply && (
        <div className="space-y-3 rounded-lg border bg-navy-50/50 p-4">
          {!authed && (
            <>
              <Input placeholder="Full name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              <Input type="email" placeholder="Email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              <Input placeholder="WhatsApp / phone (optional)" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-navy-200 bg-white px-3 py-2 text-sm text-navy-700 hover:bg-navy-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {cvUrl ? 'CV uploaded ✓' : 'Upload CV (PDF)'}
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadGuestCv(e.target.files[0])} />
              </label>
            </>
          )}
          <Textarea placeholder="Add a short cover letter (optional)…" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          {authed && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => coverLetterAI.mutate({ jobId })} disabled={coverLetterAI.isPending}>
              {coverLetterAI.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate with AI
            </Button>
          )}
          <Button
            className="w-full"
            disabled={apply.isPending || guestApply.isPending}
            onClick={() => {
              if (authed) apply.mutate({ jobId, coverLetter: coverLetter || undefined });
              else {
                if (!guest.name || !guest.email) return toast.error('Name and email are required');
                guestApply.mutate({ jobId, guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone || undefined, resumeUrl: cvUrl, coverLetter: coverLetter || undefined });
              }
            }}
          >
            {apply.isPending || guestApply.isPending ? <Loader2 className="animate-spin" /> : <Send />} Submit Application
          </Button>
          {!authed && (
            <p className="text-center text-xs text-navy-700/50">
              Have an account? <button onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)} className="font-semibold text-teal-600 hover:underline">Sign in</button> to track it.
            </p>
          )}
        </div>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => (authed ? toggleSave.mutate({ jobId }) : router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`))}
        disabled={toggleSave.isPending}
      >
        <Bookmark className={isSaved.data?.saved ? 'fill-teal-500 text-teal-500' : ''} />
        {isSaved.data?.saved ? 'Saved' : 'Save Job'}
      </Button>

      <div className="flex justify-center pt-1">
        <ReportJobButton jobId={jobId} />
      </div>
    </div>
  );
}
