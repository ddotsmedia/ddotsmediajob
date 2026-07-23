# Manual QA Checklist

Run on staging or production-with-care. Test viewports: 360 / 390 / tablet / desktop. Automated coverage: `pnpm test` (36 unit tests). E2E (Playwright) not yet wired.

## Auth & consent (Phase 1)
- [ ] `/register` and `/auth/register`: confirm-password field present; mismatch blocks submit.
- [ ] Live password checklist (8+ / uppercase / number) turns green as typed; submit disabled until met.
- [ ] Terms/Privacy checkbox is **required**; unchecked → cannot submit; links open `/terms` `/privacy`.
- [ ] Marketing checkbox optional and independent.
- [ ] After register: DB row has `terms_accepted_at`, `privacy_accepted_at`, versions; redirect to `/onboarding`.
- [ ] Google signup works (note: consent not yet captured for OAuth — known gap).
- [ ] Forgot-password shows the same generic message for known + unknown emails.

## Authorization (Phase 3)
- [ ] Employer A cannot open Employer B's `/employer/jobs/:id` edit (FORBIDDEN).
- [ ] Employer A cannot see Employer B's applicants.
- [ ] Jobseeker hitting an employer API mutation is rejected.
- [ ] Non-admin → `/admin/*` redirects; admin loads.

## Job data quality (Phase 6)
- [ ] Job with **no** salary numbers shows "Salary not disclosed" (NOT "Salary shown").
- [ ] Job with a real range shows "Salary shown" (green).
- [ ] Hidden salary shows "Apply to see salary".
- [ ] Confidential (anonymous) job shows "Confidential Company" everywhere, incl. page source JSON-LD (no real name leak).
- [ ] WhatsApp apply for a job without an employer number falls back to the real `971509379212`, not a placeholder.

## Safety / reporting (Phase 9)
- [ ] "Report job" button on a job page opens the modal; a reason is required; submit shows a confirmation.
- [ ] "Apply on WhatsApp" first shows the external-channel scam warning; Cancel aborts, Continue opens WhatsApp.
- [ ] `/admin/reports` lists the submitted report; status can move open→under_review→actioned/dismissed; reporter identity not shown to employers.

## SEO (Phase 11)
- [ ] View source on a job page: single `<title> … | DdotsMediaJobs` (no double brand).
- [ ] Static SEO pages (`/assessments`, `/events`, `/jobs/*`) single-branded.
- [ ] A removed job slug returns 404 (not soft-200). (Role/emirate landing pages intentionally 200.)
- [ ] JobPosting JSON-LD validates in Google Rich Results; org name matches visible name.

## Content (Phase 13)
- [ ] Homepage hero and sidebar show the **same** member count (from `PlatformStats`); no 120k-vs-80k mismatch.

## Candidate settings (Phase 3A)
- [ ] `/jobseeker/settings`: visa (yes/no/no-pref), emirates multi-select, dual salary slider; save persists.

## Mobile / a11y (spot-check)
- [ ] No horizontal scroll at 360px on register, job detail, apply, report modal.
- [ ] Report + external-warning dialogs are keyboard-dismissible and labelled.
- [ ] Form validation messages are announced (aria-live) where present.

## Post-deploy smoke
- [ ] `live:200`, `job:200`, `pm2 status online`, `unstable restarts 0`, `next-staging` count `0` in required-server-files.
