'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Mic, UserCog, Banknote, Loader2, Sparkles, FileText, Linkedin, CalendarDays, Plane, TrendingUp, ArrowRightLeft, Handshake } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { ChatBox, type Msg } from '@/components/ai/chat-box';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'advisor', label: 'Career Advisor', icon: MessageSquare },
  { key: 'interview', label: 'Interview Prep', icon: Mic },
  { key: 'profile', label: 'Profile Coach', icon: UserCog },
  { key: 'salary', label: 'Salary Coach', icon: Banknote },
  { key: 'cv-bullets', label: 'CV Bullet Rewriter', icon: FileText },
  { key: 'linkedin', label: 'LinkedIn Optimiser', icon: Linkedin },
  { key: 'search-plan', label: 'Job Search Planner', icon: CalendarDays },
  { key: 'relocation', label: 'Relocation Advisor', icon: Plane },
  { key: 'career-path', label: 'Career Path', icon: TrendingUp },
  { key: 'transition', label: 'Career Transition', icon: ArrowRightLeft },
  { key: 'negotiation', label: 'Negotiation Sim', icon: Handshake },
] as const;

export default function AiToolsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('advisor');

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">AI Career Tools</h1>
      </div>
      <p className="text-navy-700/60">Powered by Claude — tailored to the UAE market.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium',
              tab === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'advisor' && <Advisor />}
        {tab === 'interview' && <Interview />}
        {tab === 'profile' && <ProfileCoach />}
        {tab === 'salary' && <SalaryCoach />}
        {tab === 'cv-bullets' && <CvBullets />}
        {tab === 'linkedin' && <LinkedInTool />}
        {tab === 'search-plan' && <SearchPlan />}
        {tab === 'relocation' && <Relocation />}
        {tab === 'career-path' && <CareerPath />}
        {tab === 'transition' && <Transition />}
        {tab === 'negotiation' && <Negotiation />}
      </div>
    </div>
  );
}

function Advisor() {
  const ask = trpc.ai.careerAdvisor.useMutation();
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border bg-white">
      <ChatBox
        className="h-full"
        greeting="Hi! I'm your career advisor. Ask me about switching fields, visas, salary expectations, or your next move in the UAE."
        placeholder="Ask anything about your career…"
        onSend={async (messages: Msg[]) => (await ask.mutateAsync({ messages })).reply}
      />
    </div>
  );
}

function ResultBox({ content }: { content: string }) {
  return <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{content}</div>;
}

function Interview() {
  const [role, setRole] = useState('');
  const prep = trpc.ai.interviewPrep.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>Target role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Sales Executive" />
        </div>
        <Button onClick={() => prep.mutate({ role })} disabled={prep.isPending || role.trim().length < 2}>
          {prep.isPending ? <Loader2 className="animate-spin" /> : <Mic />} Generate prep pack
        </Button>
      </div>
      {prep.data && <ResultBox content={prep.data.content} />}
    </div>
  );
}

function ProfileCoach() {
  const coach = trpc.ai.profileCoach.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Button onClick={() => coach.mutate()} disabled={coach.isPending}>
        {coach.isPending ? <Loader2 className="animate-spin" /> : <UserCog />} Review my profile
      </Button>
      {coach.data && <ResultBox content={coach.data.content} />}
    </div>
  );
}

function SalaryCoach() {
  const [role, setRole] = useState('');
  const [offer, setOffer] = useState('');
  const coach = trpc.ai.salaryCoach.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Accountant" />
        </div>
        <div className="space-y-1.5">
          <Label>Offer (AED/mo)</Label>
          <Input type="number" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="optional" />
        </div>
        <Button
          onClick={() => coach.mutate({ role, offer: offer ? Number(offer) : undefined })}
          disabled={coach.isPending || role.trim().length < 2}
        >
          {coach.isPending ? <Loader2 className="animate-spin" /> : <Banknote />} Get advice
        </Button>
      </div>
      {coach.data && <ResultBox content={coach.data.content} />}
    </div>
  );
}

function CvBullets() {
  const [bullet, setBullet] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const m = trpc.ai.resumeBulletRewriter.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Your CV bullet point</Label><Input value={bullet} onChange={(e) => setBullet(e.target.value)} placeholder="e.g. Responsible for managing the sales team" /></div>
        <div className="space-y-1.5"><Label>Target role (optional)</Label><Input value={targetJob} onChange={(e) => setTargetJob(e.target.value)} placeholder="e.g. Sales Manager" /></div>
        <Button onClick={() => m.mutate({ bullet, targetJob: targetJob || undefined })} disabled={m.isPending || bullet.trim().length < 5}>
          {m.isPending ? <Loader2 className="animate-spin" /> : <FileText />} Rewrite 3 ways
        </Button>
      </div>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function LinkedInTool() {
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [role, setRole] = useState('');
  const m = trpc.ai.linkedinOptimiser.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Target role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Marketing Manager" /></div>
        <div className="space-y-1.5"><Label>Current headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="optional" /></div>
        <div className="space-y-1.5"><Label>Current summary</Label><textarea className="w-full rounded-lg border p-3" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="optional" /></div>
        <Button onClick={() => m.mutate({ headline: headline || undefined, summary: summary || undefined, role: role || undefined })} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="animate-spin" /> : <Linkedin />} Optimise
        </Button>
      </div>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function SearchPlan() {
  const [targetRole, setTargetRole] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [weeks, setWeeks] = useState('4');
  const m = trpc.ai.jobSearchPlanner.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5"><Label>Target role</Label><Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Project Manager" /></div>
        <div className="space-y-1.5"><Label>Current role</Label><Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="optional" /></div>
        <div className="space-y-1.5"><Label>Weeks</Label><Input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ targetRole, currentRole: currentRole || undefined, weeks: Number(weeks) || 4 })} disabled={m.isPending || targetRole.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <CalendarDays />} Build my plan
      </Button>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function Relocation() {
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [familySize, setFamilySize] = useState('1');
  const m = trpc.ai.relocationAdvisor.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-4 sm:items-end">
        <div className="space-y-1.5"><Label>From country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" /></div>
        <div className="space-y-1.5"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Nurse" /></div>
        <div className="space-y-1.5"><Label>Salary (AED/mo)</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="optional" /></div>
        <div className="space-y-1.5"><Label>Family size</Label><Input type="number" value={familySize} onChange={(e) => setFamilySize(e.target.value)} /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ country, role, salary: salary ? Number(salary) : undefined, familySize: Number(familySize) || 1 })} disabled={m.isPending || country.trim().length < 2 || role.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <Plane />} Get relocation plan
      </Button>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function CareerPath() {
  const [role, setRole] = useState('');
  const [years, setYears] = useState('');
  const m = trpc.ai.careerPathPredictor.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 sm:items-end">
        <div className="space-y-1.5"><Label>Current role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Accountant" /></div>
        <div className="space-y-1.5"><Label>Years of experience</Label><Input type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="optional" /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ role, years: years ? Number(years) : undefined })} disabled={m.isPending || role.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <TrendingUp />} Predict my path
      </Button>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function Transition() {
  const [fromRole, setFromRole] = useState('');
  const [toRole, setToRole] = useState('');
  const [months, setMonths] = useState('6');
  const m = trpc.ai.careerTransitionPlan.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5"><Label>From role</Label><Input value={fromRole} onChange={(e) => setFromRole(e.target.value)} placeholder="e.g. Teacher" /></div>
        <div className="space-y-1.5"><Label>To role</Label><Input value={toRole} onChange={(e) => setToRole(e.target.value)} placeholder="e.g. Instructional Designer" /></div>
        <div className="space-y-1.5"><Label>Months</Label><Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ fromRole, toRole, months: Number(months) || 6 })} disabled={m.isPending || fromRole.trim().length < 2 || toRole.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Build transition plan
      </Button>
      {m.data && <ResultBox content={m.data.content} />}
    </div>
  );
}

function Negotiation() {
  const [role, setRole] = useState('');
  const [started, setStarted] = useState(false);
  const m = trpc.ai.negotiationSimulator.useMutation();
  if (!started) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5"><Label>Role you're negotiating for</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" /></div>
        <Button onClick={() => setStarted(true)} disabled={role.trim().length < 2}><Handshake /> Start roleplay</Button>
      </div>
    );
  }
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border bg-white">
      <ChatBox
        className="h-full"
        greeting={`You're negotiating salary for a ${role} role. Make your opening ask — I'll play the hiring manager and coach you after each reply.`}
        placeholder="Make your offer or counter…"
        onSend={async (messages: Msg[]) => (await m.mutateAsync({ role, messages })).reply}
      />
    </div>
  );
}
