const STATS = [
  { value: '80,000+', label: 'Active Professionals' },
  { value: '1,500+', label: 'Verified Employers' },
  { value: '25,000+', label: 'Jobs Posted' },
  { value: '97%', label: 'Hiring Success Rate' },
];

export function StatsBar() {
  return (
    <section className="border-y border-[#E5EEF0] bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 py-8 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} className={`px-2 text-center ${i < STATS.length - 1 ? 'md:border-r md:border-[#E5EEF0]' : ''}`}>
            <div className="font-display text-2xl font-extrabold text-[#2E8E97] md:text-3xl">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-[#64748B]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
