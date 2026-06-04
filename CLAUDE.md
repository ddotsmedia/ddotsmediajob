# DdotsMediaJobs — Claude Code Master Build File
# Read FULLY before starting. Build everything autonomously.
# No questions. No stopping. Fix errors and continue.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Site: ddotsmediajobs.com (LIVE — never break it)
Repo: https://github.com/ddotsmedia/jobportalwebsite.git
VPS: root@194.164.151.202:22
Deploy: git push → GitHub Actions → auto deploy
VPS path: /var/www/ddotsmediajobs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--teal:#2a9aa4  --teal-dark:#1d7a82  --teal-light:#e0f5f7
--navy:#0f172a  --yellow:#F5C842  --orange:#E8622A
--green:#8DC63F  --whatsapp:#25D366
Logo: 4 circles (yellow/orange/green/yellow) in 2x2 grid
      inside white rounded "D" outline
Wordmark: "DDOTS MEDIA" wide-tracked white caps
Fonts: Sora (headings) + DM Sans (body) via next/font

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STACK — NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next.js 15.5.18+ App Router + TypeScript strict (no any)
Tailwind v4 + shadcn/ui + Magic UI (hero/landing only)
Auth.js v5 — Google OAuth + email/password
tRPC v11 + Drizzle ORM + PostgreSQL 16
Typesense (search) + Redis 7 + BullMQ (queues)
Resend + React Email (transactional email)
Cloudflare R2 (file storage — CVs, logos, videos)
Claude API: claude-haiku-4-5 (simple) claude-sonnet-4-6 (reasoning)
PM2 + Nginx — NO DOCKER EVER
GitHub Actions CI/CD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTONOMOUS BUILD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Never ask questions — decide and proceed
2. Check existing code before writing — never duplicate
3. Improve existing files — never delete working code
4. Run npm run build after every major feature
5. Fix ALL TypeScript errors before moving on
6. git add -A && git commit -m "feat: X" after each feature
7. git push origin main every 5 commits
8. If package fails, try alternative
9. Write code directly — no explanations in output
10. VPS commands: SSH only for setup, not deploys
11. All uploads to R2 — never write to VPS disk
12. Salary optional on job posts — if omitted, mark salaryHidden ("Apply to see salary"); never block publish on missing salary
13. Every AI call wraps user content: <user_content>{text}</user_content>
14. Validate all Claude API responses with Zod before DB write

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create .env.local with all of these (ask user for values if missing):

DATABASE_URL=postgresql://ddotsjobs:PASSWORD@localhost:5432/ddotsjobs
NEXTAUTH_URL=https://ddotsmediajobs.com
AUTH_SECRET=                          # openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
RESEND_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ddotsjobs-files
R2_PUBLIC_URL=https://files.ddotsmediajobs.com
R2_BACKUP_BUCKET=ddotsjobs-backups
ANTHROPIC_API_KEY=
REDIS_URL=redis://:PASSWORD@localhost:6379
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
NEXT_PUBLIC_SITE_URL=https://ddotsmediajobs.com
SENTRY_DSN=
BACKUP_ENCRYPTION_KEY=                # openssl rand -base64 32

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE — DRIZZLE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ensure all tables exist (create/alter as needed, never drop):

users(id uuid pk, email unique, passwordHash, role, googleId,
  emailVerified, createdAt, updatedAt)

jobseeker_profiles(userId fk, firstName, lastName, photo, headline,
  bio, skills[], emirate, visaStatus, nationality, salaryExpected,
  cvUrl, profileScore, completionPercent, activityScore, loginStreak)

employer_profiles(userId fk, companyName, logo, description, emirate,
  website, phone, whatsapp, verified, tradeNumber, employeeCount,
  responseRate, responseDays)

jobs(id uuid pk, slug unique, title, description, requirements,
  benefits[], tags[], categorySlug, jobType, emirate, area,
  salaryMin, salaryMax NOT NULL, currency default AED,
  visaProvided, accommodationProvided, freshersWelcome, remote,
  urgent, featured, status PENDING|APPROVED|REJECTED|EXPIRED,
  freeZone, isAnonymous, deadline, vacancies, viewCount,
  applyCount, employerId fk, aiScamScore, createdAt)

applications(id uuid pk, jobId fk, jobseekerId fk nullable,
  guestName, guestEmail, guestPhone, cvUrl, coverNote,
  status SUBMITTED|VIEWED|SHORTLISTED|REJECTED|HIRED,
  aiScore, aiSummary, aiFraudScore, aiFraudFlags[],
  videoUrl, aiTranscript, notes, rating, createdAt)

saved_jobs(id, jobseekerId fk, jobId fk, createdAt)

job_alerts(id, email, keywords, categorySlug, emirate, jobType,
  salaryMin, frequency daily|weekly, active, lastSentAt, jobseekerId?)

companies(id, slug, name, logo, description, emirate, website,
  size, industry, verified, employerId fk)

company_reviews(id, companyId fk, authorId fk, rating 1-5,
  title, pros, cons, anonymous, createdAt)

blog_posts(id, slug, title, excerpt, content, coverImage,
  tags[], published, readTime, viewCount, authorId, createdAt)

whatsapp_groups(id, name, categorySlug, emirate, inviteLink,
  memberCount, jobsToday, active, sortOrder)

salary_reports(id, title, categorySlug, emirate, experience,
  salaryMin, salaryMax, salaryAvg, demand, updatedAt)

community_posts(id, title, body, authorId fk, categorySlug,
  votes, views, pinned, createdAt)

community_comments(id, postId fk, authorId fk, body, votes, createdAt)

video_interviews(id, jobId fk, employerId fk, questions[],
  timeLimits[], status, shareToken unique, createdAt)

video_responses(id, interviewId fk, applicantEmail, videoUrl,
  aiScore, aiTranscript, aiSentiment, aiSummary, perQuestionScores[],
  createdAt)

skill_assessments(id, title, categorySlug, questions[], timeLimit,
  badgeName, badgeColor, active)

assessment_results(id, assessmentId fk, userId fk, score,
  passed, completedAt)

notifications(id, userId fk, type, title, body, read, link, createdAt)

audit_logs(id, adminId fk, action, targetType, targetId,
  before jsonb, after jsonb, ip, userAgent, createdAt)
-- NO DELETE ever on audit_logs

site_settings(key pk, value, updatedAt)

direct_messages(id, senderId fk, receiverId fk, jobId fk nullable,
  body, read, createdAt)

seeker_activity(userId fk pk, loginStreak, lastLogin, activityScore,
  totalApplications, savedJobs, alertsCreated, updatedAt)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BULLMQ WORKERS (server/workers/)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build all workers in server/workers/, start via npm run workers:

job-alerts-worker.ts
  Trigger: new job approved
  Action: semantic match against active alerts (Claude Haiku)
  Only send if matchScore > 60
  Queue: daily + weekly digest emails via Resend

ai-scoring-worker.ts
  Trigger: new application submitted
  Action: aiMatchScore + aiFraudDetection in parallel
  Store results in applications.aiScore + aiFraudScore

typesense-sync-worker.ts
  Trigger: job created/updated/deleted
  Action: upsert/delete in Typesense jobs index

video-processing-worker.ts
  Trigger: video response uploaded to R2
  Action: transcribe (AssemblyAI or Whisper) → score with Sonnet

backup-worker.ts
  Trigger: cron 0 2 * * *
  Action: pg_dump | gzip | upload to R2_BACKUP_BUCKET

cv-cleanup-worker.ts
  Trigger: cron 0 3 * * *
  Action: delete R2 CVs where application.updatedAt > 90 days
          AND status IN (REJECTED, EXPIRED)

trending-skills-worker.ts
  Trigger: cron 0 4 * * 1 (weekly Monday)
  Action: analyse job descriptions → extract trending skills per category

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REACT EMAIL TEMPLATES (server/email/templates/)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build all with brand colors (teal #2a9aa4, navy #0f172a):
welcome-seeker.tsx, welcome-employer.tsx
apply-confirmation.tsx, employer-new-application.tsx
job-approved.tsx, job-alert-digest.tsx
reset-password.tsx, otp-verify.tsx
direct-message-notification.tsx, video-response-received.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUILD PHASES — FOLLOW ORDER EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PHASE 0 — IMMEDIATE FIXES (deploy first)
- Upgrade: npm install next@15.5.18 react@19 react-dom@19
- Fix homepage stat counters: connect to DB count queries
- Add JSON-LD to homepage: Organization + WebSite+SearchAction
- Add JobPosting JSON-LD to /job/[slug]
- Add robots.txt (allow public, disallow /admin /employer /jobseeker /api)
- Verify sitemap.xml includes all live jobs + all static pages
- Add security headers to next.config.js:
    X-Content-Type-Options, X-Frame-Options, HSTS,
    Referrer-Policy, Permissions-Policy, CSP with nonce
- Commit + push → deploy

## PHASE 1 — MISSING PUBLIC PAGES
- /jobs/blue-visa — Blue Visa eligible roles (SSG)
- /jobs/emiratization — UAE Nationals jobs (SSG)
- /jobs/remote — Remote jobs (SSG)
- /jobs/visa-provided — Visa-sponsored jobs (SSG)
- /assessments — Skill assessment centre (browse + leaderboard)
- Dynamic OG images: /api/og for job detail + blog posts (next/og)
- Add applicant count to all job cards ("142 applied")
- Add "Salary shown" badge vs "Apply to see" badge on job cards
- Commit + push

## PHASE 2 — JOBSEEKER DASHBOARD
Complete all pages:
- /jobseeker/profile: photo→R2, all sections, live completion %
- /jobseeker/applications: history + Kanban view
- /jobseeker/saved: grid with remove/apply
- /jobseeker/alerts: list + create modal + frequency toggle
- /jobseeker/cv-builder: 3 templates + PDF + ATS score tab
- /jobseeker/assessments: take quiz, earn badge, view results
- /jobseeker/career-tools: all AI features UI (tabs)
- /jobseeker/messages: inbox + conversation thread
- Add to dashboard:
    ActivityStreakCard (login streak + score)
    30-sec video pitch (MediaRecorder → R2)
    AI match score on recommended job cards
- Commit + push

## PHASE 3 — EMPLOYER DASHBOARD
Complete all pages:
- /employer/applications: @dnd-kit Kanban, AI score badge,
    fraud flag icon, video intro player, bulk actions, CSV export
- /employer/candidates: CV search + AI match scores
- /employer/analytics: recharts (bar, line, donut)
- /employer/video-interviews: create questions + view responses
    + AI transcript + sentiment + score display
- /employer/ai-tools: UI for all employer AI features (tabs)
- /employer/team: invite sub-accounts + roles
- /employer/messages: inbox + conversations
- /employer/nafis-dashboard: quota tracker + subsidy calculator
- Add response rate badge to company cards
- Commit + push

## PHASE 4 — ADMIN PANEL
Complete all pages:
- /admin/jobs/add: 6-tab upload UI
    Tab 1 QUICK PASTE: textarea → AI extract → review form → publish
    Tab 2 WHATSAPP IMPORT: show drafts from webhook + review
    Tab 3 CSV UPLOAD: papaparse client-side + preview table + bulk publish
    Tab 4 QUICK FORM: title+emirate+whatsapp → AI generate → review
    Tab 5 URL IMPORT: paste URL → server scrape → AI extract → review
    Tab 6 MANUAL: full form, status=APPROVED immediately
    Shared review form: all fields editable before publish
    Action bar: Publish Now | Save Draft | WA Blast | Discard
- /admin/jobs/drafts: table of DRAFT jobs by source
- /admin/assessments: create/edit quizzes + questions + badges
- /admin/audit-logs: immutable log viewer with filters
- Add AI scam score badge on approval queue rows
- Add AI seeker behaviour insights widget to dashboard
- Commit + push

## PHASE 5 — ALL 32 AI FEATURES
Build in server/trpc/ai.router.ts
Rate limit: 50 AI calls/hour per user (Redis counter)
Wrap ALL user input: <user_content>{sanitized}</user_content>
Validate ALL responses with Zod before use

HAIKU features (fast + cheap):
1.  extractJobFromText(text) → JobDraft + confidenceMap
8.  profileCoach(profile, targetRole) → gaps+suggestions
14. socialPostGenerator(jobData) → linkedin+instagram+whatsapp
16. coverLetterGenerator(profile, jd, tone) → letter+subject
19. resumeBulletRewriter(bullet, targetJob) → 3 rewrites
20. jobTitleNormaliser(title) → MOHREtitle+category
21. salaryBenchmark(title, emirate, salary) → market comparison
23. offerLetterDrafter(candidate, role, salary) → DOCX via docx npm
24. candidateOutreach(candidate, job) → personalised message
25. rejectionMessage(jobTitle, reason) → professional message
29. abTestJobDescription(jd) → 2 variants
31. jobVoiceover → browser SpeechSynthesis API (no Claude needed)

SONNET features (reasoning):
2.  jobMatchScore(seekerProfile, jobId) → score+reasons+missing
3.  cvAtsAnalyzer(cvText) → score+gaps+improvements+rewrite
4.  careerAdvisor(history[], profile) → streaming UAE chat
5.  interviewPrep(jobTitle, jd, level) → 10 Q+A+frameworks
6.  videoInterviewScore(transcript, requirements) → scores+summary
7.  salaryCoach(role, emirate, exp, offer) → range+script+tips
9.  hrChatbot(question, companyCtx) → streaming UAE law answer
10. cvFraudDetection(cvText, appId) → score+flags
11. trendingSkills(categorySlug) → skills+demand (weekly cron)
12. smartAlertMatch(job, alerts[]) → semanticScore
13. emiratizationAssistant(size, nationals) → compliance+plan
15. skillGapAnalyzer(seekerSkills, jobId) → matched+missing+courses
17. candidateRanking(jobId, apps[]) → ranked+scores (batch BullMQ)
18. whatsappJobBot(message) → matched jobs WA formatted
22. interviewQuestionBank(title, reqs) → 20 Q+rubrics
26. companyCultureAnalyser(jds[], reviews[]) → culture summary
27. careerPathPredictor(role, exp, emirate) → 3 steps+salary
28. jobScamDetector(listing) → score+flags (pre-approval hook)
30. seekerBehaviourInsights(logs[]) → weekly admin digest
32. videoSentimentAnalysis(transcript) → sentiment+confidence+clarity

- Commit + push

## PHASE 6 — SECURITY
Implement all:

AUTH SECURITY:
- Redis rate limiter middleware:
    /api/auth/signin: 5/15min per IP → 1hr block
    /api/auth/forgot-password: 3/hour per IP
    /api/trpc/ai.*: 50/hour per user
- Password: min 10 chars, 1 upper, 1 number, 1 symbol
- HaveIBeenPwned check on register (k-anonymity SHA1 prefix)
- Block top-10k common passwords (load list at startup)
- TOTP 2FA mandatory for ADMIN/SUB_ADMIN (otplib):
    Setup: QR code + 10 backup codes (bcrypt hashed)
    Enforce on every admin login
- Session rotation after: password change, email verify, role change

AUTHORISATION:
- Ownership middleware: every tRPC query checks userId === ownerId
- Applied to: jobs, applications, saved_jobs, video_interviews,
    direct_messages, profiles
- Double-check roles at tRPC layer (not just Next.js middleware)
- Zod .strict() on all update schemas
- Strip from update schemas: id, status, employerId, createdAt,
    featured, verified, aiScore, viewCount, applyCount

INPUT VALIDATION:
- isomorphic-dompurify on ALL Tiptap HTML before DB write
    Whitelist: p,ul,ol,li,strong,em,h2,h3,h4,a[href],br
    Strip: script,iframe,style,object,embed,on*
- MIME type check (file-type npm) on all uploads:
    CVs: pdf,doc,docx only | Videos: mp4,webm only
    Images: jpeg,png,webp only
    Max: CV=5MB, video=50MB, image=2MB

FILE UPLOADS:
- ClamAV scan before R2 write (clamav npm package)
- Store R2 object keys in DB (not full URLs)
- Generate presigned URLs on-demand, 1hr expiry
- Check ownership before generating URL

SSRF (URL Import):
- Allow https:// only
- Block private IPs: 10.x, 172.16.x, 192.168.x, 127.x, 169.254.x
- No redirect following
- Timeout 5s, max response 1MB

WEBHOOKS:
- Twilio: validate signature on all WhatsApp endpoints
- Return 403 immediately if invalid

DATA PRIVACY:
- Consent checkbox on register
- Delete account: soft delete → hard delete PII after 30 days
- Auto-delete R2 CVs 90 days after rejection (cv-cleanup-worker)
- /privacy page explaining data use + retention

FORGOT PASSWORD:
- Always return: "If this email exists you'll receive a reset link"
  (never reveal whether email found)

OPEN REDIRECT:
- callbackUrl: same-origin only (starts with / not //)

EMAIL ENUMERATION:
- Same response whether email exists or not

AUDIT LOGS:
- Every admin action → audit_logs (no DELETE allowed on this table)

- Commit + push

## PHASE 7 — ENGAGEMENT FEATURES
- Gamified skill assessments:
    Timed quizzes (10 questions, 60s each)
    Pass = earn badge → show on profile
    Employer can filter candidates by verified badges
    Leaderboard: top 10 this week per category
- Activity streak card:
    Daily login streak (reset if miss a day)
    Activity score: logins(1pt) + applies(3pt) + profile(5pt)
    Higher score = priority in employer candidate search
- Employer response rate badge:
    Calculate: responses_within_7_days / total_applications
    Labels: "Responds within 3 days" / "High response rate" / none
    Shown on company cards + job detail sidebar
- Anonymous salary leaderboard on /salary-guide:
    "47 people reported AED 8K-14K for this role"
    Anonymous submission form
- Anonymous job posting:
    isAnonymous toggle on post-job
    Show "Confidential Company — [Industry], [Emirate]"
    Reveal company name only after status=SHORTLISTED
- Direct messaging (unlock after shortlist):
    Employer shortlists → both parties see "Message" button
    In-platform thread, no personal contact exposed
    Email notification on new message
- Interview time-zone scheduler:
    Employer sets slots in UAE time (Asia/Dubai)
    Seeker sees converted to their profile timezone
- Multi-language CV parser:
    On CV upload → Claude Haiku extracts structured data
    Supports: English, Arabic, Tagalog, Hindi, Urdu
    Auto-populates jobseeker profile fields
- Accessibility mode:
    High contrast toggle (localStorage)
    Font size +/- buttons
    All interactive elements: aria-label, role, tabIndex
- Salary transparency badge:
    Jobs with salary shown: green "Salary disclosed" badge
    Jobs without: gray badge (still allowed but visually different)
    Track % of jobs with disclosed salary in admin analytics
- Commit + push

## PHASE 8 — PWA + PERFORMANCE
- manifest.json:
    name: "DdotsMediaJobs", short_name: "DdotsJobs"
    theme_color: #2a9aa4, background_color: #0f172a
    display: standalone
    icons: 72,96,128,144,152,192,384,512px
    shortcuts: Jobs, Post Job, WhatsApp Groups, My Dashboard
- Service worker (sw.js):
    Cache: homepage, jobs listing, salary guide, WA groups
    Offline fallback page
    Background sync for applications submitted offline
- next/font for Sora + DM Sans (remove Google Fonts CDN)
- next/image on ALL images (no raw <img> tags)
- Core Web Vitals targets:
    LCP < 2.5s (preload hero image, SSR)
    INP < 200ms (no blocking JS)
    CLS < 0.1 (reserve space for images)
- Commit + push

## PHASE 9 — DEPLOYMENT FILES
Create/update:
- .github/workflows/deploy.yml (already created — verify correct)
- ecosystem.config.js (already created — verify correct)
- nginx.conf (SSL + proxy + security headers + gzip)
- .env.example (all 25+ vars with descriptions)
- README.md:
    Setup steps, env vars, deploy instructions,
    VPS setup (point to setup-vps.sh), dev workflow
- scripts/setup-vps.sh (already created — verify correct)
- deploy.bat (already created — verify correct)
- Commit + push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL VERIFICATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After all phases complete, verify:
[ ] npm run build passes with zero errors
[ ] TypeScript: npx tsc --noEmit passes
[ ] All pages load in browser (no blank pages)
[ ] Homepage stat counters show real numbers
[ ] Job apply flow works end to end
[ ] Employer post job → appears in admin queue
[ ] Admin approves → job live on site
[ ] AI features return valid responses
[ ] Mobile layout works at 390px
[ ] No console errors in browser
[ ] Lighthouse score > 90 on all metrics
[ ] sitemap.xml accessible + includes live jobs
[ ] robots.txt accessible
[ ] JSON-LD valid (test with Google Rich Results Test)
