/**
 * AI Provider interface — the SINGLE contract any model backend must
 * implement. The platform never calls Gemini / OpenAI / Claude directly;
 * it calls `aiProvider.judgeResponse(...)`.
 *
 * Competencies and the role profile are passed in (loaded from the
 * editable runtime config), so providers never import config directly.
 */

import type { RuntimeCompetency, RuntimeRole } from "../runtime-config";

export interface JudgeInput {
  roleId: string;
  role?: RuntimeRole;
  competencies: RuntimeCompetency[];
  scenarioPrompt: string;
  response: string;
}

/** Per-competency explainability block — required by the PRD. */
export interface CompetencyScore {
  id: string;
  score: number; // 0–100
  reason: string;
  evidence: string;
  recommendation: string;
}

export interface JudgeOutput {
  competencies: CompetencyScore[];
  /** Optional model-side coaching narrative; Readiness Engine may override. */
  coachingNarrative?: string;
}

export interface AIProvider {
  readonly name: string;
  judgeResponse(input: JudgeInput): Promise<JudgeOutput>;
}
