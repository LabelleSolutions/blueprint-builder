/** AI reviewer for leader-submitted scenarios (server-only). */
import { GATEWAY_BASE, gatewayError, readGatewayStream, requireKey } from "./ai/judge-shared";

export interface ScenarioReview {
  decision: "approved" | "rejected";
  notes: string;
}

export async function reviewScenarioWithAI(input: { roleLabel: string; title: string; prompt: string }): Promise<ScenarioReview> {
  const prompt = [
    "You review workplace scenarios submitted by leaders for a leadership readiness assessment.",
    "Approve a scenario only if it: describes a realistic leadership situation for the given role,",
    "gives enough context for a leader to write a meaningful response, is written in second person or clearly addressed to the leader,",
    "and contains no hateful, sexual, violent, or personally identifying content about real people.",
    "Reject spam, jokes, off-topic text, or scenarios too vague to assess.",
    "Give notes: one or two sentences explaining the decision and, if rejected, how to fix it.",
    "",
    `Role: ${input.roleLabel}`,
    `Title: ${input.title}`,
    `Scenario:\n${input.prompt}`,
  ].join("\n");

  const res = await fetch(`${GATEWAY_BASE}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": requireKey(), "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: "scenario_review",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["decision", "notes"],
            properties: { decision: { type: "string", enum: ["approved", "rejected"] }, notes: { type: "string" } },
          },
        },
      },
    }),
  });
  if (!res.ok) await gatewayError(res);
  const raw = await readGatewayStream(res);
  try {
    const p = JSON.parse(raw);
    return { decision: p.decision === "approved" ? "approved" : "rejected", notes: String(p.notes ?? "") };
  } catch {
    throw new Error("The scenario reviewer returned an unreadable result.");
  }
}
