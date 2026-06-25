import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function WhatsAppSection() {
  return (
    <section className="bg-gradient-to-br from-[#2E8E97] to-[#083B3A]">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center text-white">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><MessageCircle className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">Join 76 WhatsApp Job Groups</h2>
        <p className="mt-2 text-white/80">Get fresh UAE jobs delivered to your phone daily.</p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="tel"
            placeholder="+971 5X XXX XXXX"
            className="h-12 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/50"
          />
          <Link href="/whatsapp-groups" className="flex h-12 items-center justify-center rounded-xl bg-[#25D366] px-6 text-sm font-bold text-white hover:bg-[#1da851]">
            Join Now
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/60">80,000+ professionals already joined</p>
      </div>
    </section>
  );
}
