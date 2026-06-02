'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Loader2, Upload, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Badge } from '@/components/ui/primitives';

export default function VerifyPage() {
  const profile = trpc.employers.me.useQuery();
  const presign = trpc.employers.presignVerificationDoc.useMutation();
  const submit = trpc.employers.submitVerification.useMutation({
    onSuccess: () => {
      profile.refetch();
      toast.success('Submitted for review');
    },
    onError: (e) => toast.error(e.message),
  });

  const [license, setLicense] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const status = profile.data?.verificationStatus ?? 'unverified';

  async function upload(file: File) {
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await presign.mutateAsync({ filename: file.name, contentType: file.type });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setDocUrl(publicUrl);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const STATUS_UI: Record<string, { icon: any; variant: any; label: string; note: string }> = {
    unverified: { icon: ShieldCheck, variant: 'muted', label: 'Not verified', note: 'Verify your company to earn a trust badge and rank higher.' },
    pending: { icon: Clock, variant: 'gold', label: 'Under review', note: 'We are reviewing your documents — usually within 1–2 business days.' },
    verified: { icon: BadgeCheck, variant: 'success', label: 'Verified', note: 'Your company is verified. The badge now shows on your jobs and profile.' },
    rejected: { icon: XCircle, variant: 'urgent', label: 'Rejected', note: profile.data?.verificationNote ?? 'Please resubmit with valid documents.' },
  };
  const s = STATUS_UI[status]!;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">Company Verification</h1>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <s.icon className="h-6 w-6 text-teal-600" />
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <p className="mt-2 text-sm text-navy-700/70">{s.note}</p>

        {status !== 'verified' && status !== 'pending' && (
          <div className="mt-5 space-y-4 border-t pt-5">
            <div className="space-y-1.5">
              <Label>Trade licence number</Label>
              <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="e.g. CN-1234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Trade licence document (PDF/image)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-navy-200 px-4 py-3 text-sm text-navy-700 hover:bg-navy-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {docUrl ? 'Document uploaded ✓' : 'Choose file'}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
            <Button onClick={() => submit.mutate({ tradeLicenseNo: license, docUrl })} disabled={submit.isPending || !license || !docUrl}>
              {submit.isPending && <Loader2 className="animate-spin" />} Submit for verification
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
