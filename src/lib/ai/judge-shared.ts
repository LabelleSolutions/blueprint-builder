/**
 * Shared, model-agnostic pieces every provider reuses: the judge prompt,
 * the output JSON schema, SSE reading, and normalisation into JudgeOutput.
 * Providers only differ in HOW they call their model.
 */
import type { RuntimeCompetency } from "../runtime-config";
import type { CompetencyScore, JudgeInput, JudgeOutput } from "./provider";

export const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

export function buildJudgePrompt(input: JudgeInput): string {
  const role = input.role;
  const rubric = input.competencies
    .map((c) => `- ${c.id} (${c.label}, weight ${Math.round(c.weight * 100)}%): ${c.description}`)
    .join("\n");
  return [
    `You are an expert leadership assessor. Evaluate a leader's written response to a workplace scenario.`,
    ``,
    `Role: ${role?.label ?? input.roleId}${role ? ` — ${role.tagline}` : ""}`,
    role ? `Most critical competencies for this role: ${role.targetCompetencies.join(", ")}.` : ``,
    ``,
    `Competency rubric:`,
    rubric,
    ``,
    `Scenario:`,
    input.scenarioPrompt,
    ``,
    `Leader's response:`,
    input.response,
    ``,
    `Score EVERY competency id listed above from 0-100. For each, give:`,
    `- reason: one or two sentences explaining the score,`,
    `- evidence: a short quote from the leader's response (or state plainly that the language was absent),`,
    `- recommendation: one concrete, specific action the leader can take next.`,
    `Also write coachingNarrative: 3-4 sentences of direct coaching.`,
    `Be rigorous: generic or very short responses should not score highly. Return only JSON.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const judgeSchema = (comps: RuntimeCompetency[]) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    competencies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", enum: comps.map((c) => c.id) },
          score: { type: "number" },
          reason: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["id", "score", "reason", "evidence", "recommendation"],
      },
    },
    coachingNarrative: { type: "string" },
  },
  required: ["competencies", "coachingNarrative"],
});

/** Reads an SSE body from either Responses or Chat Completions streams. */
export async function readGatewayStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty response stream from AI Gateway");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
        else if (evt.type === "response.completed") completed = evt.response?.output_text ?? "";
        else if (evt.error) throw new Error(evt.error.message ?? "AI stream error");
        else {
          const d = evt.choices?.[0]?.delta?.content;
          if (typeof d === "string") text += d;
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "" && !(e instanceof SyntaxError)) throw e;
      }
    }
  }
  return text || completed;
}

export async function gatewayError(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error("[ai] gateway error", res.status, body.slice(0, 500));
  if (res.status === 429) throw new Error("The evaluator is busy right now — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  if (res.status === 403) throw new Error("The AI model is not available for this workspace.");
  throw new Error(`AI evaluation failed (${res.status}).`);
}

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export function normaliseJudgeJson(raw: string, comps: RuntimeCompetency[]): JudgeOutput {
  if (!raw.trim()) throw new Error("The evaluator returned an empty result — please try again.");
  let parsed: { competencies?: unknown; coachingNarrative?: unknown };
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("The evaluator returned an unreadable result — please try again.");
  }
  const byId = new Map<string, CompetencyScore>();
  for (const item of (Array.isArray(parsed.competencies) ? parsed.competencies : []) as Array<Record<string, unknown>>) {
    const id = String(item["id"] ?? "");
    if (!comps.some((c) => c.id === id)) continue;
    byId.set(id, {
      id,
      score: clamp(item["score"]),
      reason: String(item["reason"] ?? ""),
      evidence: String(item["evidence"] ?? ""),
      recommendation: String(item["recommendation"] ?? ""),
    });
  }
  return {
    competencies: comps.map(
      (c) =>
        byId.get(c.id) ?? {
          id: c.id,
          score: 0,
          reason: "The evaluator did not return a score for this competency.",
          evidence: "No evidence returned.",
          recommendation: c.templates.suggestion,
        },
    ),
    coachingNarrative: typeof parsed.coachingNarrative === "string" ? parsed.coachingNarrative : undefined,
  };
}

export function requireKey(): string {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("AI is not configured for this project.");
  return k;
}
