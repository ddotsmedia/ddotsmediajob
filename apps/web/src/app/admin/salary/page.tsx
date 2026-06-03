'use client';

import { toast } from 'sonner';
import { Loader2, Check, Trash2 } from 'lucide-react';
import { categoryBySlug, emirateBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export default function AdminSalaryPage() {
  const utils = trpc.useUtils();
  const rows = trpc.admin.salaryReports.useQuery();
  const inval = () => utils.admin.salaryReports.invalidate();
  const verify = trpc.admin.setSalaryVerified.useMutation({ onSuccess: () => { inval(); toast.success('Updated'); } });
  const del = trpc.admin.deleteSalary.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Salary Reports</h1>
      <p className="text-navy-700/60">Crowd-sourced submissions feeding the salary guide.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {rows.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr><th className="px-4 py-3">Role</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Emirate</th><th className="px-4 py-3 text-right">AED/mo</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {rows.data?.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{r.jobTitle}</td>
                  <td className="px-4 py-3 text-navy-700/70">{categoryBySlug(r.categorySlug ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-700/70">{emirateBySlug(r.emirateSlug ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-700">{r.salaryMonthly.toLocaleString('en-AE')}</td>
                  <td className="px-4 py-3">{r.isVerified ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => verify.mutate({ id: r.id, verified: !r.isVerified })}><Check className={r.isVerified ? 'text-lime-600' : ''} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: r.id })}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.data?.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-navy-700/60">No reports.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
