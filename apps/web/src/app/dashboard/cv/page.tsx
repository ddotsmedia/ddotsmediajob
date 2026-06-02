'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, Wand2, Check, AlertTriangle } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export default function CvPage() {
  const [mode, setMode] = useState<'build' | 'analyze'>('build');
  return (
    <div>
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">CV Builder & ATS Analyzer</h1>
      </div>
      <p className="text-navy-700/60">Build a clean CV, then score it against applicant tracking systems.</p>

      <div className="mt-6 flex gap-2">
        {(['build', 'analyze'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium capitalize',
              mode === m ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50',
            )}
          >
            {m === 'build' ? 'Build CV' : 'ATS Analyzer'}
          </button>
        ))}
      </div>

      <div className="mt-6">{mode === 'build' ? <Builder /> : <Analyzer />}</div>
    </div>
  );
}

function Builder() {
  const [f, setF] = useState({ name: '', title: '', summary: '', experience: '', education: '', skills: '' });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const cvText = `${f.name}\n${f.title}\n\nSUMMARY\n${f.summary}\n\nEXPERIENCE\n${f.experience}\n\nEDUCATION\n${f.education}\n\nSKILLS\n${f.skills}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <Row label="Full name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Row>
        <Row label="Professional title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Accountant" /></Row>
        <Row label="Summary"><Textarea value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Row>
        <Row label="Experience"><Textarea value={f.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Company — Role (dates)&#10;• achievement" className="min-h-[120px]" /></Row>
        <Row label="Education"><Textarea value={f.education} onChange={(e) => set('education', e.target.value)} /></Row>
        <Row label="Skills (comma-separated)"><Input value={f.skills} onChange={(e) => set('skills', e.target.value)} /></Row>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="border-b pb-4">
          <h2 className="font-display text-2xl font-bold text-navy-900">{f.name || 'Your Name'}</h2>
          <p className="text-teal-600">{f.title || 'Professional Title'}</p>
        </div>
        {[
          ['Summary', f.summary],
          ['Experience', f.experience],
          ['Education', f.education],
        ].map(([h, v]) => (
          <section key={h} className="mt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700/60">{h}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800">{v || '—'}</p>
          </section>
        ))}
        {f.skills && (
          <section className="mt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700/60">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                <Badge key={s} variant="muted">{s}</Badge>
              ))}
            </div>
          </section>
        )}
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={() => {
            navigator.clipboard.writeText(cvText);
            toast.success('CV text copied — paste into the ATS Analyzer');
          }}
        >
          Copy CV text
        </Button>
      </div>
    </div>
  );
}

function Analyzer() {
  const [text, setText] = useState('');
  const [role, setRole] = useState('');
  const analyze = trpc.ai.analyzeCv.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-white p-6">
        <Row label="Target role (optional)"><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Civil Engineer" /></Row>
        <Row label="Paste your CV text">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[280px]" placeholder="Paste the full text of your CV…" />
        </Row>
        <Button
          onClick={() => analyze.mutate({ resumeText: text, targetRole: role || undefined })}
          disabled={analyze.isPending || text.trim().length < 50}
        >
          {analyze.isPending ? <Loader2 className="animate-spin" /> : <Wand2 />} Analyze CV
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-6">
        {!analyze.data ? (
          <p className="text-sm text-navy-700/50">Your ATS report will appear here.</p>
        ) : (
          <div>
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-extrabold text-navy-900">{analyze.data.atsScore}</span>
              <span className="pb-1 text-sm text-navy-700/50">/100 ATS score</span>
            </div>
            <p className="mt-2 text-sm text-navy-700/80">{analyze.data.summary}</p>

            <Section title="Improvements" items={analyze.data.improvements} icon="warn" />
            <Section title="Formatting issues" items={analyze.data.formattingIssues} icon="warn" />
            <div className="mt-4">
              <h4 className="text-sm font-bold text-navy-900">Detected keywords</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {analyze.data.keywords.map((k) => <Badge key={k} variant="success">{k}</Badge>)}
              </div>
            </div>
            {analyze.data.missingKeywords.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-bold text-navy-900">Missing keywords</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analyze.data.missingKeywords.map((k) => <Badge key={k} variant="urgent">{k}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, icon }: { title: string; items: string[]; icon: 'warn' }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-navy-900">{title}</h4>
      <ul className="mt-1 space-y-1">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-navy-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
