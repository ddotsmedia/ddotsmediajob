# TASKS.md — DdotsMediaJobs Build Checklist
# Claude Code: read this, find all [ ], build in order, mark [x] when done

## PHASE 0 — Immediate Fixes
- [ ] Upgrade Next.js to 15.5.18+  (deferred: live-site risk, needs isolated test)
- [x] Fix homepage stat counters (connect to DB)
- [x] Add JSON-LD Organization + WebSite+SearchAction to homepage
- [x] Add JobPosting JSON-LD to /job/[slug]
- [x] Add robots.txt
- [x] Verify sitemap.xml includes all live jobs + static pages
- [x] Add CSP + security headers to next.config.js
- [x] Fix theme-color #2563eb → #2a9aa4 in layout.tsx + manifest.json
- [x] Fix job description HTML rendering (dangerouslySetInnerHTML + DOMPurify)
- [x] Fix mobile form inputs (font-size 16px, min-height 52px)
- [x] Fix Skills + Benefits fields → textarea or tag-input
- [x] AI calls: 30s timeout + admin rate-limit bypass + 423/503 errors
- [x] Admin /admin/jobs: bulk Approve/Reject/Delete + delete confirm + CSV export

## PHASE 1 — Missing Public Pages
- [ ] /jobs/blue-visa (SSG)
- [ ] /jobs/emiratization (SSG)
- [ ] /jobs/remote (SSG)
- [ ] /jobs/visa-provided (SSG)
- [ ] /assessments page
- [ ] Dynamic OG images via next/og for job detail + blog
- [ ] Applicant count on all job cards
- [ ] Salary transparency badge on job cards

## PHASE 2 — Jobseeker Dashboard
- [ ] /jobseeker/profile (photo R2, all sections, completion %)
- [ ] /jobseeker/applications (history + Kanban)
- [ ] /jobseeker/saved (grid + folders)
- [ ] /jobseeker/alerts (list + create modal)
- [ ] /jobseeker/cv-builder (3 templates + PDF + ATS tab)
- [ ] /jobseeker/assessments (take quiz, earn badge)
- [ ] /jobseeker/career-tools (all AI tools tabs)
- [ ] /jobseeker/messages (inbox + thread)
- [ ] /jobseeker/ai-agent (agentic apply setup)
- [ ] ActivityStreakCard on dashboard
- [ ] 30-sec video pitch (MediaRecorder → R2)
- [ ] AI match score on recommended jobs
- [ ] Saved job folders (saved_job_folders table)
- [ ] Push notification permission prompt on dashboard

## PHASE 3 — Employer Dashboard
- [ ] /employer/applications (Kanban @dnd-kit + AI score + bulk actions)
- [ ] /employer/candidates (CV search + match scores)
- [ ] /employer/analytics (recharts bar/line/donut)
- [ ] /employer/video-interviews (create + view + AI transcript)
- [ ] /employer/ai-tools (all employer AI tabs)
- [ ] /employer/team (sub-accounts + roles)
- [ ] /employer/messages (inbox + threads)
- [ ] /employer/nafis-dashboard (quota + subsidy calculator)
- [ ] /employer/mohre (permit eligibility + submit + tracker)
- [ ] /employer/events (create + manage virtual events)
- [ ] /employer/templates (job templates management)
- [ ] Response rate badge calculation + display
- [ ] Employer Q&A on job posts (job_questions table)
- [ ] Company posts feed (company_posts + company_followers)
- [ ] Duplicate & edit button on job rows
- [ ] One-click repost on expired jobs

## PHASE 4 — Admin Panel Complete
- [ ] /admin/jobs — bulk actions + inline edit + full edit modal
- [ ] /admin/users — full management + user detail modal
- [ ] /admin/employers — full management + edit modal
- [ ] /admin/blog — full editor Tiptap + AI assist + schedule
- [ ] /admin/whatsapp-groups — drag reorder + full CRUD
- [ ] /admin/salary-guide (new) — CRUD + CSV import + AI refresh
- [ ] /admin/categories (new) — CRUD + drag reorder
- [ ] /admin/pages (new) — static content management via site_settings
- [ ] /admin/applications (new) — full table + CV preview + status
- [ ] /admin/comments (new) — community moderation + auto-flag
- [ ] /admin/site-settings — all tabs (General/SEO/Email/Integrations/Maintenance/Danger)
- [ ] /admin/skills-tests — create/edit test banks
- [ ] /admin/success-stories — manage success stories
- [ ] /admin/community-groups — moderate groups
- [ ] /admin/jobs/add — 6-tab quick upload (paste/whatsapp/csv/quick/url/manual)
- [ ] /admin/jobs/drafts — manage drafts by source
- [ ] Admin sidebar reorganised with sections
- [ ] Shared admin components (AdminTable/AdminModal/AdminForm/etc)
- [ ] AI scam score badge on approval queue
- [ ] AI seeker behaviour insights widget on dashboard

## PHASE 5 — All AI Features (Haiku only)
- [ ] extractJobFromText → JobDraft + confidenceMap
- [ ] jobMatchScore → score + reasons + missing skills
- [ ] cvAtsAnalyzer → score + gaps + improvements
- [ ] careerAdvisor → streaming chat (Haiku)
- [ ] interviewPrep → 10 Q+A frameworks
- [ ] videoInterviewScore → scores + summary
- [ ] salaryCoach → range + negotiation script
- [ ] profileCoach → gaps + suggestions
- [ ] hrChatbot → streaming UAE law (Haiku)
- [ ] cvFraudDetection → score + flags
- [ ] trendingSkills → skills + demand (weekly cron)
- [ ] smartAlertMatch → semantic score
- [ ] emiratizationAssistant → compliance + plan
- [ ] socialPostGenerator → linkedin + instagram + whatsapp
- [ ] skillGapAnalyzer → matched + missing + courses
- [ ] coverLetterGenerator → letter + subject
- [ ] candidateRanking → ranked batch (BullMQ)
- [ ] whatsappJobBot → webhook + Haiku format
- [ ] resumeBulletRewriter → 3 rewrites
- [ ] jobTitleNormaliser → MOHRE title + category
- [ ] salaryBenchmark → market comparison real-time
- [ ] interviewQuestionBank → 20 Q + rubrics
- [ ] offerLetterDrafter → MOHRE compliant DOCX
- [ ] candidateOutreach → personalised message
- [ ] rejectionMessage → professional + constructive
- [ ] companyCultureAnalyser → culture summary
- [ ] careerPathPredictor → 3 steps + salary
- [ ] jobScamDetector → score + flags (pre-approval)
- [ ] abTestJobDescription → 2 variants
- [ ] seekerBehaviourInsights → weekly admin digest
- [ ] jobVoiceover → browser SpeechSynthesis
- [ ] videoSentimentAnalysis → sentiment + confidence
- [ ] transcribeAndExtract → Whisper → Haiku
- [ ] extractJobFromImage → Haiku vision
- [ ] autoCompleteJobTitle → ghost text
- [ ] continueJobDescription → Tiptap continuation
- [ ] translateJobToArabic → titleAr + descriptionAr
- [ ] predictJobPerformance → estimated apps + views
- [ ] recommendBoosts → per boost recommendation
- [ ] checkDuplicate → pg_trgm similarity
- [ ] repost → clone + Haiku refresh
- [ ] smartExpirySuggestion → days by category
- [ ] blogImprove + blogExcerpt + blogTags + blogSEO
- [ ] contentModeration → flagScore + flags
- [ ] checkPermitEligibility → eligibility + fixes
- [ ] generateOnboardingChecklist → steps[]
- [ ] labourComplaintGuide → steps[]
- [ ] generateOnboardingPack → PDF pack
- [ ] interviewCopilot → suggestions + scorecard
- [ ] referenceCheckAnalysis → summary + recommendation
- [ ] biasDetector → score + flags + alternatives
- [ ] marketPulseGenerate → weekly insights
- [ ] agenticApply → auto-apply matching jobs
- [ ] proactiveMatch → ranked seekers for new job
- [ ] predictAttrition → score + tips
- [ ] negotiationSimulator → 5-round roleplay
- [ ] careerTransitionPlan → 6-month plan
- [ ] successStoryWriter → story from answers
- [ ] suggestJobQandAAnswer → answer suggestion

## PHASE 6 — Security
- [ ] Rate limiting (Redis) on auth + AI + upload endpoints
- [ ] DOMPurify on all Tiptap content (isomorphic-dompurify)
- [ ] Admin TOTP 2FA (otplib) mandatory for ADMIN role
- [ ] File upload malware scan (ClamAV)
- [ ] SSRF protection on URL import (block private IPs)
- [ ] IDOR ownership checks on every tRPC query/mutation
- [ ] Mass assignment protection (Zod .strict() on update schemas)
- [ ] Session rotation on password change + email verify
- [ ] Twilio webhook signature verification
- [ ] HaveIBeenPwned check on registration
- [ ] R2 presigned URLs 1hr expiry (store keys not URLs)
- [ ] Auto-delete R2 CVs 90 days after rejection (BullMQ)
- [ ] Daily PostgreSQL backup to R2 (cron + pg_dump)
- [ ] GDPR consent checkbox + delete account endpoint

## PHASE 7 — UAE Tools
- [ ] /tools/end-of-service (tab in /wps-calculator)
- [ ] /resources/onboarding-tracker
- [ ] /resources/labour-rights
- [ ] /tools/negotiation-simulator
- [ ] /tools/career-transition
- [ ] DET licence verifier on employer registration
- [ ] Ramadan/prayer time aware scheduler (Aladhan API)
- [ ] Housing allowance benchmarker on salary guide + job detail
- [ ] MOHRE permit eligibility on post-job step 4

## PHASE 8 — Engagement & UX
- [ ] Swipe-to-apply mobile (react-spring + @use-gesture)
- [ ] Job comparison page /compare (max 3 jobs side by side)
- [ ] Dark mode (next-themes + CSS vars)
- [ ] Search history widget + resume last position
- [ ] Employer response time display on job cards + detail
- [ ] Push notifications (web-push VAPID + service worker)
- [ ] Virtual hiring events (/events + /employer/events)
- [ ] University partnerships /campus section
- [ ] Success stories /success-stories
- [ ] Community groups /community/groups
- [ ] Expert AMAs /community/ama (Pusher WebSockets)
- [ ] Talent pool proactive matching (on job APPROVED)
- [ ] Interview copilot /employer/interviews/[id]/live
- [ ] Reference checks (referee email + token + form)
- [ ] Skills verification tests (browser quiz + AI score)
- [ ] Bias detector hook on job submit
- [ ] Market pulse widget homepage + salary guide
- [ ] Predictive attrition warning on employer dashboard
- [ ] Employer branding enhanced company pages
- [ ] Seeker activity streak + score display
- [ ] Job post voice input (MediaRecorder → Whisper → Haiku)
- [ ] WhatsApp camera scan tab (admin upload)
- [ ] Salary auto-suggest real-time on post-job
- [ ] Duplicate job detector on submit
- [ ] Performance predictor on post-job step 4
- [ ] Arabic translation toggle on post-job + job detail
- [ ] Smart expiry suggestion on deadline field
- [ ] Boost recommender on post-job step 4
- [ ] Job templates (load + save + global templates)
- [ ] AI inline autocomplete on title + Tiptap description

## PHASE 9 — PWA + Performance
- [ ] manifest.json (theme #2a9aa4, all icon sizes, shortcuts)
- [ ] Service worker (offline cache + background sync)
- [ ] next/font for Sora + DM Sans (remove CDN calls)
- [ ] next/image on all images (no raw img tags)
- [ ] Core Web Vitals: LCP<2.5s, INP<200ms, CLS<0.1

## PHASE 10 — BullMQ Workers
- [ ] job-alerts-worker (semantic match + digest)
- [ ] ai-scoring-worker (match + fraud on apply)
- [ ] typesense-sync-worker (index on job change)
- [ ] video-processing-worker (transcribe + score)
- [ ] backup-worker (pg_dump → R2 at 2am)
- [ ] cv-cleanup-worker (delete R2 CVs 90d)
- [ ] trending-skills-worker (weekly Monday)
- [ ] agentic-worker (every 2h active agents)
- [ ] proactive-match-worker (on job APPROVED)
- [ ] market-pulse-worker (Monday 6am)
- [ ] attrition-worker (on new job post)
- [ ] reference-check-worker (on SHORTLISTED)
- [ ] response-time-worker (nightly recalculate)
- [ ] event-reminder-worker (24h + 1h before)
- [ ] bias-scan-worker (on job submitted)

## PHASE 11 — Deployment Files
- [ ] .github/workflows/deploy.yml verified correct
- [ ] ecosystem.config.js verified correct
- [ ] nginx.conf (SSL + proxy + security headers + gzip)
- [ ] .env.example (all 25+ vars documented)
- [ ] README.md (setup + deploy guide)
- [ ] scripts/setup-vps.sh verified correct
- [ ] deploy.bat verified correct

## FINAL VERIFICATION
- [ ] npm run build passes zero errors
- [ ] npx tsc --noEmit passes
- [ ] All pages load (no blank pages)
- [ ] Homepage counters show real numbers
- [ ] Job apply flow works end to end
- [ ] Employer post → admin queue → approve → live
- [ ] Mobile layout at 390px
- [ ] No console errors
- [ ] Lighthouse > 90 all metrics
- [ ] sitemap.xml includes live jobs
- [ ] JSON-LD valid (Google Rich Results Test)
