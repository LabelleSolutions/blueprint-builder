/**
 * Judge Engine + Readiness Engine (server-only).
 *
 * Responsibilities:
 *   1. Call the configured AI provider (single swap-point in `./ai/index.ts`)
 *      to obtain per-competency scores + explainability blocks.
 *   2. Compute the weighted Readiness Score from the competency config.
 *      (Readiness is DERIVED, never a competency itself.)
 *   3. Assemble strengths / development areas / suggestions / coaching
 *      narrative / outcome projection from the competency outputs.
 *
 * No model strings, no prompts, no provider SDKs live in this file —
 * those belong inside the `./ai/*` provider implementations.
 */

import { computeReadiness, type RuntimeConfig, type RuntimeCompetency } from "./runtime-config";
import { aiProvider, type CompetencyScore } from "./ai";

export interface JudgeResult {
  // Per-competency scores (flattened for current DB columns).
  empathy: number;
  accountability: number;
  coaching: number;
  clarity: number;
  psychological_safety: number;
  readiness_score: number;
  strengths: string[];
  missed: string[];
  suggestions: string[];
  coaching_feedback: string;
  outcome_projection: {
    trust_30d: number;
    team_morale_90d: number;
    promotion_readiness_365d: number;
  };
  /** Full per-competency explainability blocks (PRD: score+reason+evidence+recommendation). */
  explainability: CompetencyScore[];
}

export interface ScoreInput {
  config: RuntimeConfig;
  role: string;
  scenarioPrompt: string;
  response: string;
}

export async function scoreResponse(input: ScoreInput): Promise<JudgeResult> {
  const comps = input.config.competencies;
  const roleDef = input.config.roles.find((r) => r.id === input.role);
  const def = (id: string): RuntimeCompetency | undefined => comps.find((c) => c.id === id);
  const { competencies, coachingNarrative } = await aiProvider.judgeResponse({
    roleId: input.role,
    role: roleDef,
    competencies: comps,
    scenarioPrompt: input.scenarioPrompt,
    response: input.response,
  });

  // Readiness Engine (server-side, never trust model for the weighted sum).
  const readiness = computeReadiness(competencies, comps);

  // Reflection: top 2 strengths, bottom 2 development areas.
  const ranked = [...competencies].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 2);
  const bottom = ranked.slice(-2);

  const strengths = top.map((c) => def(c.id)?.templates.strength ?? "");
  const missed = bottom.map((c) => def(c.id)?.templates.missed ?? "");
  const suggestions = bottom.map((c) => def(c.id)?.templates.suggestion ?? "");

  // Outcome Projection — deltas scaled by readiness.
  const scale = readiness / 70;
  const outcome_projection = {
    trust_30d: Math.round(10 * scale),
    team_morale_90d: Math.round(5 * scale),
    promotion_readiness_365d: Math.round(12 * scale),
  };

  const coaching_feedback =
    coachingNarrative?.trim() ||
    composeCoaching(roleDef?.label ?? input.role.replace(/_/g, " "), def(bottom[0]?.id ?? ""), def(top[0]?.id ?? ""), Math.round(readiness));

  // Flatten for current DB columns.
  const byId = Object.fromEntries(competencies.map((c) => [c.id, c.score]));
  return {
    empathy: byId.empathy ?? 0,
    accountability: byId.accountability ?? 0,
    coaching: byId.coaching ?? 0,
    clarity: byId.clarity ?? 0,
    psychological_safety: byId.psychological_safety ?? 0,
    readiness_score: readiness,
    strengths,
    missed,
    suggestions,
    coaching_feedback,
    outcome_projection,
    explainability: competencies,
  };
}

function composeCoaching(roleLabel: string, weakDef: RuntimeCompetency | undefined, strongDef: RuntimeCompetency | undefined, readiness: number): string {
  return [
    `Your readiness score is ${readiness}/100 for a ${roleLabel} scenario.`,
    strongDef ? `Your strongest signal was ${strongDef.label.toLowerCase()} — keep leaning on it.` : "",
    weakDef ? `Your biggest development area is ${weakDef.label.toLowerCase()}: ${weakDef.templates.coachingFocus}.` : "",
    `Repeat this scenario in two weeks and compare — the score is meant to move.`,
  ].filter(Boolean).join(" ");
}
