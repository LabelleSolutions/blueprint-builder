# Mastery Leadership Readiness — MVP Plan (PRD + Blueprint)

Applying the **exact PRD scope** for what ships, and the **exact Blueprint schemas / logic shapes** so the foundation is ready for future engines (Digital Twin, Reflection, Outcome Projection) without building them yet. Per your last note, the AI judge will run as a **deterministic local stub** — no live AI calls yet.

## What ships now (PRD "Build Now")
Role Selection → Scenario Assessment → AI Judge Engine → Readiness Scoring → Development Report.

## What is scaffolded but not active (PRD "Do Not Build Yet")
Tables for `digital_twins`, `personality_profiles`, `characters`, `events` exist (per Blueprint) but no UI / no writes from MVP flows. Reflection Engine + Outcome Projection JSON shapes are the *return shape* of the report generator, so we already produce them — they just aren't surfaced as separate features yet.

## Stack mapping
PRD says Next.js + Supabase. This project = **TanStack Start** (our full-stack React equivalent) + **Lovable Cloud** (managed Postgres + auth) + Tailwind + shadcn/ui. Auth = email/password + Google (Lovable-managed). All writes go through `requireSupabaseAuth` server functions.

## User journey
1. `/` Landing — value prop, 5 competencies, "Start assessment" CTA.
2. `/auth` — email + Google.
3. `/app` (protected) — dashboard: "Start new" + history list (role, readiness, date).
4. `/app/assess` — pick one of 6 PRD roles → server creates assessment + loads scenario.
5. `/app/assess/$assessmentId` — scenario prompt + textarea, submit → stub judge scores server-side → redirect.
6. `/app/results/$assessmentId` — Readiness gauge, 5 competency bars, strengths, missed/development areas, coaching suggestions.

Public: `/`, `/auth`. Everything else under `_authenticated/`.

## Database schema — exact tables from both docs

```sql
-- PRD roles
create type public.leadership_role as enum (
  'engineering_manager','team_lead','project_manager',
  'hr_manager','operations_manager','teacher'
);

-- PRD: users (we use auth.users + optional profile for name/industry/role from Blueprint)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  industry text,
  role text,
  created_at timestamptz not null default now()
);

-- PRD: scenarios
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  role public.leadership_role not null,
  title text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

-- PRD: assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.leadership_role not null,
  scenario_id uuid not null references public.scenarios(id),
  response text,
  status text not null default 'in_progress',  -- in_progress | scored | failed
  created_at timestamptz not null default now()
);
create index assessments_user_idx on public.assessments(user_id, created_at desc);

-- PRD: results — 5 PRD competencies + readiness + Reflection-Engine shape
create table public.results (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  empathy int not null check (empathy between 0 and 100),
  accountability int not null check (accountability between 0 and 100),
  coaching int not null check (coaching between 0 and 100),
  clarity int not null check (clarity between 0 and 100),
  psychological_safety int not null check (psychological_safety between 0 and 100),
  readiness_score numeric(5,2) not null,
  strengths text[] not null,        -- Reflection Engine
  missed text[] not null,           -- Reflection Engine
  suggestions text[] not null,      -- Reflection Engine
  coaching_feedback text not null,
  outcome_projection jsonb not null, -- {trust_30d, team_morale_90d, promotion_readiness_365d}
  created_at timestamptz not null default now()
);

-- Blueprint foundation tables (scaffolded, not used by MVP UI)
create table public.digital_twins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  communication_score int, empathy_score int, coaching_score int,
  delegation_score int, strategic_score int, conflict_score int,
  resilience_score int, overall_score int,
  updated_at timestamptz not null default now()
);

create table public.personality_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openness numeric, conscientiousness numeric, extraversion numeric,
  agreeableness numeric, neuroticism numeric
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text, role text,
  trust int, motivation int, burnout int, influence int, loyalty int,
  personality_json jsonb
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  event_type text,
  severity int,
  payload jsonb,
  created_at timestamptz not null default now()
);
```

**Grants + RLS**
- `scenarios`: `GRANT SELECT TO authenticated`; policy `SELECT USING (true)`.
- `profiles`, `assessments`, `digital_twins`, `personality_profiles`: `GRANT SELECT, INSERT, UPDATE TO authenticated`; all policies `auth.uid() = user_id`.
- `results`: `GRANT SELECT TO authenticated`; read policy joins to parent assessment; writes via `supabaseAdmin` inside server fn.
- `characters`, `events`: `GRANT ALL TO service_role` only (no MVP user access).
- `GRANT ALL ON ALL ... TO service_role`.
- Migration seeds 12 scenarios (2 per PRD role).
- Trigger on `auth.users` insert → create `profiles` row.

## Readiness formula (PRD verbatim, server-side)
`readiness = empathy*0.20 + accountability*0.20 + coaching*0.25 + clarity*0.15 + psychological_safety*0.20`

## AI Judge (stub, swap-point for live later)
File: `src/lib/ai-judge.server.ts` — single function `scoreResponse({ role, scenarioPrompt, response })`.

Stub behavior, mirroring the Blueprint's engines:
- **Leadership Signal Engine** — derives signal weights `{empathy, coaching, clarity, accountability, psychological_safety}` from response length + keyword buckets (e.g. "I feel/understand" → empathy, "next step/follow up" → accountability, "what do you think/help you" → coaching, "by Friday/specifically" → clarity, "safe/no blame" → psychological_safety).
- **Competency Growth Logic** — converts signals to 0–100 sub-scores using the Blueprint's increment pattern, with a deterministic baseline + hash for stability.
- **Reflection Engine** — returns `{ strengths[], missed[], suggestions[] }` based on top/bottom sub-scores using per-competency templates.
- **Outcome Projection** — returns `{ trust_30d, team_morale_90d, promotion_readiness_365d }` using the Blueprint's `+10 / +5 / +12` deltas scaled by readiness.
- **Coaching feedback** — composed paragraph per role + top development area.

Swapping to live = replace this function's body with a Lovable AI Gateway call returning the same shape, zero caller changes.

## Architecture

```text
src/routes/
  index.tsx                       Landing
  auth.tsx                        Email + Google
  _authenticated/
    route.tsx                     Managed gate
    app.tsx                       Header + Outlet
    app.index.tsx                 Dashboard
    app.assess.index.tsx          Role selection (6 PRD roles)
    app.assess.$assessmentId.tsx  Scenario screen
    app.results.$assessmentId.tsx Report (gauge, bars, reflection, projection)

src/lib/
  assessments.functions.ts        startAssessment, submitResponse,
                                  getAssessmentWithResult, listMyAssessments
  ai-judge.server.ts              Stub judge implementing the three engines

src/components/assessment/
  RoleCard, ScenarioForm, ReadinessGauge, CompetencyBar,
  ReflectionPanel, OutcomeProjectionPanel, ReportCard
```

## Design direction
Clean minimalist per PRD: warm off-white background, single deep-indigo accent, serif headings + clean sans body, generous spacing, one bold gauge ring, semi-transparent accent bars. Mobile-first.

## Build order (after approval)
1. Enable Lovable Cloud + Google provider.
2. One migration: enums, all tables (PRD + Blueprint scaffolds), grants, RLS, profile trigger, seed scenarios.
3. `ai-judge.server.ts` stub + `assessments.functions.ts`.
4. Auth page + protected layout.
5. Routes & UI (loader `ensureQueryData` + `useSuspenseQuery`).
6. Polish: SEO heads, loading/empty/error states, toasts.

Say go and I'll switch to build mode.
