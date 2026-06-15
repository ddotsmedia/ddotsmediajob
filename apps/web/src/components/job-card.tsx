import Link from 'next/link';
import { MapPin, Briefcase, Clock, Banknote, Zap, BadgeCheck, Sparkles } from 'lucide-react';
import { formatSalary, formatJobDate, isNew, emirateBySlug, categoryBySlug } from '@ddots/shared';
import { Badge } from './ui/primitives';
import { WhatsappApplyButton } from './whatsapp-apply-button';
import { CompareButton } from './compare-button';
import { cn } from '@/lib/utils';

export type JobCardData = {
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
  createdAt: Date | string;
  company?: { name: string | null; logoUrl?: string | null; isVerified?: boolean | null } | null;
};

export function JobCard({ job }: { job: JobCardData }) {
  const emirate = emirateBySlug(job.emirateSlug);
  const category = categoryBySlug(job.categorySlug);
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md',
        job.isFeatured && 'ring-1 ring-teal-200',
        job.walkIn && 'border-l-4 border-l-orange-400',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-900">
          {job.company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.company.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
          ) : (
            <Briefcase className="h-5 w-5 text-teal-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-navy-900 group-hover:text-teal-600">
              <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">{job.title}</Link>
            </h3>
            {isNew(job.publishedAt ?? job.createdAt) && <Badge variant="success"><Sparkles className="mr-1 h-3 w-3" /> New</Badge>}
            {job.isFeatured && <Badge>Featured</Badge>}
          </div>
          <p className="flex items-center gap-1 text-sm text-navy-700/70">
            {job.isAnonymous ? 'Confidential Company' : (job.company?.name ?? 'Confidential')}
            {!job.isAnonymous && job.company?.isVerified && (
              <span title="Verified Employer"><BadgeCheck className="h-4 w-4 text-teal-500" /></span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-700/80">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location ?? emirate?.name}
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
