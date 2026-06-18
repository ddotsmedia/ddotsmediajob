import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How DdotsMediaJobs collects, uses, stores and protects your personal data.',
  alternates: { canonical: `${SITE.url}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold text-navy-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-navy-700/50">Last updated: June 2026</p>

      <div className="prose prose-slate mt-8 max-w-none prose-headings:font-display">
        <h2>What we collect</h2>
        <p>Account details (name, email), profile data you provide (CV, skills, experience, photo), application data, and usage analytics. Employers provide company details and job postings.</p>

        <h2>How we use it</h2>
        <p>To run the job portal: match jobseekers with jobs, deliver applications to employers, send job alerts you opt into, and improve the service. We never sell your personal data.</p>

        <h2>WhatsApp</h2>
        <p>If you apply or set alerts via WhatsApp, your number is shared only with the relevant employer for that application, or used to send alerts you requested. Reply <strong>STOP</strong> to any WhatsApp alert to unsubscribe.</p>

        <h2>Data retention</h2>
        <ul>
          <li>CVs attached to rejected/expired applications are auto-deleted 90 days after the application closes.</li>
          <li>Delete your account anytime — personal data is soft-deleted immediately and permanently erased within 30 days.</li>
          <li>Audit logs are retained for security and legal compliance.</li>
        </ul>

        <h2>Storage &amp; security</h2>
        <p>Data is stored on secured servers in the UAE/EU. Files (CVs) live in private storage accessed only via short-lived signed URLs. Passwords are hashed (bcrypt); reset tokens are stored hashed. See our <a href="https://github.com/ddotsmedia/ddotsmediajob/blob/main/SECURITY.md">security overview</a>.</p>

        <h2>Your rights</h2>
        <p>You can access, correct, export or delete your data. Email <a href="mailto:privacy@ddotsmediajobs.com">privacy@ddotsmediajobs.com</a>.</p>

        <h2>Contact</h2>
        <p>Questions about this policy: <a href="mailto:privacy@ddotsmediajobs.com">privacy@ddotsmediajobs.com</a>.</p>
      </div>
    </div>
  );
}
