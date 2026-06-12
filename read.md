# Mastery Leadership Readiness — Phase 2 Status

**Last verified:** 2026-06-12
**Phase:** Config-driven refactor complete. Single AI provider swap-point in place.
**Stub provider:** deterministic local (`mock-deterministic`). No live model wired yet.

---

## 📄 Source documents

1. **Mastery_Loveable_Agent_Handoff_v1.pdf** — refactor spec. Config-driven competencies / roles / scenarios; isolated Judge Engine; explainability per score; readiness derived (not a competency); mobile-first; users / roles / scenarios / assessments / results tables.
2. **Leadership_Digital_Twin_Code_Blueprint.pdf** — full platform blueprint (digital twins, characters, events, simulation). **Out of MVP scope.** Foundation tables exist in DB but have no UI writes.

---

## ✅ MVP Scope (built)

Landing → Role Selection → Scenario → Response → Judge Engine → Competency Scoring → Readiness Report.

Nothing else. No dashboards beyond a thin history list, no gamification, no digital twin UI, no simulation engine.

---

## 🏗 Architecture — config-driven

All domain knowledge lives in `src/config/*`. Adding a competency, role, or rebalancing weights touches ONE file, no engine or UI code.

| File | Owns |
| --- | --- |
| `src/config/competencies.ts` | Competency ids, labels, weights, descriptions, behavioural signals (regex), explainability templates (strength / missed / suggestion / coaching focus). |
| `src/config/roles.ts` | Role ids, labels, taglines, target competencies. |
| `supabase` — `scenarios` table | Scenario library (already dynamic; seeded per role). |

Readiness weights sum to 1.0 across the competency config and are consumed by the Readiness Engine — never duplicated in UI or DB.

---

## 🤖 AI Provider abstraction — single swap-point

> Founder ask: "single AI provider interface that allows the platform to switch between Gemini, OpenAI, Claude, or future models without changing any UI, business logic, database schema, assessment workflow, competency engine, or readiness engine."

### Files

| File | Role |
| --- | --- |
| `src/lib/ai/provider.ts` | **Provider interface** — `AIProvider`, `JudgeInput`, `JudgeOutput`, `CompetencyScore` (score + reason + evidence + recommendation). |
| `src/lib/ai/mock-provider.ts` | **Current mock implementation** — deterministic local scorer using competency config. Conforms to `AIProvider`. |
| `src/lib/ai/index.ts` | **The single swap-point.** Re-exports `aiProvider`. Every consumer imports from here. |
| `src/lib/ai-judge.server.ts` | **Judge + Readiness Engine.** Calls `aiProvider.judgeResponse(...)`, computes weighted readiness from competency config, assembles explainability, projection, coaching narrative. Contains zero model strings and zero prompts. |

### Provider interface

```ts
interface AIProvider {
  readonly name: string;
  judgeResponse(input: JudgeInput): Promise<JudgeOutput>;
}

interface CompetencyScore {
  id: string;
  score: number;       // 0–100
  reason: string;
  evidence: string;
  recommendation: string;
}
```

### How to add a new provider (no other file changes)

```ts
// src/lib/ai/gemini-provider.ts
export const geminiProvider: AIProvider = {
  name: "gemini-2.5-flash",
  async judgeResponse({ roleId, scenarioPrompt, response }) {
    const out = await callLovableAIGateway({
      model: "google/gemini-2.5-flash",
      prompt: buildJudgePrompt({ roleId, scenarioPrompt, response }),
    });
    return parseJudgeJSON(out); // must satisfy JudgeOutput
  },
};

// src/lib/ai/index.ts  ← THE ONLY LINE THAT CHANGES
export const aiProvider: AIProvider = geminiProvider;
```

Same shape for OpenAI (`openai/gpt-5-mini`) and Claude (Anthropic SDK). The Readiness Engine **always recomputes** the weighted sum server-side; the model is never trusted for that math.

---

## 🗄 Database

Tables (existing): `profiles`, `roles*`, `scenarios`, `assessments`, `results`.
*Roles are currently a Postgres enum mirroring `src/config/roles.ts`; adding a role = one-line enum migration.*

Future-prep tables already exist (no UI writes): `digital_twins`, `personality_profiles`, `characters`, `events`. PRD also lists `reflection_entries`, `competency_definitions`, `industry_packs` — **not built** (kept in config files for now per "config-driven before tables").

RLS enabled on all user tables. Writes to `results` go through `supabaseAdmin` inside server fn.

---

## ⚠️ Pending (deliberately deferred)

| Area | Why deferred | Next |
| --- | --- | --- |
| Live AI provider | Stub keeps loop deterministic | Replace `aiProvider` export in `src/lib/ai/index.ts`. |
| `explainability` JSONB column on `results` | Computed per scoring run but not persisted yet | Add column + surface per-competency reason/evidence/recommendation on report. |
| Reflection loop (`reflection_score`, `self_assessment`, `self_awareness_gap`) | PRD says prepare, not build | Add fields when reflection feature starts. |
| Industry packs | Out of MVP | Promote `competencies.ts` / `roles.ts` to per-industry packs when needed. |
| Digital Twin / Simulation / Multi-agent | Explicitly out of MVP | Blueprint preserved as reference only. |

---

## 🚫 Red-flag check

| Anti-pattern | Status |
| --- | --- |
| Hardcoded competencies | ✅ Removed — `src/config/competencies.ts` |
| Hardcoded roles | ✅ Removed — `src/config/roles.ts` (DB enum mirrors config) |
| Hardcoded scenarios | ✅ DB-driven (`scenarios` table, seeded) |
| AI prompts in UI | ✅ None — all model interaction behind `aiProvider` |
| Dashboard explosion | ✅ Single thin history list |
| Gamification | ✅ None |
| Digital Twin / Simulation impl | ✅ Tables only; no UI/logic |

---

## 🧪 QA checklist

1. Sign up → `/app` → pick role → short answer (~30 chars) → low readiness.
2. Rich answer with empathy + accountability + coaching language → readiness 60+.
3. Report renders gauge + 5 competency bars + strengths + dev areas + suggestions + coaching paragraph + projection.
4. RLS — second user cannot see first user's assessments.
5. Edit a competency weight in `src/config/competencies.ts` → readiness shifts without touching any other file.

---

## 📂 Key files (Phase 2)

- `src/config/competencies.ts`
- `src/config/roles.ts`
- `src/lib/ai/provider.ts` — interface
- `src/lib/ai/mock-provider.ts` — current impl
- `src/lib/ai/index.ts` — **single swap-point**
- `src/lib/ai-judge.server.ts` — Judge + Readiness Engine (config-driven, provider-agnostic)
- `src/lib/assessments.functions.ts` — server fns
- `src/routes/_authenticated/` — protected app routes
- `supabase/migrations/*` — schema + scenario seed
