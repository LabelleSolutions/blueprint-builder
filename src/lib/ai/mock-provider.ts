/**
 * Deterministic local provider — the current MVP implementation.
 *
 * Pure function of (role, scenario, response). No network, no model.
 * Conforms to `AIProvider` so it can be swapped for a real model
 * (Gemini / OpenAI / Claude) by changing one line in `./index.ts`.
 */

import { safeRegex, type RuntimeCompetency } from "../runtime-config";
import type { AIProvider, JudgeInput, JudgeOutput, CompetencyScore } from "./provider";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

function scoreOne(c: RuntimeCompetency, text: string, baseline: number, seed: number, i: number): CompetencyScore {
  const regexes = c.signals.map(safeRegex).filter((r): r is RegExp => !!r);
  const hits = regexes.reduce(
    (acc, re) => acc + (text.match(new RegExp(re.source, "gi"))?.length ?? 0),
    0,
  );
  const growth = Math.min(28, hits * (c.id === "coaching" ? 3 : 2) * 2.2);
  const jitter = ((seed >> (i * 4)) & 0xf) - 7;
  const score = clamp(baseline + growth + jitter);

  // Evidence: first signal match, if any.
  let evidence = "";
  for (const re of regexes) {
    const m = text.match(new RegExp(re.source, "i"));
    if (m) {
      evidence = `"${m[0]}"`;
      break;
    }
  }
  if (!evidence) evidence = "No explicit language detected for this competency.";

  const tier = score >= 70 ? "strong" : score >= 50 ? "developing" : "limited";
  const reason =
    tier === "strong"
      ? `Strong ${c.label.toLowerCase()} signal — ${hits} cue(s) detected in the response.`
      : tier === "developing"
        ? `Some ${c.label.toLowerCase()} signal present, but not consistently applied.`
        : `Little explicit ${c.label.toLowerCase()} language in the response.`;

  const recommendation = tier === "strong" ? c.templates.strength : c.templates.suggestion;

  return { id: c.id, score, reason, evidence, recommendation };
}

export const mockProvider: AIProvider = {
  name: "mock-deterministic",
  async judgeResponse(input: JudgeInput): Promise<JudgeOutput> {
    const text = (input.response || "").trim();
    const seed = hash(`${input.roleId}|${input.scenarioPrompt}|${text}`);
    const baseline = 38 + Math.min(1, text.length / 600) * 32;

    const competencies = input.competencies.map((c, i) => scoreOne(c, text, baseline, seed, i));
    return { competencies };
  },
};
