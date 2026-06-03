/** Dependency-free CSS bar chart for the admin dashboard. */
export function MiniBar({ data, label }: { data: { label: string; value: number }[]; label?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      {label && <h3 className="mb-3 font-display text-sm font-bold text-navy-900">{label}</h3>}
      <div className="flex items-end gap-1.5" style={{ height: 140 }}>
        {data.map((d, i) => (
          <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-navy-700/70 opacity-0 transition-opacity group-hover:opacity-100">
              {d.value}
            </span>
            <div
              className="w-full rounded-t bg-teal-500/80 transition-all hover:bg-teal-500"
              style={{ height: `${(d.value / max) * 110 + 2}px` }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[9px] text-navy-700/40">{d.label.split(' ')[1] ?? d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal labelled bars (category breakdowns). */
export function HBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate capitalize text-navy-700/70">{d.label.replace(/-/g, ' ')}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-100">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right font-semibold text-navy-900">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
