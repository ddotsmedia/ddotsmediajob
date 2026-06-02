import { timeAgo } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const api = await getApi();
  const logs = await api.admin.auditLog();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Audit Log</h1>
      <p className="text-navy-700/60">Recent administrative and system actions.</p>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-navy-50 text-left text-navy-700">
            <tr>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Entity</th>
              <th className="px-5 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-5 py-3 font-mono text-xs text-navy-900">{log.action}</td>
                <td className="px-5 py-3 text-navy-700/70">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</td>
                <td className="px-5 py-3 text-navy-700/50">{timeAgo(log.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-12 text-center text-navy-700/60">No audit entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
