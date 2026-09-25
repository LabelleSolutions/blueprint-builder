/** OpenAI provider — Lovable AI Gateway, Responses API. */
import type { AIProvider } from "./provider";
import { GATEWAY_BASE, buildJudgePrompt, gatewayError, judgeSchema, normaliseJudgeJson, readGatewayStream, requireKey } from "./judge-shared";

const MODEL = "openai/gpt-6-astra";

export const openaiProvider: AIProvider = {
  name: MODEL,
  async judgeResponse(input) {
    const res = await fetch(`${GATEWAY_BASE}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": requireKey(), "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        input: buildJudgePrompt(input),
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        text: { format: { type: "json_schema", name: "leadership_judgement", strict: true, schema: judgeSchema(input.competencies) } },
      }),
    });
    if (!res.ok) await gatewayError(res);
    return normaliseJudgeJson(await readGatewayStream(res), input.competencies);
  },
};
