/** Gemini provider — Lovable AI Gateway, Chat Completions API. */
import type { AIProvider } from "./provider";
import { GATEWAY_BASE, buildJudgePrompt, gatewayError, judgeSchema, normaliseJudgeJson, readGatewayStream, requireKey } from "./judge-shared";

const MODEL = "google/gemini-3-flash-preview";

export const geminiProvider: AIProvider = {
  name: MODEL,
  async judgeResponse(input) {
    const res = await fetch(`${GATEWAY_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": requireKey(), "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [{ role: "user", content: buildJudgePrompt(input) }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "leadership_judgement", strict: true, schema: judgeSchema(input.competencies) },
        },
      }),
    });
    if (!res.ok) await gatewayError(res);
    return normaliseJudgeJson(await readGatewayStream(res), input.competencies);
  },
};
