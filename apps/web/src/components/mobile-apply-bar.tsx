/** Sticky bottom apply bar on mobile job detail — salary + Apply (scrolls to the apply card). */
export function MobileApplyBar({ salary }: { salary: string }) {
  return (
    <div
      style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom))' }}
      className="fixed inset-x-0 z-40 border-t bg-white px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-teal-700">{salary}</p>
        <a href="#apply" className="shrink-0 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white active:scale-95">
          Apply Now
        </a>
      </div>
    </div>
  );
}
