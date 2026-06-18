import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of DdotsMediaJobs.',
  alternates: { canonical: `${SITE.url}/terms` },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold text-navy-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-navy-700/50">Last updated: June 2026</p>

      <div className="prose prose-slate mt-8 max-w-none prose-headings:font-display">
        <h2>Using DdotsMediaJobs</h2>
        <p>DdotsMediaJobs is a free UAE job portal connecting jobseekers and employers. By using the site you agree to these terms. You must provide accurate information and use the platform lawfully.</p>

        <h2>Jobseekers</h2>
        <p>You are responsible for the accuracy of your profile and applications. We do not guarantee employment. Verify employers and never pay fees to secure a job — legitimate UAE employers do not charge candidates.</p>

        <h2>Employers</h2>
        <p>Job posts must be genuine, lawful, and non-discriminatory, and must state a salary. We may remove posts, reject listings flagged by our anti-scam checks, or suspend accounts that violate these terms.</p>

        <h2>Prohibited use</h2>
        <ul>
          <li>Posting fraudulent, misleading, or discriminatory jobs.</li>
          <li>Harvesting data, scraping, or automated abuse.</li>
          <li>Requesting upfront fees, passports, or bank details from applicants.</li>
        </ul>

        <h2>Content</h2>
        <p>You retain ownership of content you submit and grant us a licence to display it for the purpose of operating the service.</p>

        <h2>Liability</h2>
        <p>The service is provided “as is”. We are not liable for hiring decisions, the conduct of employers or applicants, or losses arising from use of the platform.</p>

        <h2>Changes</h2>
        <p>We may update these terms; continued use means acceptance. See also our <a href="/privacy">Privacy Policy</a>.</p>

        <h2>Contact</h2>
        <p><a href="mailto:support@ddotsmediajobs.com">support@ddotsmediajobs.com</a></p>
      </div>
    </div>
  );
}
