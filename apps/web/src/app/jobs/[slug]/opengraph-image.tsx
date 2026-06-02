import { ImageResponse } from 'next/og';
import { formatSalary, emirateBySlug } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const runtime = 'nodejs';
export const alt = 'Job on DdotsMediaJobs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  let job: { title: string; companyName: string; location: string; salary: string } | null = null;
  try {
    const api = await getApi();
    const j = await api.jobs.bySlug({ slug: params.slug });
    job = {
      title: j.title,
      companyName: j.company?.name ?? 'Confidential',
      location: j.location ?? emirateBySlug(j.emirateSlug)?.name ?? 'UAE',
      salary: formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden),
    };
  } catch {
    job = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0d2e2d',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: 40, height: 40, gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9999, background: '#f4d23f' }} />
            <div style={{ width: 18, height: 18, borderRadius: 9999, background: '#ea7a3c' }} />
            <div style={{ width: 18, height: 18, borderRadius: 9999, background: '#b3cb4f' }} />
            <div style={{ width: 18, height: 18, borderRadius: 9999, background: '#f3ca3d' }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
            <span style={{ color: '#f4cf3f' }}>Ddots</span>MediaJobs
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
            {job?.title ?? 'Find your next job in the UAE'}
          </div>
          <div style={{ fontSize: 36, color: '#94a3b8', marginTop: 16 }}>
            {job ? `${job.companyName} · ${job.location}` : 'Thousands of jobs across all emirates'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#2a9aa4' }}>{job?.salary ?? ''}</div>
          <div style={{ fontSize: 28, color: '#64748b' }}>ddotsmediajobs.com</div>
        </div>
      </div>
    ),
    size,
  );
}
