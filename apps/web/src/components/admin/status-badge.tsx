import type { JobStatus } from '@ddots/shared';
import { STATUS_STYLES, statusLabel } from '@/lib/job-status-display';

export { statusLabel };

export function StatusBadge({ status, className = '', title }: { status: JobStatus; className?: string; title?: string }) {
  const s = STATUS_STYLES[status];
  // Unknown status still renders rather than crashing the row.
  if (!s) return <span title={title} className={`rounded-full bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-700 ${className}`}>{status}</span>;
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.className} ${className}`}>
      {s.label}
    </span>
  );
}
