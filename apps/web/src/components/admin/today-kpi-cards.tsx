'use client';

import { CheckCircle2, PlusCircle, XCircle, type LucideIcon } from 'lucide-react';
import { trpc } from '@/trpc/react';

const POLL = { refetchInterval: 30_000 } as const;

function Kpi({
  label,
  icon: Icon,
  tone,
  query,
}: {
  label: string;
  icon: LucideIcon;
  tone: string;
  query: { data?: number; isError: boolean };
}) {
  // A failed query must not look like a load in progress forever.
  const value = query.isError ? '—' : query.data ?? '…';
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 font-display text-4xl font-bold text-navy-900 tabular-nums">{value}</div>
    </div>
  );
}

/** Today's moderation throughput, live. "Today" is the UAE calendar day. */
export function TodayKpiCards() {
  const posted = trpc.admin.jobsPostedToday.useQuery(undefined, POLL);
  const approved = trpc.admin.jobsApprovedToday.useQuery(undefined, POLL);
  const rejected = trpc.admin.jobsRejectedToday.useQuery(undefined, POLL);

  return (
    <section aria-label="Today">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Posted today" icon={PlusCircle} tone="text-blue-700" query={posted} />
        <Kpi label="Approved today" icon={CheckCircle2} tone="text-green-700" query={approved} />
        <Kpi label="Rejected today" icon={XCircle} tone="text-red-700" query={rejected} />
      </div>
      <p className="mt-2 text-xs text-navy-700/50">
        UAE time · refreshes every 30s · approvals and rejections count decisions made in the approval queue
      </p>
    </section>
  );
}
