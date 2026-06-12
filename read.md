# Mastery Leadership Readiness — Phase 1 Status

**Last verified:** 2026-06-12
**Phase:** MVP scaffold complete, AI judge running as deterministic stub (no live API).
**Next phase owner:** swap stub for live Lovable AI Gateway call + production polish.

---

## ✅ What's working (verified)

### Database (Lovable Cloud / Postgres)
- All 8 tables present: `profiles`, `scenarios`, `assessments`, `results`, `digital_twins`, `personality_profiles`, `characters`, `events`.
- `leadership_role` enum with 6 PRD roles.
- 12 scenarios seeded — 2 per role (engineering_manager, team_lead, project_manager, hr_manager, operations_manager, teacher).
- RLS enabled on all user tables; `scenarios` readable by authenticated; `results` writes only via `supabaseAdmin` inside server fn.
- `auth.users` insert trigger → `profiles` row.
- Blueprint scaffold tables (`digital_twins`, `personality_profiles`, `characters`, `events`) exist with restricted grants — **no MVP UI writes yet**.

### AI Judge Engine — `src/lib/ai-judge.server.ts`
- Deterministic local stub. **Not wired to any live AI API.**
- Implements all 4 Blueprint engines in one function `scoreResponse({ role, scenarioPrompt, response })`:
  1. **Leadership Signal Engine** — keyword regex buckets per competency.
  2. **Competency Growth Logic** — signals → 0–100 sub-scores with hash-stable jitter.
  3. **Reflection Engine** — top-2 strengths, bottom-2 missed + suggestions from templates.
  4. **Outcome Projection** — `trust_30d / team_morale_90d / promotion_readiness_365d` deltas scaled by readiness.
- PRD readiness formula applied verbatim:
  `readiness = empathy*0.20 + accountability*0.20 + coaching*0.25 + clarity*0.15 + psychological_safety*0.20`
- Smoke-tested with short + rich responses → produces distinct, sensible scores (36 vs 65).

### Server functions — `src/lib/assessments.functions.ts`
All protected by `requireSupabaseAuth`:
- `startAssessment({ role })` → picks random scenario, creates assessment, returns id.
- `getAssessment({ id })` — for the scenario screen.
- `submitResponse({ id, response })` — runs judge, writes result, marks assessment `scored`.
- `getAssessmentWithResult({ id })` — for the report.
- `listMyAssessments()` — dashboard history.

### Routes & UI
- `/` Landing — hero, 5 competencies card, CTA. Renders cleanly (verified in preview).
- `/auth` — email + Google sign-in.
- `/app` (protected) — dashboard + history.
- `/app/assess` — role selection (6 cards).
- `/app/assess/$assessmentId` — scenario prompt + textarea.
- `/app/results/$assessmentId` — readiness gauge, 5 competency bars, reflection panel, outcome projection.
- Protected gate: `src/routes/_authenticated/route.tsx` redirects to `/auth` if no session.
- `attachSupabaseAuth` registered in `src/start.ts` global functionMiddleware.
- Design system: warm off-white bg, deep-indigo accent, serif headings, minimalist per PRD.

### Build health
- `tsc --noEmit` → **0 errors.**
- Migrations apply cleanly.
- No console errors on landing page.

---

## ⚠️ What's stubbed / pending live wire-up

| Area | Current | Next step |
| --- | --- | --- |
| AI Judge | Deterministic local function | Replace `scoreResponse` body with Lovable AI Gateway call returning same shape — zero caller changes. |
| Digital Twin updates | Tables exist, no writes | Wire `submitResponse` to update `digital_twins` per user after scoring. |
| Personality profiles | Tables exist, no UI | Add intake flow (Big Five). |
| Characters / events (Blueprint sim layer) | Tables exist, no UI | Out of MVP scope. |
| Email templates / branded auth emails | Default Supabase | Customize when going live. |
| SEO | Per-route head() basics | Add og:image for share previews. |

---

## 🧪 Manual QA checklist for next agent

Before touching live AI, run through:

1. Sign up via `/auth` (email).
2. Land on `/app` — empty dashboard, "Start new" visible.
3. Pick role → scenario loads.
4. Submit a **short** answer (~30 chars) → readiness should be low (~30–45).
5. Submit a **rich** answer with empathy + accountability + coaching language → readiness should be 60+.
6. Report shows: gauge, 5 bars, 2 strengths, 2 dev areas, 2 suggestions, coaching paragraph, outcome projection 30/90/365.
7. Back to `/app` — history row shows readiness score.
8. Verify RLS: second user cannot see first user's assessments (test by signing in with different account).

---

## 🔌 Where to swap in live AI (single point)

`src/lib/ai-judge.server.ts` → replace the body of `scoreResponse()`.
- Input shape: `{ role, scenarioPrompt, response }`
- Required return shape: `JudgeResult` (exported from same file).
- Recommended: use Lovable AI Gateway (`@/integrations/lovable`) — no API key needed.
- Keep the readiness formula server-side (do not trust model output for the weighted sum — recompute).

---

## 📂 Key files

- `src/lib/ai-judge.server.ts` — judge stub
- `src/lib/assessments.functions.ts` — server fns
- `src/routes/_authenticated/` — protected app routes
- `supabase/migrations/2026061121*.sql` — schema + seed
- `.lovable/plan.md` — full architecture plan
