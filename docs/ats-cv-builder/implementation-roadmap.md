# ATS CV Builder — Implementation Roadmap

## Current State
- **CV Routes Live:** `/cv-builder`, `/cv-search` (redirect), `/employer/candidates`, `/employer/search-cvs` (now in sidebar)
- **CV Storage:** users.cv_metadata (JSONB), cv_searchable (boolean)
- **Parser:** Gemini Vision API (PDF text extraction, 100% dependency)
- **Search:** AI CV Search page deployed but 0 CVs in DB (empty state)
- **AI APIs:** ANTHROPIC + GEMINI configured
- **Storage:** R2 + UploadThing ready
- **Auth:** Object-level (middleware + FKs)
- **Tests:** None (manual only)

## Phase 0: Parser Reliability
**Goal:** De-risk Gemini 503s, add fallback PDF parsing

- Add `pdf-lib` or `pdfjs` as fallback (local extraction if Gemini fails)
- Implement retry logic (3x exponential backoff)
- Log failures + metrics to cv_ai_metadata.last_error
- Test: Upload PDF, verify text extraction with/without Gemini

**Estimated effort:** 8h
**Risk:** High token cost if all uploads hit Gemini; fallback reduces cost 30%

## Phase 1: Jobseeker CV Onboarding (SMALLEST SAFE MVP)
**Goal:** Let jobseekers upload CVs, auto-parse, populate cv_metadata, enable CV search

**Includes:**
1. Onboarding step: CV upload (file input, UploadThing validation)
2. Auto-parse on upload: Gemini Vision → extract skills, experience, location, education → store cv_metadata
3. Auto-enable search: Set cv_searchable=true (opt-out control deferred to Phase 3)
4. Success feedback: "CV analyzed. X skills detected, Y years experience."
5. Error handling: Graceful fallback if parse fails (store raw file, flag for manual review)

**Leaves unchanged:**
- Employer /employer/candidates (profile-based search, live)
- Employer /employer/search-cvs (AI search, renders empty until CVs exist)
- Sidebar nav (already updated)

**Not included in Phase 1:**
- CV editor (defer to Phase 2)
- Export (defer to Phase 2)
- Job-specific versions (defer to Phase 3)
- AI summary/bullets (defer to Phase 3)

**Estimated effort:** 16h (parser reliability 8h + onboarding UX 8h)
**Risk:** Gemini failures block upload flow; Phase 0 fallback mitigates

**Success criteria:**
- Upload → Gemini parse → cv_metadata populated
- cv_searchable=true set automatically
- /employer/search-cvs shows uploaded CV in results
- Error state handled gracefully

## Phase 2: Employer CV Search + ATS Scoring
**Goal:** Make employer search useful, add deterministic ATS checks

- Full UI: filters (skills, experience, location), sorting, pagination
- ATS score: keyword match (%, deterministic), experience (%, deterministic)
- Analytics: search queries, view logs, application funnel
- Search index: optimize cv_metadata queries (partial text index)

**Estimated effort:** 24h

## Phase 3: AI Assistance + Consent
**Goal:** Add AI-powered features, respect privacy

- CV Editor: structured editing, AI suggestions (summary, bullets)
- WhatsApp Apply: one-tap apply with auto-filled CV
- Job-specific versions: auto-tailor CV to job description
- Consent toggle: "Let employers find my CV" (opt-out control)
- Cover letter generation: AI-assisted

**Estimated effort:** 32h

## Phase 4: Export + Multi-version
**Goal:** Support PDF/DOCX export, immutable versioning

- PDF/DOCX export (use pdf-lib or similar)
- Version history (immutable cv_versions table)
- Rollback to prior version
- Export analytics

**Estimated effort:** 16h

## Risk Register
| Risk | Impact | Phase | Mitigation |
|------|--------|-------|-----------|
| Gemini 503 errors | Upload blocked | 0 | Fallback PDF parser |
| Hallucinated skills | False CV data | 1 | Human review flag + audit trail |
| Empty search (0 CVs) | Adoption stalls | 1 | Early adopter cohort needed |
| High token cost | Budget overrun | 0 | Track token usage per CV |
| Prompt injection | Security breach / data exfiltration | 1 | Wrap CV text in `<user_content>` tags; validate Gemini JSON with Zod before DB write |
| Auto-searchable by default (opt-out, not opt-in) | PDPL/GDPR consent exposure | 1 | Explicit consent toggle (Phase 3); document lawful basis; honor opt-out immediately |

## Notes
- The final risk row (prompt injection) was reconstructed — the original paste was truncated mid-table. The consent row was added to capture the known opt-out-by-default concern.
- Parser currently has **no local fallback** — `pdf-parse`/`pdfjs`/`pdf-lib`/`docx`/`mammoth` are not installed; Gemini Vision is the sole extraction path (Phase 0 addresses this).
