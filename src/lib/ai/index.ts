/**
 * SINGLE SWAP-POINT for AI providers.
 *
 * The rest of the codebase only imports `aiProvider` from here.
 * To switch models, change ACTIVE_PROVIDER to "openai", "gemini" or "mock".
 * No UI, business logic, schema, workflow, competency or readiness engine
 * code needs to change. A Claude provider would be one more file with the
 * same `AIProvider` shape, added to the registry below.
 */
import type { AIProvider } from "./provider";
import { openaiProvider } from "./openai-provider";
import { geminiProvider } from "./gemini-provider";
import { mockProvider } from "./mock-provider";

export const providers = { openai: openaiProvider, gemini: geminiProvider, mock: mockProvider } as const;
export type ProviderKey = keyof typeof providers;

export const ACTIVE_PROVIDER: ProviderKey = "openai";

export const aiProvider: AIProvider = providers[ACTIVE_PROVIDER];

export { mockProvider, openaiProvider, geminiProvider };
export type { AIProvider, JudgeInput, JudgeOutput, CompetencyScore } from "./provider";
