import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { MessageCircle, Users, Briefcase, Award } from 'lucide-react';
import { categoryBySlug, formatSalary, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.communityHub.getGroup({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: 'Group not found' };
  return { title: `${data.group.name} — WhatsApp Job Group UAE`, description: data.group.groupDescription ?? data.group.description ?? `Join ${data.group.name} for daily UAE job postings.`, alternates: { canonical: `${SITE.url}/whatsapp-groups/${slug}` } };
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { group, recentBlasts } = data;
  const category = group.categorySlug ? categoryBySlug(group.categorySlug) : null;

  return (
    <div className="bg-navy-50/30">
      <div className="bg-gradient-to-r from-teal-600 to-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold">{group.name}</h1>
            {group.isVerified && <Award className="h-6 w-6 text-teal-200" />}
          </div>
          <p className="mt-1 text-white/70">{category?.name ?? 'Community'} · {group.memberCount.toLocaleString('en-AE')} members</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.badgeMostActive && <Badge variant="gold">Most Active</Badge>}
            {group.badgeFastestHiring && <Badge variant="success">Fastest Hiring</Badge>}
            {group.badgeFeatured && <Badge>Featured</Badge>}
          </div>
          <a href={group.inviteUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 font-semibold text-white hover:opacity-90"><MessageCircle className="h-5 w-5" /> Join this group</a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Jobs shared" value={group.jobsSharedCount} />
          <Stat label="Hires tracked" value={group.hiresCount} />
          <Stat label="Members" value={group.memberCount} />
        </div>

        {(group.groupDescription || group.description) && (
          <div className="rounded-xl border bg-white p-6"><h2 className="font-display text-lg font-bold text-navy-900">About</h2><p className="mt-2 text-navy-700/80">{group.groupDescription ?? group.description}</p></div>
        )}

        <div>
          <h2 className="font-display text-xl font-bold text-navy-900">Recent jobs shared</h2>
          <div className="mt-3 space-y-2">
            {recentBlasts.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-white py-8 text-center text-navy-700/60">No jobs blasted yet. {category && <Link href={`/jobs?category=${group.categorySlug}`} className="font-semibold text-teal-600 hover:underline">Browse {category.name} jobs →</Link>}</p>
            ) : recentBlasts.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
                <div><p className="font-medium text-navy-900">{b.title}</p><p className="text-xs text-navy-700/60">{formatSalary(b.salaryMin, b.salaryMax, b.salaryPeriod ?? 'monthly', b.salaryHidden ?? false)} · {new Date(b.sentAt).toLocaleDateString('en-AE')}</p></div>
                {b.slug && <Link href={`/jobs/${b.slug}`} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">Apply</Link>}
              </div>
            ))}
          </div>
        </div>

        {category && (
          <Link href={`/jobs?category=${group.categorySlug}`} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 font-semibold text-navy-700 hover:bg-navy-50"><Briefcase className="h-4 w-4" /> Browse all {category.name} jobs</Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-white p-4 text-center"><p className="font-display text-2xl font-bold text-navy-900">{value.toLocaleString('en-AE')}</p><p className="text-xs text-navy-700/60">{label}</p></div>;
}
