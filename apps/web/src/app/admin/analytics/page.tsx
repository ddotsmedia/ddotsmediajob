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
    </div>
  );
}
