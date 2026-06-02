import Link from 'next/link';
import { CATEGORIES, EMIRATES, SITE } from '@ddots/shared';
import { Logo } from './logo';

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="border-t bg-navy-900 text-navy-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm text-navy-100/70">{SITE.description}</p>
        </div>

        <FooterCol title="Top Categories">
          {CATEGORIES.slice(0, 6).map((c) => (
            <FooterLink key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="Emirates">
          {EMIRATES.map((e) => (
            <FooterLink key={e.slug} href={`/jobs-in/${e.slug}`}>
              Jobs in {e.name}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="For Jobseekers">
          <FooterLink href="/jobs">Browse Jobs</FooterLink>
          <FooterLink href="/register">Create Account</FooterLink>
          <FooterLink href="/dashboard/alerts">Job Alerts</FooterLink>
          <FooterLink href="/salary-guide">Salary Guide</FooterLink>
          <FooterLink href="/whatsapp-groups">WhatsApp Groups</FooterLink>
        </FooterCol>

        <FooterCol title="For Employers">
          <FooterLink href="/employer/post">Post a Job</FooterLink>
          <FooterLink href="/employer">Employer Dashboard</FooterLink>
          <FooterLink href="/companies">Company Profiles</FooterLink>
          <FooterLink href="/blog">Hiring Blog</FooterLink>
        </FooterCol>
      </div>

      <div className="border-t border-navy-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-navy-100/60 md:flex-row">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-display text-sm font-bold text-white">{title}</h4>
      <ul className="mt-4 space-y-2">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-navy-100/70 hover:text-teal-400">
        {children}
      </Link>
    </li>
  );
}
