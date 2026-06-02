'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Star, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          onClick={() => onChange?.(n)}
          className={cn('h-5 w-5', onChange && 'cursor-pointer', n <= value ? 'fill-gold-500 text-gold-500' : 'text-navy-200')}
        />
      ))}
    </div>
  );
}

export function CompanyReviews({ companyId }: { companyId: string }) {
  const { status } = useSession();
  const utils = trpc.useUtils();
  const reviews = trpc.reviews.forCompany.useQuery({ companyId });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);

  const create = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.reviews.forCompany.invalidate({ companyId });
      setOpen(false);
      toast.success('Review submitted — it will appear after moderation.');
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      companyId,
      rating,
      title: String(f.get('title')) || undefined,
      pros: String(f.get('pros')) || undefined,
      cons: String(f.get('cons')) || undefined,
      jobTitle: String(f.get('jobTitle')) || undefined,
    });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-navy-900">Employee Reviews</h2>
        {status === 'authenticated' && <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>Write a review</Button>}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Rating</Label><Stars value={rating} onChange={setRating} /></div>
          <div className="space-y-1.5"><Label>Title</Label><Input name="title" placeholder="Great place to grow" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Pros</Label><Textarea name="pros" /></div>
            <div className="space-y-1.5"><Label>Cons</Label><Textarea name="cons" /></div>
          </div>
          <div className="space-y-1.5"><Label>Your role (optional)</Label><Input name="jobTitle" /></div>
          <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />} Submit review</Button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {reviews.data?.length === 0 && <p className="rounded-xl border bg-white p-6 text-sm text-navy-700/60">No reviews yet.</p>}
        {reviews.data?.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              {r.jobTitle && <span className="text-xs text-navy-700/50">{r.jobTitle}</span>}
            </div>
            {r.title && <h3 className="mt-2 font-semibold text-navy-900">{r.title}</h3>}
            {r.pros && <p className="mt-1 text-sm text-navy-700"><span className="font-semibold text-lime-600">Pros:</span> {r.pros}</p>}
            {r.cons && <p className="mt-1 text-sm text-navy-700"><span className="font-semibold text-accent-600">Cons:</span> {r.cons}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
