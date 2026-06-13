import { BarChart3 } from 'lucide-react';
import { getApi } from '@/trpc/server';
import { HBars } from '@/components/admin/mini-bar';

export const dynamic = 'force-dynamic';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 font-display text-sm font-bold text-navy-900">{title}</h2>
      {children}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const api = await getApi();
  const a = await api.admin.analytics();
  const sum = (d: { value: number }[]) => d.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Analytics</h1></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Jobs by status (${sum(a.jobsByStatus)})`}><HBars data={a.jobsByStatus} /></Card>
        <Card title={`Users by role (${sum(a.usersByRole)})`}><HBars data={a.usersByRole} /></Card>
        <Card title={`Jobs by category (${sum(a.jobsByCategory)})`}><HBars data={a.jobsByCategory} /></Card>
        <Card title={`Hiring funnel (${sum(a.funnel)} applications)`}>
          <HBars data={a.funnel} />
          <p className="mt-3 text-xs text-navy-700/50">Applications progressing from applied → hired.</p>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-navy-900">Web analytics (Umami)</h2>
        {process.env.NEXT_PUBLIC_UMAMI_ID ? (
          <>
            <iframe
              title="Umami analytics"
              src={`${process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://analytics.ddotsmediajobs.com'}/share/${process.env.NEXT_PUBLIC_UMAMI_ID}`}
              className="h-[600px] w-full rounded-lg border"
            />
            <a
              href={process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://analytics.ddotsmediajobs.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline"
            >
              View full analytics dashboard →
            </a>
          </>
        ) : (
          <div className="text-sm text-navy-700/60">
            <p>Privacy-first, cookie-free analytics — no consent banner needed.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-navy-700/70">
              <li>Deploy Umami: <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">docker run -d -p 3000:3000 ghcr.io/umami-software/umami:postgresql-latest</code></li>
              <li>Add <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_UMAMI_ID</code> (+ optional <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_UMAMI_URL</code>) to <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">apps/web/.env</code>.</li>
              <li>Redeploy — tracking and these charts activate automatically.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
