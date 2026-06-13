import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { QaHub } from './qa-hub';

export const metadata: Metadata = {
  title: 'UAE Jobs Community Q&A — Ask Career Questions',
  description: 'Ask and answer UAE job, salary, visa and career questions. Real answers from the DdotsMediaJobs community.',
  alternates: { canonical: `${SITE.url}/community/qa` },
};

export default function QaPage() {
  return <div className="bg-navy-50/30"><QaHub /></div>;
}
