/**
 * Competency configuration — single source of truth.
 *
 * Add / remove / reweight competencies HERE only. The Judge Engine,
 * Readiness Engine, and Report UI all read from this file.
 *
 * Stored as TS (not raw JSON) for type safety + tree-shaking. Shape is
 * pure data — equivalent to `competencies.json`.
 */

export interface CompetencyDef {
  id: string;
  label: string;
  description: string;
  /** Readiness weight (must sum to 1.0 across all competencies). */
  weight: number;
  /** Behavioural signals (regex) the Judge Engine looks for. */
  signals: RegExp[];
  /** Per-competency explainability templates. */
  templates: {
    strength: string;
    missed: string;
    suggestion: string;
    /** Short clause used by the coaching paragraph composer. */
    coachingFocus: string;
  };
}

export const COMPETENCIES: CompetencyDef[] = [
  {
    id: "empathy",
    label: "Empathy",
    description: "Listens to understand before responding; reflects feelings and perspective.",
    weight: 0.2,
    signals: [/\b(i (feel|understand|hear)|how (are|do) you|listen|perspective|appreciate|acknowledge)\b/i],
    templates: {
      strength: "Demonstrates genuine empathy and active listening",
      missed: "Root cause analysis from the other person's point of view",
      suggestion: "Open the next 1:1 with a single open question about how they're doing",
      coachingFocus: "slow down and reflect what you heard before solving",
    },
  },
  {
    id: "accountability",
    label: "Accountability",
    description: "Owns outcomes, names owners, and commits to clear next steps.",
    weight: 0.2,
    signals: [/\b(i (will|own|take responsibility)|follow.?up|next step|by (monday|friday|tomorrow)|commit|deliver)\b/i],
    templates: {
      strength: "Owns outcomes and commits to clear next steps",
      missed: "Naming a specific owner and timeline",
      suggestion: "End every conversation by writing down the owner and the date",
      coachingFocus: "name owners and dates in every conversation",
    },
  },
  {
    id: "coaching",
    label: "Coaching",
    description: "Develops people by asking questions rather than dictating answers.",
    weight: 0.25,
    signals: [/\b(what do you think|how would you|help you|grow|develop|learn|teach|practice|feedback)\b/i],
    templates: {
      strength: "Coaches by asking, not telling",
      missed: "Inviting the other person to propose the next step",
      suggestion: "Replace one piece of advice this week with a GROW-model question",
      coachingFocus: "ask one more question before offering an answer",
    },
  },
  {
    id: "clarity",
    label: "Clarity",
    description: "Translates intent into concrete, written, time-bound expectations.",
    weight: 0.15,
    signals: [/\b(specifically|by (monday|friday)|deadline|the goal is|expectation|priority|to be clear|in writing)\b/i],
    templates: {
      strength: "Communicates with precision and concrete expectations",
      missed: "Stating the expectation in concrete, written terms",
      suggestion: "Restate every commitment in a one-sentence summary email",
      coachingFocus: "translate intentions into one concrete, written expectation",
    },
  },
  {
    id: "psychological_safety",
    label: "Psychological Safety",
    description: "Creates a blameless environment that separates person from problem.",
    weight: 0.2,
    signals: [/\b(safe|no blame|blameless|judgment.?free|it'?s okay|together|we (all|both)|trust)\b/i],
    templates: {
      strength: "Creates a blameless, trust-first environment",
      missed: "Explicitly separating the person from the problem",
      suggestion: "Name the team norm out loud: 'we debug systems, not people'",
      coachingFocus: "separate the person from the problem out loud",
    },
  },
];

export type CompetencyId = (typeof COMPETENCIES)[number]["id"];

export const competencyById = (id: string): CompetencyDef | undefined =>
  COMPETENCIES.find((c) => c.id === id);
