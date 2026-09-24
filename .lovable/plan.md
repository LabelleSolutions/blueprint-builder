# Admin Studio: edit competencies, roles, weights, scenarios with AI assist

## What you get
- A new **Admin** page (only visible to admins) with four tabs: Competencies, Weights, Roles, Scenarios.
- An **AI assistant panel** on the same page: type an instruction in plain English (e.g. "Make coaching 30% and lower clarity to 10%", "Write a new conflict scenario for Team Leads"). The AI drafts the change, shows a before/after, and you click **Apply** or **Discard**. Nothing changes without your approval.
- A **Live score preview**: pick any past report, and as you edit weights or competencies the readiness score recalculates on screen. Saved reports are never rewritten (per your answer).
- Roles: edit the six existing roles only (label, tagline, focus competencies). No new roles.

## Who can access
Your account becomes the first admin. Admin status is stored securely on the server (separate roles table), not in the browser. Everyone else is blocked from the page and from all admin actions.

## How the app changes
- Competencies, weights, role details and scenarios move from fixed code into the database, so edits apply to **new** assessments immediately.
- The current code values are copied into the database as the starting point, so nothing changes until you edit.
- Weights must total 100%; the editor shows the running total and blocks saving otherwise.
- Every save is recorded (who, when, what changed) so edits can be reviewed.

## Technical details
- **Migration**: `app_role` enum + `user_roles` + `has_role()` (security definer); tables `competencies` (id, label, description, weight, signals text[], templates jsonb, sort, active), `role_profiles` (id leadership_role PK, label, tagline, target_competencies text[]), `config_audit` (actor, entity, before/after jsonb). Scenarios table gains admin INSERT/UPDATE/DELETE policies via `has_role`. GRANTs + RLS on all; read for authenticated, write admin-only. Seed rows from current `src/config/*` in the migration; insert your user into `user_roles` as admin.
- **Config loader** `src/lib/config.server.ts`: `loadCompetencies()` / `loadRoles()` read DB (per-request), fall back to the TS config if empty. Judge engine, gateway provider prompt, mock provider and readiness math take competencies as input instead of importing the constant. Regex signals stored as strings and compiled at load.
- **Server functions** `src/lib/admin.functions.ts` (all `requireSupabaseAuth` + `has_role` check): list/update competencies, bulk-update weights (sum = 1.0 validated with zod), update role profile, CRUD scenarios, `previewRescore({ assessmentId, competencies })` recomputes readiness from the stored per-competency scores with draft weights (no AI call, no write).
- **AI orchestration** `src/lib/admin-assistant.functions.ts`: `openai/gpt-6-astra` via the Responses API (streamed, consumed server-side), strict structured output returning a list of typed proposed operations (`update_competency`, `set_weights`, `update_role`, `create_scenario`, `update_scenario`, `delete_scenario`) with a rationale. The client shows a diff; Apply calls the regular admin server functions, so validation and the audit log apply the same way.
- **Routes**: `src/routes/_authenticated/app.admin.tsx` with tabs; "Admin" link in the header only when `has_role` is true. Results page reads competency labels/weights from the DB config.
- **Verification**: typecheck, migration check, signed-in run: edit a weight, confirm preview changes, confirm saved report unchanged, run an AI instruction and apply it, confirm a non-admin gets blocked.
