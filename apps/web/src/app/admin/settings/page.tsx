'use client';

import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export default function AdminSettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.admin.getSettings.useQuery();
  const setSetting = trpc.admin.setSetting.useMutation({
    onSuccess: () => { utils.admin.getSettings.invalidate(); toast.success('Saved'); },
    onError: (e) => toast.error(e.message),
  });

  if (settings.isLoading) return <Loader2 className="animate-spin text-teal-500" />;
  const s = settings.data ?? {};

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Site Settings</h1>
      <p className="text-navy-700/60">Control platform behaviour.</p>

      <div className="mt-6 space-y-4 rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-approve new jobs</Label>
            <p className="text-xs text-navy-700/50">Skip the manual approval queue.</p>
          </div>
          <input
            type="checkbox"
            defaultChecked={Boolean(s.auto_approve_jobs)}
            onChange={(e) => setSetting.mutate({ key: 'auto_approve_jobs', value: e.target.checked })}
            className="h-5 w-5 rounded text-teal-600"
          />
        </div>

        <div className="border-t pt-4">
          <Label>Featured jobs on homepage</Label>
          <div className="mt-2 flex gap-2">
            <Input
              type="number"
              id="featured_limit"
              defaultValue={Number(s.featured_limit ?? 8)}
              className="w-28"
            />
            <Button
              onClick={() => {
                const el = document.getElementById('featured_limit') as HTMLInputElement | null;
                setSetting.mutate({ key: 'featured_limit', value: Number(el?.value ?? 8) });
              }}
              disabled={setSetting.isPending}
            >
              <Save /> Save
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <Label>Support email</Label>
          <div className="mt-2 flex gap-2">
            <Input id="support_email" defaultValue={String(s.support_email ?? 'jobs@ddotsmediajobs.com')} />
            <Button
              onClick={() => {
                const el = document.getElementById('support_email') as HTMLInputElement | null;
                setSetting.mutate({ key: 'support_email', value: el?.value ?? '' });
              }}
              disabled={setSetting.isPending}
            >
              <Save /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
