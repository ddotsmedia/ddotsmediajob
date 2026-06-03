'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Camera, Loader2, User } from 'lucide-react';
import { trpc } from '@/trpc/react';

/** Profile photo uploader → Cloudflare R2, saved to the user record. */
export function AvatarUpload() {
  const { data: session } = useSession();
  const [url, setUrl] = useState<string | null>(session?.user?.image ?? null);
  const [busy, setBusy] = useState(false);
  const presign = trpc.jobseekers.presignAvatar.useMutation();
  const save = trpc.jobseekers.setAvatar.useMutation();

  async function upload(file: File) {
    if (file.size > 5_000_000) return toast.error('Image must be under 5 MB');
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await presign.mutateAsync({ filename: file.name, contentType: file.type });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await save.mutateAsync({ url: publicUrl });
      setUrl(publicUrl);
      toast.success('Photo updated');
    } catch {
      toast.error('Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-navy-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><User className="h-8 w-8 text-navy-400" /></div>
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50">
        <Camera className="h-4 w-4" /> Change photo
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
    </div>
  );
}
