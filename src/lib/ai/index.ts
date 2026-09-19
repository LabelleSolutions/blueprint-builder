/**
 * SINGLE SWAP-POINT for AI providers.
 *
 * The rest of the codebase only ever imports `aiProvider` from here.
 * To switch model backends:
 *
 *   import { geminiProvider } from "./gemini-provider";
 *   export const aiProvider: AIProvider = geminiProvider;
 *
 * No UI, business logic, schema, workflow, competency engine, or
 * readiness engine code needs to change.
 *
 * Example provider stubs (NOT implemented — just shape):
 *
 *   // gemini-provider.ts
 *   export const geminiProvider: AIProvider = {
 *     name: "gemini-2.5-flash",
 *     async judgeResponse({ roleId, scenarioPrompt, response }) {
 *       const res = await callLovableAIGateway({
 *         model: "google/gemini-2.5-flash",
 *         prompt: buildJudgePrompt({ roleId, scenarioPrompt, response }),
 *       });
 *       return parseJudgeJSON(res); // must satisfy JudgeOutput
 *     },
 *   };
 *
 *   // openai-provider.ts → model: "openai/gpt-5-mini", same shape.
 *   // claude-provider.ts → call Anthropic, same shape.
 */

import type { AIProvider } from "./provider";
import { gatewayProvider } from "./gateway-provider";

export const aiProvider: AIProvider = gatewayProvider;

/** Kept exported for tests / offline fallback. */
export { mockProvider } from "./mock-provider";

export type { AIProvider, JudgeInput, JudgeOutput, CompetencyScore } from "./provider";
