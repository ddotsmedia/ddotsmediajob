# Privacy Implementation Gap Analysis (2026)

Compares intended privacy commitments to the actual implementation. **Not legal advice** — items marked *Requires legal review* must go to counsel. The live Privacy Policy text was not diffed here; this maps implementation reality so policy wording can be reconciled to it.

Legend: ✅ Implemented · 🟡 Partial · ❌ Not implemented · ❔ Not verifiable in code · ⚖️ Requires legal review

| Commitment | Status | Evidence / gap |
|---|---|---|
| Capture consent to Terms & Privacy at signup | ✅ | `users.terms_accepted_at/privacy_accepted_at/accepted_*_version` (migration 0050); both register forms require the checkbox |
| Separate marketing consent from legal consent | ✅ | `marketing_opt_in` optional checkbox, distinct from mandatory terms |
| Consent for OAuth signups | ❌ | Google/social users bypass the register form — no consent captured. **Follow-up:** capture at `/onboarding` |
| CV searchable only with consent | 🟡 ⚖️ | Owner decision = **opt-out**: upload auto-sets `cv_searchable=true`; user can disable via profile toggle. Legal should confirm opt-out is defensible under UAE PDPL for CV exposure |
| Minimize personal data sent to AI | 🟡 | `resume-parser`/`ai-provider` send the CV file to Gemini/Anthropic to extract skills/experience — the whole document goes to the provider. No Emirates ID/passport/bank fields are *intentionally* extracted, but the raw CV may contain them |
| No training on candidate data | ❔ ⚖️ | Depends on Gemini/Anthropic API terms (API tier generally excludes training) — verify contractually |
| AI-processing disclosure | ❌ | No explicit "your CV is processed by AI" notice at upload. **Follow-up:** add disclosure line |
| Store AI processing metadata (model/purpose/time) | ✅ | `cv_ai_metrics` (model, tokens, cost, latency, timestamp) — no prompt text stored |
| Retention: auto-delete rejected CVs after 90 days | ❔ | `cv-cleanup-worker` referenced in build spec; verify it runs on the current scheduler |
| Account deletion → PII/file deletion | 🟡 ⚖️ | Soft-delete → hard-delete flow specced; verify R2 CV deletion is triggered on account deletion |
| "If this email exists…" generic reset response | ✅ | `auth.requestPasswordReset` returns generic result |
| Do not expose employer/candidate contact in structured data | ✅ | JSON-LD uses `employerName` (confidential-safe); no personal phone/email in JobPosting schema |
| Reporter identity kept confidential | ✅ | `reports.list` omits reporter; never returned to employers |

## Priority follow-ups
1. **OAuth consent capture** at onboarding (closes the biggest consent gap).
2. **AI-processing disclosure** at CV upload (transparency).
3. **Legal review** of: opt-out CV searchability (PDPL), AI provider training terms, retention/deletion sufficiency.
4. Verify `cv-cleanup-worker` + account-deletion R2 purge actually execute on the live scheduler.
