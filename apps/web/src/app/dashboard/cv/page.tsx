'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, Wand2, Check, AlertTriangle, Download, Sparkles, Save } from 'lucide-react';
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

const TEMPLATES = [
  { key: 'classic', label: 'Classic' },
  { key: 'modern', label: 'Modern' },
  { key: 'minimal', label: 'Minimal' },
] as const;
type TemplateKey = (typeof TEMPLATES)[number]['key'];

function Builder() {
  const [f, setF] = useState({ name: '', title: '', summary: '', experience: '', education: '', skills: '' });
  const [tpl, setTpl] = useState<TemplateKey>('classic');
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const skills = f.skills.split(',').map((s) => s.trim()).filter(Boolean);
  const cvText = `${f.name}\n${f.title}\n\nSUMMARY\n${f.summary}\n\nEXPERIENCE\n${f.experience}\n\nEDUCATION\n${f.education}\n\nSKILLS\n${f.skills}`;

  const me = trpc.jobseekers.me.useQuery();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || !me.data) return;
    const d = me.data.resumeData as (Partial<typeof f> & { template?: TemplateKey }) | null;
    if (d && typeof d === 'object') {
      const { template, ...rest } = d;
      setF((s) => ({ ...s, ...rest }));
      if (template) setTpl(template);
    }
    setLoaded(true);
  }, [me.data, loaded]);

  const save = trpc.jobseekers.saveCv.useMutation({ onSuccess: () => toast.success('CV saved'), onError: (e) => toast.error(e.message) });
  const enhance = trpc.ai.cvEnhance.useMutation({ onError: (e) => toast.error(e.message) });
  function runEnhance(kind: 'summary' | 'bullets' | 'skills') {
    const content = kind === 'skills' || kind === 'summary' ? `${f.experience}\n${f.education}` : f.experience;
    if (content.trim().length < 5) return toast.error('Add some experience first');
    enhance.mutate({ kind, content }, { onSuccess: (r) => set(kind === 'bullets' ? 'experience' : kind, r.text) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-1.5">
          <Label>Template</Label>
          <div className="flex gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTpl(t.key)}
                className={cn('flex-1 rounded-lg border py-2 text-sm font-medium', tpl === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Row label="Full name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Row>
        <Row label="Professional title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Accountant" /></Row>
        <Row label="Summary">
          <Textarea value={f.summary} onChange={(e) => set('summary', e.target.value)} />
          <AiBtn onClick={() => runEnhance('summary')} pending={enhance.isPending} label="Generate summary" />
        </Row>
        <Row label="Experience">
          <Textarea value={f.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Company — Role (dates)&#10;• achievement" className="min-h-[120px]" />
          <AiBtn onClick={() => runEnhance('bullets')} pending={enhance.isPending} label="Improve bullets" />
        </Row>
        <Row label="Education"><Textarea value={f.education} onChange={(e) => set('education', e.target.value)} /></Row>
        <Row label="Skills (comma-separated)">
          <Input value={f.skills} onChange={(e) => set('skills', e.target.value)} />
          <AiBtn onClick={() => runEnhance('skills')} pending={enhance.isPending} label="Suggest skills" />
        </Row>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate({ data: { ...f, template: tpl } })} disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>
          <Button variant="outline" className="flex-1" onClick={() => window.print()}><Download /> PDF</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(cvText); toast.success('CV text copied'); }}>Copy</Button>
        </div>
        <p className="text-xs text-navy-700/50">PDF export opens the print dialog — choose “Save as PDF”.</p>
      </div>

      <div id="cv-print" className="rounded-xl border bg-white p-8 shadow-sm">
        <CvTemplate tpl={tpl} f={f} skills={skills} />
      </div>
    </div>
  );
}

function AiBtn({ onClick, pending, label }: { onClick: () => void; pending: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline disabled:opacity-50">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {label}
    </button>
  );
}

function CvTemplate({ tpl, f, skills }: { tpl: TemplateKey; f: { name: string; title: string; summary: string; experience: string; education: string }; skills: string[] }) {
  const sections: [string, string][] = [
    ['Summary', f.summary],
    ['Experience', f.experience],
    ['Education', f.education],
  ];

  if (tpl === 'modern') {
    return (
      <div>
        <div className="-m-8 mb-6 bg-navy-900 p-8 text-white">
          <h2 className="font-display text-3xl font-extrabold">{f.name || 'Your Name'}</h2>
          <p className="text-teal-400">{f.title || 'Professional Title'}</p>
        </div>
        {sections.map(([h, v]) => (
          <section key={h} className="mt-4">
            <h3 className="font-display text-sm font-bold text-teal-600">{h.toUpperCase()}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800">{v || '—'}</p>
          </section>
        ))}
        {skills.length > 0 && (
          <section className="mt-4">
            <h3 className="font-display text-sm font-bold text-teal-600">SKILLS</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </section>
        )}
      </div>
    );
  }

  if (tpl === 'minimal') {
    return (
      <div className="font-sans">
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">{f.name || 'Your Name'}</h2>
        <p className="text-navy-700/60">{f.title || 'Professional Title'}</p>
        <hr className="my-4 border-navy-200" />
        {sections.map(([h, v]) => (
          <section key={h} className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-navy-700/50">{h}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800">{v || '—'}</p>
          </section>
        ))}
        {skills.length > 0 && <p className="mt-3 text-sm text-navy-700"><span className="text-xs font-semibold uppercase tracking-widest text-navy-700/50">Skills</span><br />{skills.join(' · ')}</p>}
      </div>
    );
  }

  // classic
  return (
    <div>
      <div className="border-b-2 border-teal-500 pb-4 text-center">
        <h2 className="font-display text-2xl font-bold text-navy-900">{f.name || 'Your Name'}</h2>
        <p className="text-teal-600">{f.title || 'Professional Title'}</p>
      </div>
      {sections.map(([h, v]) => (
        <section key={h} className="mt-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700/60">{h}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800">{v || '—'}</p>
        </section>
      ))}
      {skills.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700/60">Skills</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>
        </section>
      )}
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
