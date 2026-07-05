import Link from 'next/link';
import { MessageCircle, Facebook, Linkedin, Instagram } from 'lucide-react';
import { CATEGORIES, EMIRATES, SITE } from '@ddots/shared';
import { Logo } from './logo';

const socialBox: React.CSSProperties = {
  borderRadius: '6px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="text-slate-300" style={{ backgroundColor: '#0a2a2b' }}>
      {/* Row 1 — brand + 5 columns */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm" style={{ color: '#5f8a8b' }}>{SITE.description}</p>
          <div className="mt-4 flex items-center gap-3">
            <a href="https://wa.me/971509379212" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:opacity-90"><span style={{ ...socialBox, background: '#25d366' }}><MessageCircle className="h-4 w-4" style={{ color: '#fff' }} /></span></a>
            <a href="https://www.facebook.com/ddotsmediajobs" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-90"><span style={{ ...socialBox, background: '#1877f2' }}><Facebook className="h-4 w-4" style={{ color: '#fff' }} /></span></a>
            <a href="https://www.linkedin.com/company/ddotsmedia" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:opacity-90"><span style={{ ...socialBox, background: '#0077b5' }}><Linkedin className="h-4 w-4" style={{ color: '#fff' }} /></span></a>
            <a href="https://www.instagram.com/ddotsmediajobs" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-90"><span style={{ ...socialBox, background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}><Instagram className="h-4 w-4" style={{ color: '#fff' }} /></span></a>
          </div>
        </div>

        <FooterCol title="Top Categories">
          {CATEGORIES.slice(0, 6).map((c) => (
            <FooterLink key={c.slug} href={`/category/${c.slug}`}>{c.name}</FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="Emirates">
          {EMIRATES.map((e) => (
            <FooterLink key={e.slug} href={`/jobs-in/${e.slug}`}>Jobs in {e.name}</FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="For Employers">
          <FooterLink href="/employer/post">Post a Job</FooterLink>
          <FooterLink href="/talent">Browse Talent</FooterLink>
          <FooterLink href="/employer">Employer Dashboard</FooterLink>
          <FooterLink href="/companies">Company Profiles</FooterLink>
          <FooterLink href="/campus">Campus Jobs</FooterLink>
        </FooterCol>

        <FooterCol title="Community">
          <FooterLink href="/community">Community Forum</FooterLink>
          <FooterLink href="/community/qa">Q&amp;A</FooterLink>
          <FooterLink href="/community/profession/healthcare">Healthcare Community</FooterLink>
          <FooterLink href="/community/profession/it">IT Community</FooterLink>
          <FooterLink href="/community/mentors">Find a Mentor</FooterLink>
          <FooterLink href="/community/leaderboard">Leaderboard</FooterLink>
        </FooterCol>

        <FooterCol title="Popular Searches">
          <FooterLink href="/jobs/jobs-for-indians-in-uae">Jobs for Indians</FooterLink>
          <FooterLink href="/jobs/jobs-for-filipinos-in-dubai">Jobs for Filipinos</FooterLink>
          <FooterLink href="/jobs/walk-in-interview-dubai">Walk In Interviews</FooterLink>
          <FooterLink href="/jobs/urgent-hiring-uae">Urgent Hiring</FooterLink>
          <FooterLink href="/jobs/fresher-jobs-uae">Fresher Jobs</FooterLink>
          <FooterLink href="/jobs/visa-provided">Visa Provided Jobs</FooterLink>
        </FooterCol>
      </div>

      {/* Row 2 — horizontal link rows on a darker strip */}
      <div className="border-t" style={{ backgroundColor: '#061818', borderColor: '#1a4a4b' }}>
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="mr-6 text-xs font-semibold uppercase tracking-widest" style={{ color: '#5eead4' }}>For Jobseekers</span>
            <HLink href="/jobs">Browse Jobs</HLink>
            <HLink href="/register">Create Account</HLink>
            <HLink href="/dashboard/alerts">Job Alerts</HLink>
            <HLink href="/cv-builder">ATS CV Builder</HLink>
            <HLink href="/career-advisor">AI Career Advisor</HLink>
            <HLink href="/interview-prep">AI Interview Prep</HLink>
            <HLink href="/whatsapp-groups">WhatsApp Groups</HLink>
            <HLink href="/salary-guide">Salary Guide</HLink>
            <HLink href="/assessments">Skill Assessments</HLink>
            <HLink href="/compare">Compare Jobs</HLink>
            <HLink href="/swipe">Swipe Jobs</HLink>
            <HLink href="/success-stories">Success Stories</HLink>
            <HLink href="/market-insights">Market Insights</HLink>
            <HLink href="/feedback">Send Feedback</HLink>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="mr-6 text-xs font-semibold uppercase tracking-widest" style={{ color: '#5eead4' }}>UAE Tools</span>
            <HLink href="/golden-visa-checker">Golden Visa Checker</HLink>
            <HLink href="/wps-calculator">WPS &amp; Gratuity Calculator</HLink>
            <HLink href="/cost-of-living">Cost of Living</HLink>
            <HLink href="/nafis-guide">Nafis &amp; Emiratisation</HLink>
            <HLink href="/visa-guide">Visa Guide 2026</HLink>
            <HLink href="/jobs/freezone">Free Zone Jobs</HLink>
            <HLink href="/resources/relocation-advisor">Relocation Advisor</HLink>
            <HLink href="/resources/labour-rights">Labour Rights</HLink>
            <HLink href="/tools/career-transition">Career Transition</HLink>
            <HLink href="/tools/negotiation-simulator">Negotiation Simulator</HLink>
            <HLink href="/events">Hiring Events</HLink>
          </div>
        </div>
      </div>

      <div className="border-t" style={{ backgroundColor: '#040f0f', borderColor: '#1a4a4b' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs md:flex-row" style={{ color: '#3d7a7b' }}>
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:!text-[#7fb3b5]" style={{ color: '#3d7a7b' }}>Privacy</Link>
            <Link href="/terms" className="hover:!text-[#7fb3b5]" style={{ color: '#3d7a7b' }}>Terms</Link>
            <Link href="/sitemap.xml" className="hover:!text-[#7fb3b5]" style={{ color: '#3d7a7b' }}>Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 border-b pb-2 font-display text-xs font-semibold uppercase tracking-widest" style={{ color: '#5eead4', borderBottomColor: '#1a4a4b' }}>{title}</h4>
      <ul className="flex flex-col gap-y-2.5">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm hover:!text-white" style={{ color: '#7fb3b5' }}>{children}</Link>
    </li>
  );
}
function HLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm hover:!text-[#7fb3b5]" style={{ color: '#5f8a8b' }}>{children}</Link>
  );
}
