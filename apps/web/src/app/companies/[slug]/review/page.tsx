'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'cultureRating', label: 'Culture' },
  { key: 'salaryRating', label: 'Salary & Benefits' },
  { key: 'managementRating', label: 'Management' },
  { key: 'worklifeRating', label: 'Work-Life' },
] as const;

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <Star className={cn('h-6 w-6', n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-navy-200')} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const company = trpc.content.companyBySlug.useQuery({ slug });
  const create = trpc.reviews.create.useMutation({
    onSuccess: () => { toast.success('Review submitted for moderation'); router.push(`/companies/${slug}`); },
    onError: (e) => toast.error(e.message),
  });
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ title: '', pros: '', cons: '', advice: '', jobTitle: '' });
  const [recommend, setRecommend] = useState<boolean | null>(null);

  if (company.isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (!company.data) return <div className="p-10 text-center text-navy-700/70">Company not found.</div>;

  function submit() {
    if (rating < 1) return toast.error('Give an overall rating');
    if (form.pros.trim().length < 30 || form.cons.trim().length < 30) return toast.error('Pros and cons need at least 30 characters');
    create.mutate({ companyId: company.data!.company.id, rating, ...cats, ...form, wouldRecommend: recommend ?? undefined } as never);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-900">Review {company.data.company.name}</h1>
      <p className="mt-1 text-navy-700/60">Anonymous by default. Help others make informed decisions.</p>

      <div className="mt-6 space-y-5 rounded-xl border bg-white p-5">
        <div><Label>Overall rating</Label><div className="mt-1.5"><Stars value={rating} onChange={setRating} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div key={c.key}><Label>{c.label}</Label><div className="mt-1.5"><Stars value={cats[c.key] ?? 0} onChange={(n) => setCats((p) => ({ ...p, [c.key]: n }))} /></div></div>
          ))}
        </div>
        <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sum up your experience" /></div>
        <div className="space-y-1.5"><Label>Pros (min 30 chars)</Label><Textarea value={form.pros} onChange={(e) => setForm({ ...form, pros: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Cons (min 30 chars)</Label><Textarea value={form.cons} onChange={(e) => setForm({ ...form, cons: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Advice to management (optional)</Label><Textarea value={form.advice} onChange={(e) => setForm({ ...form, advice: e.target.value })} /></div>
        <div>
          <Label>Would you recommend?</Label>
          <div className="mt-1.5 flex gap-2">
            <Button type="button" variant={recommend === true ? 'accent' : 'outline'} size="sm" onClick={() => setRecommend(true)}>Yes</Button>
            <Button type="button" variant={recommend === false ? 'accent' : 'outline'} size="sm" onClick={() => setRecommend(false)}>No</Button>
          </div>
        </div>
        <Button onClick={submit} disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit review'}</Button>
      </div>
    </div>
  );
}
