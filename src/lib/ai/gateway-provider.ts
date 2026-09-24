/**
 * Live AI provider — Lovable AI Gateway (Responses API).
 *
 * Implements the SAME `AIProvider` contract as the mock provider, so the
 * platform swaps between them by changing one line in `./index.ts`.
 * All prompt construction lives here; no UI, schema, or engine code knows
 * which model produced the scores.
 */

import type { RuntimeCompetency } from "../runtime-config";
import type { AIProvider, JudgeInput, JudgeOutput, CompetencyScore } from "./provider";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

function buildJudgePrompt(input: JudgeInput): string {
  const role = input.role;
  const rubric = input.competencies.map(
    (c) =>
      `- ${c.id} (${c.label}, weight ${Math.round(c.weight * 100)}%): ${c.description}`,
  ).join("\n");

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
    `Be rigorous: generic or very short responses should not score highly.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const judgeSchema = (comps: RuntimeCompetency[]) => ({
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

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/** Read a streamed SSE body and return the concatenated output text. */
async function readResponseStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty response stream from AI Gateway");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
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
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!text) text = evt.response.output_text;
        }
      } catch {
        // ignore keep-alives / partial frames
      }
    }
  }
  return text;
}

export const gatewayProvider: AIProvider = {
  name: MODEL,
  async judgeResponse(input: JudgeInput): Promise<JudgeOutput> {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        input: buildJudgePrompt(input),
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "leadership_judgement",
            strict: true,
            schema: judgeSchema(input.competencies),
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The evaluator is busy right now — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI evaluation failed (${res.status}). ${body.slice(0, 200)}`);
    }

    const raw = await readResponseStream(res);
    if (!raw.trim()) throw new Error("The evaluator returned an empty result — please try again.");

    let parsed: { competencies?: unknown; coachingNarrative?: unknown };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error("The evaluator returned an unreadable result — please try again.");
    }

    const list = Array.isArray(parsed.competencies) ? parsed.competencies : [];
    const byId = new Map<string, CompetencyScore>();
    for (const item of list as Array<Record<string, unknown>>) {
      const id = String(item["id"] ?? "");
      if (!input.competencies.some((c) => c.id === id)) continue;
      byId.set(id, {
        id,
        score: clamp(item["score"] as number),
        reason: String(item["reason"] ?? ""),
        evidence: String(item["evidence"] ?? ""),
        recommendation: String(item["recommendation"] ?? ""),
      });
    }

    // Guarantee one entry per configured competency (config stays authoritative).
    const competencies: CompetencyScore[] = input.competencies.map(
      (c) =>
        byId.get(c.id) ?? {
          id: c.id,
          score: 0,
          reason: "The evaluator did not return a score for this competency.",
          evidence: "No evidence returned.",
          recommendation: c.templates.suggestion,
        },
    );

    return {
      competencies,
      coachingNarrative:
        typeof parsed.coachingNarrative === "string" ? parsed.coachingNarrative : undefined,
    };
  },
};
