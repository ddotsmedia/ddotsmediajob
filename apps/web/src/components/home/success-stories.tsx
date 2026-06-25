import { Star } from 'lucide-react';

const STORIES = [
  { quote: 'Found a driver job in Dubai within 3 days through a WhatsApp group. The walk-in details were spot on.', name: 'Rahul S.', role: 'Delivery Driver, Dubai' },
  { quote: 'The AI CV builder got me shortlisted for two nursing roles. Hired within two weeks.', name: 'Maria L.', role: 'Staff Nurse, Abu Dhabi' },
];

export function SuccessStories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-[#0F172A] md:text-3xl">Success Stories</h2>
        <div className="mt-1.5 h-1 w-12 rounded-full bg-[#2E8E97]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {STORIES.map((s) => (
          <div key={s.name} className="rounded-xl border border-[#E5EEF0] bg-white p-6 shadow-sm">
            <div className="flex gap-0.5 text-[#F6C84C]">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-3 text-[#0F172A]">“{s.quote}”</p>
            <p className="mt-4 font-display text-sm font-bold text-[#0F172A]">{s.name}</p>
            <p className="text-xs text-[#64748B]">{s.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
