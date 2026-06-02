import Constants from 'expo-constants';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'https://ddotsmediajobs.com';

/**
 * Minimal tRPC HTTP client (no codegen) for the mobile app.
 * Calls the same `/api/trpc` endpoint the web app uses.
 */
async function trpcQuery<T>(path: string, input: unknown): Promise<T> {
  const url = `${BASE_URL}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = await res.json();
  return data.result?.data?.json as T;
}

export type JobListItem = {
  id: string;
  slug: string;
  title: string;
  emirateSlug: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string;
  salaryHidden: boolean;
  company?: { name: string | null } | null;
};

export const api = {
  listJobs: (filter: { q?: string; emirate?: string; page?: number }) =>
    trpcQuery<{ jobs: JobListItem[]; total: number; totalPages: number }>('jobs.list', {
      sort: 'newest',
      perPage: 20,
      page: 1,
      ...filter,
    }),
  jobBySlug: (slug: string) => trpcQuery<any>('jobs.bySlug', { slug }),
};

export function formatSalary(min?: number | null, max?: number | null, period = 'monthly', hidden = false) {
  if (hidden || (min == null && max == null)) return 'Salary not disclosed';
  const f = (n: number) => `AED ${n.toLocaleString('en-AE')}`;
  const suffix = period === 'monthly' ? '/mo' : period === 'yearly' ? '/yr' : '';
  if (min != null && max != null) return `${f(min)} – ${f(max)}${suffix}`;
  return min != null ? `From ${f(min)}${suffix}` : `Up to ${f(max as number)}${suffix}`;
}
