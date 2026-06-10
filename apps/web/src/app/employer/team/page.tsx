'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UsersRound, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage jobs, applications, team' },
  { value: 'recruiter', label: 'Recruiter', desc: 'Manage jobs and applications' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
] as const;
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', recruiter: 'Recruiter', viewer: 'Viewer' };

export default function TeamPage() {
  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery();
  const inval = () => utils.team.list.invalidate();
  const invite = trpc.team.invite.useMutation({ onSuccess: () => { inval(); toast.success('Invite sent'); setEmail(''); }, onError: (e) => toast.error(e.message) });
  const updateRole = trpc.team.updateRole.useMutation({ onSuccess: inval });
  const revoke = trpc.team.revoke.useMutation({ onSuccess: () => { inval(); toast.success('Access revoked'); } });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'recruiter' | 'viewer'>('recruiter');

  return (
    <div>
      <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Team</h1></div>
      <p className="text-navy-700/60">Invite sub-accounts and set their access level.</p>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-5">
        <div className="flex-1 space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" /></div>
        <div className="space-y-1.5"><Label>Role</Label><Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></div>
        <Button onClick={() => invite.mutate({ email, role })} disabled={invite.isPending || !email.includes('@')}>{invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Invite</Button>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-navy-700/50 sm:grid-cols-3">{ROLES.map((r) => <p key={r.value}><strong>{r.label}:</strong> {r.desc}</p>)}</div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {list.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {list.data?.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3"><p className="font-medium text-navy-900">{m.member?.name ?? m.email}</p>{m.member?.name && <p className="text-xs text-navy-700/50">{m.email}</p>}</td>
                  <td className="px-4 py-3">
                    <Select className="h-8 w-32 text-xs" value={m.role} onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value as 'admin' | 'recruiter' | 'viewer' })}>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'}`}>{m.status === 'active' ? 'Active' : 'Pending'}</span></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => { if (confirm(`Revoke access for ${m.email}?`)) revoke.mutate({ id: m.id }); }}><Trash2 className="text-red-500" /></Button></td>
                </tr>
              ))}
              {list.data?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-navy-700/60">No team members yet. Invite someone above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-navy-700/50">Note: invited members access the account after signing in with the invited email. Role-based permission enforcement is applied at the account level.</p>
    </div>
  );
}
