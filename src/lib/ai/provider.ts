/**
 * AI Provider interface — the SINGLE contract any model backend must
 * implement. The platform never calls Gemini / OpenAI / Claude directly;
 * it calls `aiProvider.judgeResponse(...)`.
 *
 * To add a new provider (Gemini / OpenAI / Claude / local), implement
 * this interface in a new file and re-export it from `./index.ts`. Zero
 * other files in the codebase need to change.
 */

import type { CompetencyId } from "@/config/competencies";

export interface JudgeInput {
  roleId: string;
  scenarioPrompt: string;
  response: string;
}

/** Per-competency explainability block — required by the PRD. */
export interface CompetencyScore {
  id: CompetencyId;
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
  /** Identifier surfaced in logs / debug. */
  readonly name: string;
  /** Score a single response against every configured competency. */
  judgeResponse(input: JudgeInput): Promise<JudgeOutput>;
}
