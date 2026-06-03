'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CATEGORIES, EMIRATES, EXPERIENCE_LEVELS, VISA_STATUS } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { AvatarUpload } from '@/components/avatar-upload';

export default function ProfilePage() {
  const profile = trpc.jobseekers.me.useQuery();
  const upsert = trpc.jobseekers.upsertProfile.useMutation({
    onSuccess: () => toast.success('Profile saved'),
    onError: (e) => toast.error(e.message),
  });
  const [skills, setSkills] = useState('');

  useEffect(() => {
    if (profile.data?.skills) setSkills(profile.data.skills.join(', '));
  }, [profile.data]);

  if (profile.isLoading) return <Loader2 className="animate-spin text-teal-500" />;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    upsert.mutate({
      headline: String(f.get('headline')) || undefined,
      bio: String(f.get('bio')) || undefined,
      phone: String(f.get('phone')) || undefined,
      emirateSlug: (String(f.get('emirate')) || undefined) as never,
      categorySlug: (String(f.get('category')) || undefined) as never,
      experienceLevel: (String(f.get('experience')) || undefined) as never,
      visaStatus: (String(f.get('visa')) || undefined) as never,
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      openToWork: f.get('openToWork') === 'on',
    });
  }

  const p = profile.data;
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">My Profile</h1>
      <p className="text-navy-700/60">Complete your profile to stand out to employers.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl border bg-white p-6">
        <AvatarUpload />
        <Field label="Headline">
          <Input name="headline" defaultValue={p?.headline ?? ''} placeholder="e.g. Senior Accountant · 6 years" />
        </Field>
        <Field label="Bio">
          <Textarea name="bio" defaultValue={p?.bio ?? ''} placeholder="Tell employers about yourself…" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone">
            <Input name="phone" defaultValue={p?.phone ?? ''} placeholder="+971 5x xxx xxxx" />
          </Field>
          <Field label="Emirate">
            <Select name="emirate" defaultValue={p?.emirateSlug ?? ''}>
              <option value="">Select</option>
              {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Field / Category">
            <Select name="category" defaultValue={p?.categorySlug ?? ''}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Experience">
            <Select name="experience" defaultValue={p?.experienceLevel ?? ''}>
              <option value="">Select</option>
              {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Visa status">
            <Select name="visa" defaultValue={p?.visaStatus ?? ''}>
              <option value="">Select</option>
              {VISA_STATUS.map((v) => <option key={v} value={v} className="capitalize">{v.replace(/-/g, ' ')}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Skills (comma-separated)">
          <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Excel, IFRS, SAP" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" name="openToWork" defaultChecked={p?.openToWork ?? true} className="h-4 w-4 rounded text-teal-600" />
          Open to work (visible to employers)
        </label>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
