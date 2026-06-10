'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, ListChecks, ScanText, FlaskConical, MailX, Send, Building2, ShieldAlert, Users, Landmark } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'qbank', label: 'Interview Q Bank', icon: ListChecks },
  { key: 'bias', label: 'Bias Detector', icon: ScanText },
  { key: 'abtest', label: 'A/B Test JD', icon: FlaskConical },
  { key: 'reject', label: 'Rejection Message', icon: MailX },
  { key: 'outreach', label: 'Candidate Outreach', icon: Send },
  { key: 'culture', label: 'Culture Analyser', icon: Building2 },
  { key: 'retention', label: 'Retention Risk', icon: ShieldAlert },
  { key: 'pipeline', label: 'Pipeline Summary', icon: Users },
  { key: 'emiratization', label: 'Emiratization', icon: Landmark },
] as const;

export default function EmployerAiToolsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('qbank');
  return (
    <div>
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">AI Hiring Tools</h1></div>
      <p className="text-navy-700/60">Claude-powered tools for UAE employers.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium', tab === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'qbank' && <QBank />}
        {tab === 'bias' && <Bias />}
        {tab === 'abtest' && <ABTest />}
        {tab === 'reject' && <Reject />}
        {tab === 'outreach' && <Outreach />}
        {tab === 'culture' && <Culture />}
        {tab === 'retention' && <Retention />}
        {tab === 'pipeline' && <Pipeline />}
        {tab === 'emiratization' && <Emiratization />}
      </div>
    </div>
  );
}

function Result({ content }: { content: string }) {
  return <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{content}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-xl border bg-white p-5">{children}</div>;
}
function Area({ value, onChange, placeholder, rows = 5 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea className="w-full rounded-lg border p-3" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function QBank() {
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const m = trpc.ai.interviewQuestionBank.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Role title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Accountant" /></div>
        <div className="space-y-1.5"><Label>Requirements (optional)</Label><Area value={requirements} onChange={setRequirements} placeholder="Key skills and must-haves" /></div>
        <Button onClick={() => m.mutate({ title, requirements: requirements || undefined })} disabled={m.isPending || title.trim().length < 2}>{m.isPending ? <Loader2 className="animate-spin" /> : <ListChecks />} Generate 20 questions</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Bias() {
  const [description, setDescription] = useState('');
  const m = trpc.ai.biasDetector.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Job description</Label><Area value={description} onChange={setDescription} rows={8} placeholder="Paste the job description" /></div>
        <Button onClick={() => m.mutate({ description })} disabled={m.isPending || description.trim().length < 20}>{m.isPending ? <Loader2 className="animate-spin" /> : <ScanText />} Check for bias</Button>
      </Card>
      {m.data && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border bg-white p-4"><span className="text-sm text-navy-700/60">Bias score (lower is better)</span><div className="font-display text-2xl font-bold" style={{ color: m.data.score > 50 ? '#dc2626' : m.data.score > 20 ? '#ea7a3c' : '#16a34a' }}>{m.data.score}/100</div></div>
          {m.data.flags.length > 0 && <div className="rounded-xl border bg-white p-4"><p className="font-semibold text-navy-900">Flags</p><ul className="mt-2 list-disc pl-5 text-sm text-navy-700/80">{m.data.flags.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
          <div><p className="mb-1 text-sm font-semibold text-navy-900">Inclusive rewrite</p><Result content={m.data.rewritten} /></div>
        </div>
      )}
    </div>
  );
}

function ABTest() {
  const [description, setDescription] = useState('');
  const m = trpc.ai.abTestJobDescription.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Job description</Label><Area value={description} onChange={setDescription} rows={8} placeholder="Paste the job description to generate 2 variants" /></div>
        <Button onClick={() => m.mutate({ description })} disabled={m.isPending || description.trim().length < 20}>{m.isPending ? <Loader2 className="animate-spin" /> : <FlaskConical />} Generate variants</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Reject() {
  const [jobTitle, setJobTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [reason, setReason] = useState('');
  const m = trpc.ai.rejectionMessage.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Role</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Sales Executive" /></div>
          <div className="space-y-1.5"><Label>Candidate name (optional)</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Internal reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. needs more UAE experience" /></div>
        <Button onClick={() => m.mutate({ jobTitle, candidateName: candidateName || undefined, reason: reason || undefined })} disabled={m.isPending || jobTitle.trim().length < 2}>{m.isPending ? <Loader2 className="animate-spin" /> : <MailX />} Draft message</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Outreach() {
  const [jobTitle, setJobTitle] = useState('');
  const [candidateSummary, setCandidateSummary] = useState('');
  const m = trpc.ai.candidateOutreach.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Hiring for</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Marketing Manager" /></div>
        <div className="space-y-1.5"><Label>Candidate summary</Label><Area value={candidateSummary} onChange={setCandidateSummary} placeholder="Key experience, skills, current role" /></div>
        <Button onClick={() => m.mutate({ jobTitle, candidateSummary })} disabled={m.isPending || jobTitle.trim().length < 2 || candidateSummary.trim().length < 5}>{m.isPending ? <Loader2 className="animate-spin" /> : <Send />} Write outreach</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Culture() {
  const [jobAdsText, setJobAdsText] = useState('');
  const [reviewsText, setReviewsText] = useState('');
  const m = trpc.ai.companyCultureAnalyser.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Your job ads</Label><Area value={jobAdsText} onChange={setJobAdsText} placeholder="Paste a few of your job ads" /></div>
        <div className="space-y-1.5"><Label>Reviews (optional)</Label><Area value={reviewsText} onChange={setReviewsText} placeholder="Paste employee reviews" /></div>
        <Button onClick={() => m.mutate({ jobAdsText, reviewsText: reviewsText || undefined })} disabled={m.isPending || jobAdsText.trim().length < 20}>{m.isPending ? <Loader2 className="animate-spin" /> : <Building2 />} Analyse culture</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Retention() {
  const [role, setRole] = useState('');
  const [candidateSummary, setCandidateSummary] = useState('');
  const m = trpc.ai.retentionRiskPredictor.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" /></div>
        <div className="space-y-1.5"><Label>Candidate summary</Label><Area value={candidateSummary} onChange={setCandidateSummary} placeholder="Experience, salary expectation, location, visa" /></div>
        <Button onClick={() => m.mutate({ role, candidateSummary })} disabled={m.isPending || role.trim().length < 2 || candidateSummary.trim().length < 10}>{m.isPending ? <Loader2 className="animate-spin" /> : <ShieldAlert />} Assess risk</Button>
      </Card>
      {m.data && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4"><span className="text-sm text-navy-700/60">Retention risk</span><div className="font-display text-2xl font-bold capitalize" style={{ color: m.data.level === 'high' ? '#dc2626' : m.data.level === 'medium' ? '#ea7a3c' : '#16a34a' }}>{m.data.level} · {m.data.riskScore}/100</div></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-sm font-semibold text-navy-900">Factors</p><ul className="mt-1 list-disc pl-5 text-sm text-navy-700/80">{m.data.factors.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
          <div className="rounded-xl border bg-white p-4 sm:col-span-2"><p className="text-sm font-semibold text-navy-900">Retention tips</p><ul className="mt-1 list-disc pl-5 text-sm text-navy-700/80">{m.data.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
}

function Pipeline() {
  const [jobTitle, setJobTitle] = useState('');
  const [applicantsText, setApplicantsText] = useState('');
  const m = trpc.ai.candidatePipelineSummary.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="space-y-1.5"><Label>Role</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Receptionist" /></div>
        <div className="space-y-1.5"><Label>Applicants (paste summaries)</Label><Area value={applicantsText} onChange={setApplicantsText} rows={8} placeholder="One applicant per line: name, experience, skills" /></div>
        <Button onClick={() => m.mutate({ jobTitle, applicantsText })} disabled={m.isPending || jobTitle.trim().length < 2 || applicantsText.trim().length < 10}>{m.isPending ? <Loader2 className="animate-spin" /> : <Users />} Summarise pipeline</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}

function Emiratization() {
  const [companySize, setCompanySize] = useState('');
  const [currentNationals, setCurrentNationals] = useState('');
  const m = trpc.ai.emiratizationAssistant.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Total employees</Label><Input type="number" value={companySize} onChange={(e) => setCompanySize(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Current Emirati staff</Label><Input type="number" value={currentNationals} onChange={(e) => setCurrentNationals(e.target.value)} /></div>
        </div>
        <Button onClick={() => m.mutate({ companySize: Number(companySize) || 0, currentNationals: Number(currentNationals) || 0 })} disabled={m.isPending || !companySize}>{m.isPending ? <Loader2 className="animate-spin" /> : <Landmark />} Get compliance plan</Button>
      </Card>
      {m.data && <Result content={m.data.content} />}
    </div>
  );
}
