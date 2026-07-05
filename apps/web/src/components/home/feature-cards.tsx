import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Footprints, ShieldCheck, Laptop, Sparkles, Wand2, MessageCircle } from 'lucide-react';

const CARDS: { icon: LucideIcon; title: string; sub: string; href: string }[] = [
  { icon: Footprints, title: 'Walk-in Jobs', sub: 'Meet candidates face to face', href: '/jobs/walk-in-interview-dubai' },
  { icon: ShieldCheck, title: 'Visa Sponsorship', sub: 'Employer-provided visa', href: '/jobs/visa-provided' },
  { icon: Laptop, title: 'Remote Jobs', sub: 'Work from anywhere', href: '/jobs/remote' },
  { icon: Sparkles, title: 'Fresher Jobs', sub: 'Start your career in UAE', href: '/jobs/fresher-jobs-uae' },
  { icon: Wand2, title: 'AI Recommended', sub: 'Matched to your profile', href: '/jobs' },
  { icon: MessageCircle, title: 'WhatsApp Groups', sub: '76 active groups', href: '/whatsapp-groups' },
];

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.title} href={c.href} className="group rounded-xl border border-[#E5EEF0] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2E8E97]/10 text-[#2E8E97]"><Icon className="h-5 w-5" /></span>
              <p className="mt-3 font-display text-sm font-bold text-[#0F172A]">{c.title}</p>
              <p className="text-xs text-[#64748B]">{c.sub}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
