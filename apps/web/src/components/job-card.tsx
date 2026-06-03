import Link from 'next/link';
import { MapPin, Briefcase, Clock, Banknote, Zap } from 'lucide-react';
import { formatSalary, timeAgo, emirateBySlug, categoryBySlug } from '@ddots/shared';
import { Badge } from './ui/primitives';
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
  isRemote: boolean;
  isUrgent: boolean;
  isFresher: boolean;
  isFeatured: boolean;
  freeZone?: boolean;
  freeZoneName?: string | null;
  isAnonymous?: boolean;
  applicationCount?: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  company?: { name: string | null; logoUrl?: string | null } | null;
};

export function JobCard({ job }: { job: JobCardData }) {
  const emirate = emirateBySlug(job.emirateSlug);
  const category = categoryBySlug(job.categorySlug);
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className={cn(
        'group relative block rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md',
        job.isFeatured && 'ring-1 ring-teal-200',
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
            <h3 className="font-display font-bold text-navy-900 group-hover:text-teal-600">{job.title}</h3>
            {job.isFeatured && <Badge>Featured</Badge>}
          </div>
          <p className="text-sm text-navy-700/70">{job.isAnonymous ? 'Confidential Company' : (job.company?.name ?? 'Confidential')}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-700/80">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location ?? emirate?.name}
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Clock className="h-3.5 w-3.5" /> {job.jobType.replace('-', ' ')}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
              <Banknote className="h-3.5 w-3.5" />
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category && <Badge variant="muted">{category.name}</Badge>}
            <Badge variant={job.salaryHidden ? 'muted' : 'success'}>{job.salaryHidden ? 'Apply to see salary' : 'Salary shown'}</Badge>
            {job.freeZone && <Badge variant="default">{job.freeZoneName || 'Free Zone'}</Badge>}
            {job.isRemote && <Badge variant="success">Remote</Badge>}
            {job.isFresher && <Badge variant="outline">Fresher</Badge>}
            {job.isUrgent && (
              <Badge variant="urgent">
                <Zap className="mr-1 h-3 w-3" /> Urgent
              </Badge>
            )}
            <span className="ml-auto text-xs text-navy-700/50">
              {typeof job.applicationCount === 'number' && job.applicationCount > 0 && (
                <span className="mr-2 font-medium text-navy-700/70">{job.applicationCount} applied</span>
              )}
              {timeAgo(job.publishedAt ?? job.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
