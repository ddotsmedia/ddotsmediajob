import { truncateDescription } from '@/lib/seo-utils';

/**
 * Meta descriptions for data-driven routes.
 *
 * Discriminated union rather than `(type: string, data: any)`: each page type
 * needs different fields, and `any` would let a missing company or emirate
 * reach production as the string "undefined" inside a meta tag.
 */
export type DescriptionInput =
  | { type: 'job'; title: string; company?: string | null; emirate: string; salary?: string | null }
  | { type: 'emirate'; name: string; jobCount: number }
  | { type: 'category'; name: string; jobCount: number }
  | { type: 'default' };

/** Plural-aware count, so a single job never reads "1 jobs". */
function jobs(n: number): string {
  return n === 1 ? '1 job' : `${n.toLocaleString('en-AE')} jobs`;
}

export function generateDescription(input: DescriptionInput): string {
  let text: string;
  switch (input.type) {
    case 'job': {
      // Company is optional in the schema (jobs.companyId is nullable), so it is
      // dropped from the sentence rather than rendered as "at null".
      const at = input.company ? ` at ${input.company}` : '';
      const pay = input.salary ? ` ${input.salary}.` : '';
      text = `${input.title}${at} in ${input.emirate}.${pay} Apply free on DdotsMediaJobs.`;
      break;
    }
    case 'emirate':
      text = `${input.name} jobs in the UAE. Browse ${jobs(input.jobCount)} hiring in ${input.name} now. Free to apply on DdotsMediaJobs.`;
      break;
    case 'category':
      text = `${input.name} jobs in the UAE. ${jobs(input.jobCount)} open across Dubai, Abu Dhabi and all emirates. Apply free.`;
      break;
    case 'default':
      text = 'Find jobs in the UAE across Dubai, Abu Dhabi, Sharjah and all emirates. Free to apply, no agency fees.';
      break;
  }
  return truncateDescription(text);
}
