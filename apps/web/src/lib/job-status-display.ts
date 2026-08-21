import type { JobStatus } from '@ddots/shared';

/**
 * Presentation for the nine real job statuses.
 *
 * Note these are the statuses this system actually has — there is no "approved"
 * or "live": an approved job is `active`, which is also the live/searchable state.
 */
export const STATUS_STYLES: Record<JobStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-navy-100 text-navy-700' },
  pending: { label: 'Pending review', className: 'bg-amber-100 text-amber-800' },
  active: { label: 'Live', className: 'bg-green-100 text-green-800' },
  paused: { label: 'Paused', className: 'bg-blue-100 text-blue-800' },
  filled: { label: 'Filled', className: 'bg-teal-100 text-teal-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', className: 'bg-navy-100 text-navy-700' },
  closed: { label: 'Closed', className: 'bg-navy-100 text-navy-700' },
  archived: { label: 'Archived', className: 'bg-navy-200 text-navy-800' },
};

export function statusLabel(status: JobStatus): string {
  return STATUS_STYLES[status]?.label ?? status;
}

