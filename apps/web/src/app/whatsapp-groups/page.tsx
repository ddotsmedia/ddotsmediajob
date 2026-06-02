import type { Metadata } from 'next';
import { MessageCircle, Users } from 'lucide-react';
import { categoryBySlug, emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'UAE Job WhatsApp Groups',
  description: 'Join 73+ active WhatsApp groups for UAE jobs by category and emirate. Get daily job postings straight to your phone.',
  alternates: { canonical: `${SITE.url}/whatsapp-groups` },
};

export default async function WhatsappGroupsPage() {
  const api = await getApi();
  const groups = await api.content.whatsappGroups().catch(() => []);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-300">
            <MessageCircle className="h-4 w-4" /> {groups.length} active groups
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">UAE Job WhatsApp Groups</h1>
          <p className="mx-auto mt-2 max-w-2xl text-navy-100/70">
            Join free WhatsApp groups by category and emirate to get daily job postings on your phone.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <a
              key={g.id}
              href={g.inviteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex flex-col rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-navy-700/50">
                  <Users className="h-3.5 w-3.5" /> {g.memberCount.toLocaleString('en-AE')}
                </span>
              </div>
              <h3 className="mt-3 font-display font-bold text-navy-900 group-hover:text-emerald-700">{g.name}</h3>
              {g.description && <p className="mt-1 flex-1 text-sm text-navy-700/70">{g.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {g.categorySlug && <Badge variant="muted">{categoryBySlug(g.categorySlug)?.name}</Badge>}
                {g.emirateSlug && <Badge variant="outline">{emirateBySlug(g.emirateSlug)?.name}</Badge>}
              </div>
              <span className="mt-4 text-sm font-semibold text-emerald-600">Join group →</span>
            </a>
          ))}
        </div>
        {groups.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No groups available yet.</p>
        )}
      </div>
    </div>
  );
}
