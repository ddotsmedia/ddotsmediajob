import { TRPCError } from '@trpc/server';

/**
 * Centralized authorization policies (audit Phase 3). Pure predicates + thin assert wrappers,
 * so the same rule is used everywhere and can be unit-tested (including denial cases).
 * These REPLACE the ownership check that was duplicated across jobs/applications routers.
 */
export type ActorUser = { id: string; role: string };

/** May the user create/edit/pause/close/delete/renew this job? Admins always; else the owner. */
export function canManageJob(job: { employerId: string | null }, user: ActorUser): boolean {
  return user.role === 'admin' || (job.employerId != null && job.employerId === user.id);
}

/** May the user view/act on this application? Admins always; else the owner of its job. */
export function canViewApplication(app: { job: { employerId: string | null } }, user: ActorUser): boolean {
  return user.role === 'admin' || (app.job.employerId != null && app.job.employerId === user.id);
}

/** May the user read/modify a resource they own (generic owner-or-admin check)? */
export function ownsOrAdmin(ownerId: string | null, user: ActorUser): boolean {
  return user.role === 'admin' || (ownerId != null && ownerId === user.id);
}

export function assertJobOwner(job: { employerId: string | null }, user: ActorUser): void {
  if (!canManageJob(job, user)) throw new TRPCError({ code: 'FORBIDDEN' });
}

export function assertAppOwner(app: { job: { employerId: string | null } }, user: ActorUser): void {
  if (!canViewApplication(app, user)) throw new TRPCError({ code: 'FORBIDDEN' });
}
