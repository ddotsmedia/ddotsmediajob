import Link from 'next/link';
import { Briefcase, Users, FileText, Building2, CheckSquare } from 'lucide-react';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const api = await getApi();
  const stats = await api.admin.stats();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-navy-900">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Total Jobs" value={stats.jobs} />
        <StatCard icon={Users} label="Users" value={stats.users} />
        <StatCard icon={FileText} label="Applications" value={stats.applications} />
        <StatCard icon={Building2} label="Companies" value={stats.companies} />
      </div>

      {stats.pendingJobs > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 p-5">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-teal-600" />
            <div>
              <p className="font-display font-bold text-navy-900">{stats.pendingJobs} jobs awaiting approval</p>
              <p className="text-sm text-navy-700/60">Review and publish pending submissions.</p>
            </div>
          </div>
          <Button asChild><Link href="/admin/approvals">Review now</Link></Button>
        </div>
      )}
    </div>
  );
}
