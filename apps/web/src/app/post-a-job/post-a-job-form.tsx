'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, Megaphone } from 'lucide-react';
import { CATEGORIES, EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';

const RELATIONS = [
  { value: 'work_there', label: 'I work there' },
  { value: 'friend_referred', label: 'A friend referred it' },
  { value: 'other', label: 'Other' },
] as const;

const inputCls =
  'w-full min-h-[44px] rounded-md border border-navy-200 px-3 py-2 text-base placeholder:text-navy-700/40 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500';

function parseSalary(raw: string): { min: number | null; max: number | null } {
  const nums = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?k?/gi)?.map((n) => Math.round(parseFloat(n) * (/k$/i.test(n) ? 1000 : 1)));
  if (!nums?.length) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0]!, max: nums[0]! };
  return { min: Math.min(nums[0]!, nums[1]!), max: Math.max(nums[0]!, nums[1]!) };
}

const BLANK = { title: '', category: '', emirate: '', salary: '', description: '', whatsapp: '', email: '', relation: '', anonymous: false };

export function PostAJobForm() {
  const router = useRouter();
  const [f, setF] = useState({ ...BLANK });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const remaining = trpc.jobs.myCommunity.useQuery(undefined, { retry: false });
  const used = remaining.data?.filter((p) => {
    const d = new Date(p.createdAt as unknown as string);
    return Date.now() - d.getTime() < 30 * 86_400_000;
  }).length;

  const create = trpc.jobs.createCommunity.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => {
      if (e.data?.code === 'UNAUTHORIZED') {
        router.push('/login?callbackUrl=/post-a-job');
        return;
      }
      setErrors((prev) => ({ ...prev, form: e.message }));
    },
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 3) e.title = 'Job title is required (min 3 characters).';
    if (!f.category) e.category = 'Please choose a category.';
    if (!f.emirate) e.emirate = 'Please choose an emirate.';
    if (f.description.trim().length < 50) e.description = 'Please enter at least 50 characters.';
    if (!f.whatsapp.trim() && !f.email.trim()) e.whatsapp = 'Add a WhatsApp number or an email so applicants can reach out.';
    if (!f.relation) e.relation = 'Let us know how you know about this job.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const { min, max } = parseSalary(f.salary);
    create.mutate({
      title: f.title.trim(),
      categorySlug: f.category as never,
      emirateSlug: f.emirate as never,
      description: f.description.trim(),
      salaryMin: min,
      salaryMax: max,
      contactWhatsapp: f.whatsapp.trim() || undefined,
      contactEmail: f.email.trim() || undefined,
      relation: f.relation as never,
      isAnonymous: f.anonymous,
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h2 className="mt-4 font-display text-xl font-bold text-navy-900">Your job post has been submitted for review!</h2>
        <p className="mt-2 text-navy-700/70">We&apos;ll notify you when it goes live — usually within 24 hours.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => { setF({ ...BLANK }); setErrors({}); setDone(false); }} className="rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700">Post another job</button>
          <Link href="/jobs" className="rounded-lg border border-teal-300 px-5 py-2.5 font-semibold text-teal-700 hover:bg-teal-50">Back to jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-5 sm:p-6">
      <Field label="Job Title" required error={errors.title}>
        <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sales Executive" maxLength={160} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" required error={errors.category}>
          <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
            <option value="" disabled>Select Category…</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Emirate" required error={errors.emirate}>
          <select className={inputCls} value={f.emirate} onChange={(e) => set('emirate', e.target.value)}>
            <option value="" disabled>Select Emirate…</option>
            {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Salary" hint="optional">
        <input className={inputCls} value={f.salary} onChange={(e) => set('salary', e.target.value)} placeholder="e.g. AED 4,000 – 6,000/month" inputMode="numeric" />
      </Field>

      <Field label="Short Description" required error={errors.description}
        counter={<span className={f.description.trim().length < 50 ? 'text-red-500' : 'text-navy-700/50'}>{f.description.length}/500 characters</span>}>
        <textarea
          className={`${inputCls} min-h-[120px] resize-y`}
          value={f.description}
          onChange={(e) => set('description', e.target.value.slice(0, 500))}
          placeholder="Describe the job role, responsibilities and what you're looking for…"
          rows={4}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact WhatsApp" required error={errors.whatsapp}>
          <input className={inputCls} type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+971 50 123 4567" maxLength={30} />
        </Field>
        <Field label="Contact Email" hint="optional">
          <input className={inputCls} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="hr@company.com" />
        </Field>
      </div>

      <Field label="Your relation to this job" required error={errors.relation}>
        <select className={inputCls} value={f.relation} onChange={(e) => set('relation', e.target.value)}>
          <option value="" disabled>How do you know about this job?</option>
          {RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" checked={f.anonymous} onChange={(e) => set('anonymous', e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
        Post anonymously
      </label>
      {f.anonymous && <p className="-mt-2 text-xs text-navy-700/60">Your name will be hidden from the listing.</p>}

      <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
        {typeof used === 'number' ? `You have ${Math.max(2 - used, 0)} of 2 free posts remaining this month.` : 'Free — 2 posts per month.'}
      </p>

      {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

      <button type="submit" disabled={create.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />} Submit for Review
      </button>
      <p className="text-center text-xs text-navy-700/60">✓ Free to post &nbsp; ✓ Reviewed within 24 hours &nbsp; ✓ Reaches 15,000+ jobseekers</p>
    </form>
  );
}

function Field({ label, required, hint, error, counter, children }: {
  label: string; required?: boolean; hint?: string; error?: string; counter?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-navy-700">
          {label}
          {required ? <span className="ml-0.5 text-red-500">*</span> : hint ? <span className="ml-1 text-xs font-normal text-navy-700/50">({hint})</span> : null}
        </label>
        {counter && <span className="text-xs">{counter}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
