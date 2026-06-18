'use client';

import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/switch';

const INTEGRATIONS: { key: 'email' | 'storage' | 'search' | 'realtime' | 'analytics' | 'monitoring'; label: string; offHint: string }[] = [
  { key: 'email', label: 'Email (Resend)', offHint: 'Set RESEND_API_KEY (re_…) — emails are skipped until configured.' },
  { key: 'storage', label: 'File storage (Cloudflare R2)', offHint: 'Set R2_ACCOUNT_ID + keys — uploads are disabled until configured.' },
  { key: 'search', label: 'Search (Meilisearch)', offHint: 'Set MEILISEARCH_URL — search falls back to the database until configured.' },
  { key: 'realtime', label: 'Real-time (Pusher)', offHint: 'Set PUSHER_APP_ID/KEY/SECRET — notifications fall back to polling.' },
  { key: 'analytics', label: 'Analytics (Umami)', offHint: 'Set NEXT_PUBLIC_UMAMI_ID — analytics are disabled until configured.' },
  { key: 'monitoring', label: 'Error monitoring (Sentry)', offHint: 'Set NEXT_PUBLIC_SENTRY_DSN — error reporting is off until configured.' },
];

export default function AdminSettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.admin.getSettings.useQuery();
  const integrations = trpc.content.integrations.useQuery(undefined, { staleTime: 60_000 });
  const searchStatus = trpc.admin.searchStatus.useQuery(undefined, { staleTime: 30_000 });
  const uptime = trpc.admin.uptimeStatus.useQuery(undefined, { staleTime: 60_000 });
  const reindex = trpc.admin.reindexJobs.useMutation({
    onSuccess: (r) => { searchStatus.refetch(); toast.success(r.configured ? `Re-indexed ${r.indexed} jobs` : 'Meilisearch not configured'); },
    onError: (e) => toast.error(e.message),
  });
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
        <div className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm font-medium text-navy-900">Auto-approve new jobs</p>
            <p className="text-xs text-navy-700/50">Skip the manual approval queue.</p>
          </div>
          <Switch
            checked={Boolean(s.auto_approve_jobs)}
            disabled={setSetting.isPending}
            onCheckedChange={(v) => setSetting.mutate({ key: 'auto_approve_jobs', value: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t py-1 pt-4">
          <div>
            <p className="text-sm font-medium text-navy-900">Show About Employer on all job posts</p>
            <p className="text-xs text-navy-700/50">Global default. Individual jobs can override in the job editor.</p>
          </div>
          <Switch
            checked={(s.show_employer_info as { enabled?: boolean } | undefined)?.enabled ?? true}
            disabled={setSetting.isPending}
            onCheckedChange={(v) => setSetting.mutate({ key: 'show_employer_info', value: { enabled: v } })}
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

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Uptime</h2>
        <p className="text-sm text-navy-700/60">Health checks run every 5 minutes from the worker. Admins are emailed after 3 consecutive failures.</p>
        {uptime.data?.configured ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div>
              <div className="font-display text-2xl font-extrabold text-navy-900">{uptime.data.percent}%</div>
              <div className="text-xs text-navy-700/50">uptime over {uptime.data.checks} checks</div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${uptime.data.lastStatus === 'up' ? 'bg-green-50 text-green-700' : uptime.data.lastStatus === 'down' ? 'bg-red-50 text-red-700' : 'bg-navy-50 text-navy-500'}`}>
              <span className={`h-2 w-2 rounded-full ${uptime.data.lastStatus === 'up' ? 'bg-green-500' : uptime.data.lastStatus === 'down' ? 'bg-red-500' : 'bg-navy-300'}`} />
              {uptime.data.lastStatus === 'up' ? 'Operational' : uptime.data.lastStatus === 'down' ? 'Down' : 'Unknown'}
            </span>
            {uptime.data.lastCheckAt && <span className="text-xs text-navy-700/50">last check {new Date(uptime.data.lastCheckAt).toLocaleString('en-AE')}</span>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-navy-700/50">No checks recorded yet — the worker populates this within 5 minutes of starting.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-navy-900">Integrations</h2>
          <a href="/admin/settings/whapi" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-navy-700 hover:border-[#25D366] hover:text-[#1a8a4d]">
            WhatsApp Import →
          </a>
        </div>
        <p className="text-sm text-navy-700/60">Optional services. The site works without them — each has a built-in fallback.</p>
        <div className="mt-4 divide-y">
          {INTEGRATIONS.map((row) => {
            const on = integrations.data?.[row.key] ?? false;
            return (
              <div key={row.key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-navy-900">{row.label}</p>
                  {!on && <p className="text-xs text-navy-700/50">{row.offHint}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.key === 'search' && on && (
                    <>
                      <span className="text-xs text-navy-700/50">{searchStatus.data?.count ?? '—'} indexed</span>
                      <Button size="sm" variant="outline" onClick={() => reindex.mutate()} disabled={reindex.isPending}>
                        {reindex.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Re-index'}
                      </Button>
                    </>
                  )}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${on ? 'bg-green-50 text-green-700' : 'bg-navy-50 text-navy-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${on ? 'bg-green-500' : 'bg-navy-300'}`} />
                    {on ? 'Connected' : 'Not configured'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Announcement Banner</h2>
        <p className="text-sm text-navy-700/60">Site-wide banner above the header. Leave text empty or untick to hide.</p>
        {(() => {
          const ann = (s.announcement_banner ?? {}) as { enabled?: boolean; text?: string; link?: string };
          return (
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" id="ann_enabled" defaultChecked={!!ann.enabled} className="h-4 w-4 rounded text-teal-600" /> Show banner
              </label>
              <div className="space-y-1.5"><Label>Banner text</Label><Input id="ann_text" defaultValue={ann.text ?? ''} placeholder="e.g. 🎉 New: post a job in 60 seconds — free" /></div>
              <div className="space-y-1.5"><Label>Link (optional)</Label><Input id="ann_link" defaultValue={ann.link ?? ''} placeholder="/post-a-job" /></div>
              <Button
                onClick={() => {
                  const enabled = (document.getElementById('ann_enabled') as HTMLInputElement | null)?.checked ?? false;
                  const text = (document.getElementById('ann_text') as HTMLInputElement | null)?.value ?? '';
                  const link = (document.getElementById('ann_link') as HTMLInputElement | null)?.value ?? '';
                  setSetting.mutate({ key: 'announcement_banner', value: { enabled, text, link } });
                }}
                disabled={setSetting.isPending}
              >
                <Save /> Save banner
              </Button>
            </div>
          );
        })()}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Page Visibility</h2>
        <p className="text-sm text-navy-700/60">Show or hide pages from the public navigation.</p>
        <div className="mt-4 divide-y">
          {[
            { key: 'salary_guide_visible', label: 'Salary Guide', desc: 'Show salary guide page and nav link to visitors' },
            { key: 'whatsapp_groups_visible', label: 'WhatsApp Groups', desc: 'Show WhatsApp groups page and nav link' },
            { key: 'community_visible', label: 'Community Q&A', desc: 'Show community forum page and nav link' },
            { key: 'blog_visible', label: 'Blog', desc: 'Show blog page and nav link' },
            { key: 'tools_visible', label: 'Tools', desc: 'Show tools section and nav link' },
          ].map((row) => {
            const visible = s[row.key] !== false;
            return (
              <div key={row.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-navy-900">{row.label}</p>
                  <p className="text-xs text-navy-700/50">{row.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (!next && !window.confirm(`Hide ${row.label}? Visitors will no longer see this page or its navigation link.`)) return;
                    setSetting.mutate({ key: row.key, value: next }, { onSuccess: () => toast.success(`${row.label} is now ${next ? 'visible' : 'hidden'}`) });
                  }}
                  className="h-5 w-5 rounded text-teal-600"
                />
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-navy-700/50">ℹ️ Changes take effect immediately. Admin users can still access all pages regardless of visibility.</p>
      </div>
    </div>
  );
}
