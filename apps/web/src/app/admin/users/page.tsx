'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { USER_ROLES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Select, Badge } from '@/components/ui/primitives';

export default function AdminUsersPage() {
  const utils = trpc.useUtils();
  const [q, setQ] = useState('');
  const users = trpc.admin.users.useQuery({ q: q || undefined, page: 1 });

  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success('Role updated');
    },
  });
  const setBan = trpc.admin.setUserBan.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success('Updated');
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Users</h1>

      <div className="mt-4 flex max-w-md items-center gap-2 rounded-lg border bg-white px-3">
        <Search className="h-4 w-4 text-navy-700/40" />
        <Input className="border-0 focus-visible:ring-0" placeholder="Search by email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        {users.isLoading ? (
          <Loader2 className="m-6 animate-spin text-teal-500" />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium text-navy-900">{u.name ?? '—'}</td>
                  <td className="px-5 py-3 text-navy-700/70">{u.email}</td>
                  <td className="px-5 py-3">
                    <Select
                      className="h-8 w-32 text-xs"
                      value={u.role}
                      onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as never })}
                    >
                      {USER_ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                    </Select>
                  </td>
                  <td className="px-5 py-3">
                    {u.isBanned ? <Badge variant="urgent">Banned</Badge> : <Badge variant="success">Active</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setBan.mutate({ userId: u.id, banned: !u.isBanned })}>
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
