import Link from 'next/link';
import { MapPin, Briefcase, Clock, Banknote, Zap, BadgeCheck, Sparkles } from 'lucide-react';
import { formatSalary, formatJobDate, isNew, emirateBySlug, categoryBySlug, expiryDaysLeft, matchBadge } from '@ddots/shared';
import { Badge } from './ui/primitives';
import { WhatsappApplyButton } from './whatsapp-apply-button';
import { QuickApplyButton } from './quick-apply-button';
import { CompareButton } from './compare-button';
import { cn } from '@/lib/utils';

export type JobCardData = {
  id?: string;
  slug: string;
  title: string;
  emirateSlug: string;
  categorySlug: string;
  location: string | null;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string;
  salaryHidden: boolean;
  salaryNegotiable?: boolean;
  isRemote: boolean;
  isUrgent: boolean;
  isFresher: boolean;
  isFeatured: boolean;
  freeZone?: boolean;
  freeZoneName?: string | null;
  isAnonymous?: boolean;
  source?: string | null;
  walkIn?: boolean;
  applyWhatsapp?: string | null;
  contactWhatsapp?: string | null;
  applicationCount?: number;
  publishedAt: Date | string | null;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  matchScore?: number;
  company?: { name: string | null; logoUrl?: string | null; isVerified?: boolean | null } | null;
};

const AVATAR_COLORS = ['bg-teal-600', 'bg-navy-700', 'bg-orange-500', 'bg-green-600', 'bg-amber-500', 'bg-rose-500', 'bg-sky-600', 'bg-violet-600'];
export function avatarFor(name?: string | null): { initials: string; color: string } {
  const n = (name ?? '').trim();
  const initials = n.replace(/[^a-zA-Z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'DE';
  const color = AVATAR_COLORS[(n.charCodeAt(0) || 0) % AVATAR_COLORS.length]!;
  return { initials, color };
}

export function JobCard({ job }: { job: JobCardData }) {
  const emirate = emirateBySlug(job.emirateSlug);
  const category = categoryBySlug(job.categorySlug);
  const av = avatarFor(job.isAnonymous ? 'Confidential' : job.company?.name);
  return (
    <div
      className={cn(
        'group relative min-h-[120px] rounded-xl border border-l-2 border-l-transparent bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:border-l-teal-500 hover:shadow-md',
        job.isFeatured && 'ring-1 ring-teal-200',
        job.walkIn && 'border-l-4 border-l-orange-400',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg sm:h-10 sm:w-10">
          {job.company?.logoUrl && !job.isAnonymous ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.company.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className={cn('flex h-full w-full items-center justify-center text-sm font-bold text-white', av.color)}>{av.initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-navy-900 group-hover:text-teal-600">
              <Link href={`/jobs/${job.slug}`} className="line-clamp-2 after:absolute after:inset-0" title={job.title}>
                {job.title}
              </Link>
            </h3>
            {isNew(job.publishedAt ?? job.createdAt) && <Badge variant="success"><Sparkles className="mr-1 h-3 w-3" /> New</Badge>}
            {job.isFeatured && <Badge>Featured</Badge>}
            <ExpiryBadge expiresAt={job.expiresAt} />
            {(() => {
              const b = typeof job.matchScore === 'number' ? matchBadge(job.matchScore) : null;
              return b ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
            })()}
          </div>
          <p className="flex items-center gap-1 text-sm text-navy-700/70">
            {job.isAnonymous ? 'Confidential Company' : (job.company?.name ?? 'Direct Employer')}
            {!job.isAnonymous && job.company?.isVerified && (
              <span title="Verified Employer"><BadgeCheck className="h-4 w-4 text-teal-500" /></span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-700/80">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> 🇦🇪 {job.location ?? emirate?.name}
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Clock className="h-3.5 w-3.5" /> {job.jobType.replace('-', ' ')}
            </span>
            {(() => {
              const s = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable);
              return (
                <span className={`inline-flex items-center gap-1 font-semibold ${s === 'Salary not disclosed' ? 'text-navy-700/50' : 'text-teal-700'}`}>
                  <Banknote className="h-3.5 w-3.5" />
                  {s}
                </span>
              );
            })()}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category && <Badge variant="muted">{category.name}</Badge>}
            {job.source === 'community' ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Community Referral</Badge>
            ) : (
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Direct Employer</Badge>
            )}
            <Badge variant={job.salaryHidden ? 'muted' : 'success'}>{job.salaryHidden ? 'Apply to see salary' : 'Salary shown'}</Badge>
            {job.freeZone && <Badge variant="default">{job.freeZoneName || 'Free Zone'}</Badge>}
            {job.isRemote && <Badge variant="success">Remote</Badge>}
            {job.isFresher && <Badge variant="outline">Fresher</Badge>}
            {job.isUrgent && (
              <Badge variant="urgent">
                <Zap className="mr-1 h-3 w-3" /> Urgent
              </Badge>
            )}
            {job.walkIn && <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">🚶 Walk-in</Badge>}
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-navy-400">
              {typeof job.applicationCount === 'number' && job.applicationCount > 0 && (
                <span className="mr-2 font-medium text-navy-700/70">{job.applicationCount} applied</span>
              )}
              <Clock className="h-3 w-3" /> {formatJobDate(job.publishedAt ?? job.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center gap-2">
        <WhatsappApplyButton
          slug={job.slug}
          title={job.title}
          company={job.isAnonymous ? null : job.company?.name}
          applyWhatsapp={job.applyWhatsapp}
          contactWhatsapp={job.contactWhatsapp}
          className="flex-1"
        />
        {job.id && <QuickApplyButton jobId={job.id} />}
        <Link
          href={`/jobs/${job.slug}`}
          className="relative z-10 rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          View
        </Link>
        <CompareButton slug={job.slug} title={job.title} />
      </div>
    </div>
  );
}

/** Colored expiry countdown pill (amber 7-14d, orange 3-7d, red <3d). Hidden otherwise. */
function ExpiryBadge({ expiresAt }: { expiresAt?: Date | string | null }) {
  const days = expiryDaysLeft(expiresAt);
  if (days == null || days < 0 || days > 14) return null;
  const cls =
    days < 3
      ? 'bg-red-100 text-red-700'
      : days < 7
        ? 'bg-orange-100 text-orange-700'
        : 'bg-amber-100 text-amber-700';
  const text = days === 0 ? 'Expires today' : days === 1 ? 'Expires in 1 day' : `Expires in ${days} days`;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}{days < 3 ? ' ⚡' : ''}</span>;
}
