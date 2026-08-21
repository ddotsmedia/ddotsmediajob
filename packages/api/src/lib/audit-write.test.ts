import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the DB so the write path can be asserted without a live connection.
const values = vi.fn().mockResolvedValue(undefined);
const insert = vi.fn((_table: unknown) => ({ values }));
vi.mock('@ddots/db', () => ({ db: { insert: (table: unknown) => insert(table) }, auditLogs: { _: 'audit_logs' } }));

const { audit } = await import('./audit');

const row = () => values.mock.calls[0]![0] as Record<string, unknown>;

const ctx = (over: Record<string, unknown> = {}) => ({
  session: { user: { id: 'admin-1' } },
  headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'Mozilla/5.0 (Admin)' }),
  ...over,
});

beforeEach(() => {
  values.mockClear();
  insert.mockClear();
});

describe('audit()', () => {
  it('records who, what and where from the request context', async () => {
    await audit(ctx(), 'admin.job.delete', 'job', 'job-9');
    expect(row()).toMatchObject({
      actorId: 'admin-1',
      action: 'admin.job.delete',
      entity: 'job',
      entityId: 'job-9',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (Admin)',
    });
  });

  it('captures the IP that was previously always null', async () => {
    await audit(ctx(), 'job.approve', 'job', 'job-1');
    // Regression guard: the column and the viewer existed, but nothing ever wrote it.
    expect(row().ip).not.toBeNull();
  });

  it('stores a field-level diff when both sides are given', async () => {
    await audit(ctx(), 'admin.job.status', 'job', 'job-2', undefined, {
      before: { status: 'pending', title: 'Chef' },
      after: { status: 'active', title: 'Chef' },
    });
    expect(row().meta).toEqual({ changes: { status: { from: 'pending', to: 'active' } } });
  });

  it('merges caller meta with the computed diff', async () => {
    await audit(ctx(), 'job.reject', 'job', 'job-3', { reason: 'spam' }, {
      before: { status: 'pending' },
      after: { status: 'rejected' },
    });
    expect(row().meta).toEqual({
      reason: 'spam',
      changes: { status: { from: 'pending', to: 'rejected' } },
    });
  });

  it('stores a whole-row snapshot for a delete, where there is no after', async () => {
    await audit(ctx(), 'admin.job.delete', 'job', 'job-4', undefined, {
      before: { title: 'Chef', status: 'active' },
    });
    expect(row().meta).toEqual({ deleted: { title: 'Chef', status: 'active' } });
  });

  it('stores a created snapshot when there is no before', async () => {
    await audit(ctx(), 'admin.job.create', 'job', 'job-5', undefined, { after: { title: 'New' } });
    expect(row().meta).toEqual({ created: { title: 'New' } });
  });

  it('writes null meta rather than an empty object when there is nothing to say', async () => {
    await audit(ctx(), 'admin.search.reindex', 'job');
    expect(row().meta).toBeNull();
  });

  it('omits a changes block when the update changed nothing', async () => {
    await audit(ctx(), 'admin.job.status', 'job', 'job-6', undefined, {
      before: { status: 'active' },
      after: { status: 'active' },
    });
    expect(row().meta).toBeNull();
  });

  it('lets an explicit actorId override the session (register/onboarding)', async () => {
    await audit({ ...ctx(), actorId: 'new-user' }, 'user.register', 'user', 'new-user');
    expect(row().actorId).toBe('new-user');
  });

  it('falls back to a null actor rather than throwing when there is no session', async () => {
    await audit({ headers: new Headers() }, 'system.cron', 'system');
    expect(row().actorId).toBeNull();
  });

  it('never throws when the insert fails — logging must not break the mutation', async () => {
    values.mockRejectedValueOnce(new Error('db down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(audit(ctx(), 'job.approve', 'job', 'job-7')).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
