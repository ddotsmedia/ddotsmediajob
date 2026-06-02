import type { LucideIcon } from 'lucide-react';

export function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-navy-700/60">{label}</span>
        <Icon className="h-5 w-5 text-teal-500" />
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold text-navy-900">{value}</p>
    </div>
  );
}
