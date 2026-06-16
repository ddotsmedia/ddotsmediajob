'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, FlaskConical, MessageCircle } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/switch';

const toLines = (a: string[]) => a.join('\n');
const fromLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const toCsv = (a: string[]) => a.join(', ');
const fromCsv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

type Form = {
  minTextLength: number;
  requireSalary: boolean; requireContact: boolean; requireLocation: boolean;
  allowedGroups: string; blockedNumbers: string; blockedKeywords: string; customKeywords: string;
  blockOwnMessages: boolean; autoPublish: boolean;
  replyOnSuccess: boolean; replyOnSkip: boolean;
  successMessage: string; skipMessage: string;
};

export default function WhapiSettingsPage() {
  const utils = trpc.useUtils();
  const q = trpc.admin.whapiSettings.useQuery();
  const [f, setF] = useState<Form | null>(null);
  const [testText, setTestText] = useState('');

  useEffect(() => {
    if (!q.data) return;
    setF({
      minTextLength: q.data.minTextLength,
      requireSalary: q.data.requireSalary, requireContact: q.data.requireContact, requireLocation: q.data.requireLocation,
      allowedGroups: toLines(q.data.allowedGroups), blockedNumbers: toCsv(q.data.blockedNumbers),
      blockedKeywords: toCsv(q.data.blockedKeywords), customKeywords: toCsv(q.data.customKeywords),
      blockOwnMessages: q.data.blockOwnMessages, autoPublish: q.data.autoPublish,
      replyOnSuccess: q.data.replyOnSuccess, replyOnSkip: q.data.replyOnSkip,
      successMessage: q.data.successMessage ?? '', skipMessage: q.data.skipMessage ?? '',
    });
    // Set once when data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = trpc.admin.saveWhapiSettings.useMutation({
    onSuccess: () => { utils.admin.whapiSettings.invalidate(); toast.success('Settings saved'); },
    onError: (e) => toast.error(e.message || 'Save failed'),
  });
  const test = trpc.admin.testWhapiCriteria.useMutation();

  // Skeleton until settings load — never render a half-initialised form.
  if (q.isLoading || !f) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-navy-100" />
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-xl bg-navy-100/70" />)}
      </div>
    );
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => (s ? { ...s, [k]: v } : s));

  function onSave() {
    if (!f) return;
    save.mutate({
      minTextLength: Number(f.minTextLength) || 30,
      requireSalary: f.requireSalary, requireContact: f.requireContact, requireLocation: f.requireLocation,
      allowedGroups: fromLines(f.allowedGroups), blockedNumbers: fromCsv(f.blockedNumbers),
      blockedKeywords: fromCsv(f.blockedKeywords), customKeywords: fromCsv(f.customKeywords),
      blockOwnMessages: f.blockOwnMessages, autoPublish: f.autoPublish,
      replyOnSuccess: f.replyOnSuccess, replyOnSkip: f.replyOnSkip,
      successMessage: f.successMessage.trim() || null, skipMessage: f.skipMessage.trim() || null,
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#25D366]" /><h1 className="font-display text-2xl font-bold text-navy-900">WhatsApp Import Settings</h1></div>
      <p className="text-sm text-navy-700/60">Control which incoming Whapi messages become job drafts.</p>

      {/* Section 1 — Detection */}
      <Card title="Detection criteria">
        <Field label="Minimum text length">
          <Input type="number" value={f.minTextLength} onChange={(e) => set('minTextLength', Number(e.target.value))} className="w-32" />
        </Field>
        <Field label="Custom job keywords (comma-separated)">
          <Input value={f.customKeywords} onChange={(e) => set('customKeywords', e.target.value)} placeholder="e.g. hiring now, walk in, مطلوب" />
        </Field>
        <Field label="Blocked keywords (comma-separated)">
          <Input value={f.blockedKeywords} onChange={(e) => set('blockedKeywords', e.target.value)} placeholder="e.g. mlm, investment, crypto" />
        </Field>
      </Card>

      {/* Section 2 — Required fields */}
      <Card title="Required fields">
        <SwitchRow label="Require salary to be mentioned" checked={f.requireSalary} onChange={(v) => set('requireSalary', v)} />
        <SwitchRow label="Require a contact number/email" checked={f.requireContact} onChange={(v) => set('requireContact', v)} />
        <SwitchRow label="Require a location/emirate" checked={f.requireLocation} onChange={(v) => set('requireLocation', v)} />
        <p className="text-xs text-navy-700/50">Messages missing a required field are skipped with a reason.</p>
      </Card>

      {/* Section 3 — Number filtering */}
      <Card title="Number & group filtering">
        <Field label="Allowed group chat IDs (one per line — empty = all groups)">
          <Textarea className="min-h-[80px]" value={f.allowedGroups} onChange={(e) => set('allowedGroups', e.target.value)} placeholder="123456789@g.us" />
        </Field>
        <Field label="Blocked numbers (comma-separated)">
          <Input value={f.blockedNumbers} onChange={(e) => set('blockedNumbers', e.target.value)} placeholder="971501234567, 971559876543" />
        </Field>
        <SwitchRow label="Block own messages (skip from_me)" checked={f.blockOwnMessages} onChange={(v) => set('blockOwnMessages', v)} />
      </Card>

      {/* Section 4 — Auto actions */}
      <Card title="Auto actions">
        <SwitchRow label="Auto-publish valid jobs (skip draft review)" hint="⚠ Jobs will be published live without review." checked={f.autoPublish} onChange={(v) => set('autoPublish', v)} />
        <SwitchRow label="Reply on success" checked={f.replyOnSuccess} onChange={(v) => set('replyOnSuccess', v)} />
        <Field label="Success message ([title] and [link] are replaced)">
          <Input value={f.successMessage} onChange={(e) => set('successMessage', e.target.value)} placeholder="✅ Job draft created! Review: [link]" />
        </Field>
        <SwitchRow label="Reply on skip" checked={f.replyOnSkip} onChange={(v) => set('replyOnSkip', v)} />
        <Field label="Skip message ([reason] is replaced)">
          <Input value={f.skipMessage} onChange={(e) => set('skipMessage', e.target.value)} placeholder="Not added: [reason]" />
        </Field>
      </Card>

      <Button onClick={onSave} disabled={save.isPending} className="mt-4">
        {save.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save settings</>}
      </Button>

      {/* Section 5 — Test */}
      <Card title="Test a message">
        <Textarea className="min-h-[100px]" value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Paste a sample WhatsApp message…" />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => test.mutate({ text: testText })} disabled={test.isPending || !testText.trim()}>
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Test criteria
          </Button>
          <span className="text-xs text-navy-700/50">Tests against saved settings — save first.</span>
        </div>
        {test.data && (
          <div className={`rounded-lg border p-3 text-sm ${test.data.ok ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
            {test.data.ok
              ? `✅ Would be accepted → ${test.data.action === 'publish' ? 'published live' : 'saved as draft'}`
              : `❌ Would be rejected → ${test.data.label}${test.data.detail ? ` (${test.data.detail})` : ''}`}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Top-level helpers (stable identity — never recreated on render) ──
function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-navy-700">
        {label}
        {hint && <span className="block text-xs text-navy-700/50">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-display text-sm font-bold text-navy-900">{title}</h2>
      {children}
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
