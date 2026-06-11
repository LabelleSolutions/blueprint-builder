/**
 * AI Judge Engine — deterministic local stub.
 *
 * Implements the Blueprint's three engines:
 *   1. Leadership Signal Engine    — keyword/length → signal weights
 *   2. Competency Growth Logic     — signals → 0–100 sub-scores
 *   3. Reflection Engine           — strengths / missed / suggestions
 *   4. Outcome Projection          — 30/90/365 day deltas
 *
 * Swap point for live AI later: replace `scoreResponse` body with a
 * Lovable AI Gateway call returning the same shape.
 */

export type Competency =
  | "empathy"
  | "accountability"
  | "coaching"
  | "clarity"
  | "psychological_safety";

export interface JudgeResult {
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
}

// PRD readiness formula
const WEIGHTS: Record<Competency, number> = {
  empathy: 0.2,
  accountability: 0.2,
  coaching: 0.25,
  clarity: 0.15,
  psychological_safety: 0.2,
};

// Leadership Signal Engine — keyword buckets
const SIGNALS: Record<Competency, RegExp[]> = {
  empathy: [/\b(i (feel|understand|hear)|how (are|do) you|listen|perspective|appreciate|acknowledge)\b/i],
  accountability: [/\b(i (will|own|take responsibility)|follow.?up|next step|by (monday|friday|tomorrow)|commit|deliver)\b/i],
  coaching: [/\b(what do you think|how would you|help you|grow|develop|learn|teach|practice|feedback)\b/i],
  clarity: [/\b(specifically|by (monday|friday)|deadline|the goal is|expectation|priority|to be clear|in writing)\b/i],
  psychological_safety: [/\b(safe|no blame|blameless|judgment.?free|it'?s okay|together|we (all|both)|trust)\b/i],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

const STRENGTH_TPL: Record<Competency, string> = {
  empathy: "Demonstrates genuine empathy and active listening",
  accountability: "Owns outcomes and commits to clear next steps",
  coaching: "Coaches by asking, not telling",
  clarity: "Communicates with precision and concrete expectations",
  psychological_safety: "Creates a blameless, trust-first environment",
};

const MISSED_TPL: Record<Competency, string> = {
  empathy: "Root cause analysis from the other person's point of view",
  accountability: "Naming a specific owner and timeline",
  coaching: "Inviting the other person to propose the next step",
  clarity: "Stating the expectation in concrete, written terms",
  psychological_safety: "Explicitly separating the person from the problem",
};

const SUGGESTION_TPL: Record<Competency, string> = {
  empathy: "Open the next 1:1 with a single open question about how they're doing",
  accountability: "End every conversation by writing down the owner and the date",
  coaching: "Replace one piece of advice this week with a GROW-model question",
  clarity: "Restate every commitment in a one-sentence summary email",
  psychological_safety: "Name the team norm out loud: 'we debug systems, not people'",
};

export interface ScoreInput {
  role: string;
  scenarioPrompt: string;
  response: string;
}

export function scoreResponse(input: ScoreInput): JudgeResult {
  const text = (input.response || "").trim();
  const len = text.length;
  const seed = hash(`${input.role}|${input.scenarioPrompt}|${text}`);

  // Length-based baseline (very short answers cap lower)
  const lenFactor = Math.min(1, len / 600);
  const baseline = 38 + lenFactor * 32; // 38–70

  // Per-competency sub-scores
  const subs: Record<Competency, number> = {
    empathy: 0,
    accountability: 0,
    coaching: 0,
    clarity: 0,
    psychological_safety: 0,
  };

  let i = 0;
  for (const key of Object.keys(SIGNALS) as Competency[]) {
    const hits = SIGNALS[key].reduce(
      (acc, re) => acc + (text.match(new RegExp(re.source, "gi"))?.length ?? 0),
      0,
    );
    // Competency Growth Logic — Blueprint increments (+2 to +3 per signal)
    const growth = Math.min(28, hits * (key === "coaching" ? 3 : 2) * 2.2);
    // Deterministic jitter ±6
    const jitter = ((seed >> (i * 4)) & 0xf) - 7;
    subs[key] = clamp(baseline + growth + jitter);
    i++;
  }

  const readiness =
    subs.empathy * WEIGHTS.empathy +
    subs.accountability * WEIGHTS.accountability +
    subs.coaching * WEIGHTS.coaching +
    subs.clarity * WEIGHTS.clarity +
    subs.psychological_safety * WEIGHTS.psychological_safety;

  // Reflection Engine — top 2 strengths, bottom 2 dev areas
  const ranked = (Object.keys(subs) as Competency[]).sort((a, b) => subs[b] - subs[a]);
  const top = ranked.slice(0, 2);
  const bottom = ranked.slice(-2);

  const strengths = top.map((c) => STRENGTH_TPL[c]);
  const missed = bottom.map((c) => MISSED_TPL[c]);
  const suggestions = bottom.map((c) => SUGGESTION_TPL[c]);

  // Outcome Projection — Blueprint deltas scaled by readiness
  const scale = readiness / 70;
  const outcome_projection = {
    trust_30d: Math.round(10 * scale),
    team_morale_90d: Math.round(5 * scale),
    promotion_readiness_365d: Math.round(12 * scale),
  };

  const coaching_feedback = composeCoaching(input.role, bottom[0], top[0], Math.round(readiness));

  return {
    ...subs,
    readiness_score: Math.round(readiness * 100) / 100,
    strengths,
    missed,
    suggestions,
    coaching_feedback,
    outcome_projection,
  };
}

function composeCoaching(role: string, weakest: Competency, strongest: Competency, readiness: number): string {
  const roleLabel = role.replace(/_/g, " ");
  const focus: Record<Competency, string> = {
    empathy: "slow down and reflect what you heard before solving",
    accountability: "name owners and dates in every conversation",
    coaching: "ask one more question before offering an answer",
    clarity: "translate intentions into one concrete, written expectation",
    psychological_safety: "separate the person from the problem out loud",
  };
  return [
    `Your readiness score is ${readiness}/100 for a ${roleLabel} scenario.`,
    `Your strongest signal was ${strongest.replace("_", " ")} — keep leaning on it.`,
    `Your biggest development area is ${weakest.replace("_", " ")}: ${focus[weakest]}.`,
    `Repeat this scenario in two weeks and compare — the score is meant to move.`,
  ].join(" ");
}
