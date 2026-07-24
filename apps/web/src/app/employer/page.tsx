import Link from 'next/link';
import { Briefcase, Eye, FileText, CheckCircle2, PlusCircle, ArrowRight } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { VerificationStatusBadge } from '@/components/verification-status-badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

// Next verification step shown on the dashboard card.
function nextStep(v: { tier: string; hasLegal: boolean; hasWebsite: boolean }): string | null {
  if (v.tier === 'unverified') return 'Add your company details to get Basic verified.';
  if (v.tier === 'basic') return 'Next step to Enhanced: submit your legal details and website.';
  if (v.tier === 'pending') return 'Your Enhanced verification is under review.';
  return null; // enhanced / pro — fully verified
}

export default async function EmployerDashboard() {
  const api = await getApi();
  const { totals, recentApps } = await api.employers.dashboard();
  const verification = await api.employers.verification();
  const step = nextStep(verification);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Employer Dashboard</h1>
          <p className="text-navy-700/60">Your hiring activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/employer/candidates">Search CVs</Link></Button>
          <Button asChild variant="outline"><Link href="/employer/applications">View Applications</Link></Button>
          <Button asChild><Link href="/employer/post"><PlusCircle /> Post a Job</Link></Button>
        </div>
      </div>

      {/* Verification status card (Phase 4B) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <VerificationStatusBadge tier={verification.tier} />
          {step && <p className="text-sm text-navy-700/70">{step}</p>}
        </div>
        {verification.tier !== 'enhanced' && verification.tier !== 'pro' && verification.tier !== 'pending' && (
          <Button asChild size="sm"><Link href="/employer/onboarding">Complete Verification <ArrowRight className="h-4 w-4" /></Link></Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={totals.active} />
        <StatCard icon={CheckCircle2} label="Pending Review" value={totals.pending} />
        <StatCard icon={Eye} label="Total Views" value={totals.views} />
        <StatCard icon={FileText} label="Applications" value={totals.applications} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Recent applications</h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          {recentApps.length === 0 ? (
            <p className="p-8 text-center text-navy-700/60">No applications yet.</p>
          ) : (
            <div className="divide-y">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-navy-900">{app.seeker?.name ?? 'Candidate'}</p>
                    <p className="text-sm text-navy-700/60">applied to {app.job?.title} · {timeAgo(app.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold capitalize text-navy-700">{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
