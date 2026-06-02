'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FREE = ['Browse & apply to all jobs', 'Job alerts', 'Saved jobs', 'Basic profile', 'AI match score (3/day)'];
const PREMIUM = [
  'Everything in Free',
  'Featured CV — appear first to employers',
  'Unlimited AI match scores & CV analysis',
  'Direct messaging with employers',
  'Priority application badge',
  'AI career advisor, interview prep & salary coach',
];

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const billing = trpc.billing.status.useQuery(undefined, { enabled: status === 'authenticated' });
  const upgrade = trpc.billing.upgrade.useMutation({
    onSuccess: () => {
      billing.refetch();
      toast.success('Welcome to Premium! 🎉');
    },
    onError: (e) => toast.error(e.message),
  });

  function go() {
    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/pricing');
      return;
    }
    upgrade.mutate({ months: 1 });
  }

  const active = billing.data?.active;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold text-navy-900">Simple, fair pricing</h1>
        <p className="mt-2 text-navy-700/60">Upgrade to stand out and unlock the full AI toolkit.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Plan name="Free" price="AED 0" period="forever" features={FREE} cta={<Button variant="outline" className="w-full" disabled>Current plan</Button>} />
        <Plan
          name="Premium"
          price="AED 49"
          period="/month"
          highlight
          features={PREMIUM}
          cta={
            active ? (
              <Button variant="outline" className="w-full" disabled><Check /> Active</Button>
            ) : (
              <Button variant="accent" className="w-full" onClick={go} disabled={upgrade.isPending}>
                {upgrade.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Go Premium
              </Button>
            )
          }
        />
      </div>
      <p className="mt-6 text-center text-xs text-navy-700/50">Payments via Tap/Telr/Stripe wire into <code>billing.upgrade</code>. Cancel anytime.</p>
    </div>
  );
}

function Plan({
  name,
  price,
  period,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl border bg-white p-8', highlight && 'border-teal-300 ring-2 ring-teal-100')}>
      <h2 className="font-display text-xl font-bold text-navy-900">{name}</h2>
      <p className="mt-2"><span className="font-display text-4xl font-extrabold text-navy-900">{price}</span> <span className="text-navy-700/50">{period}</span></p>
      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-navy-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
