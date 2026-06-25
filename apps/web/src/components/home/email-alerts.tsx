import Link from 'next/link';

export function EmailAlerts() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#E5EEF0] bg-[#F7FAFC] p-8 md:flex-row">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F172A]">Never miss a job — get email alerts</h2>
          <p className="mt-1 text-sm text-[#64748B]">New UAE jobs matched to you, straight to your inbox.</p>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            className="h-12 flex-1 rounded-xl border border-[#E5EEF0] bg-white px-4 text-sm text-[#0F172A] outline-none placeholder:text-[#64748B]"
          />
          <Link href="/dashboard/alerts" className="flex h-12 items-center justify-center rounded-xl bg-[#2E8E97] px-6 text-sm font-bold text-white hover:bg-[#26757d]">
            Subscribe
          </Link>
        </div>
      </div>
    </section>
  );
}
