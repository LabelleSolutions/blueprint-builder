import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProposedOp {
  type: "update_competency" | "set_weights" | "update_role" | "create_scenario" | "update_scenario" | "delete_scenario";
  target_id: string | null;
  label: string | null;
  description: string | null;
  tagline: string | null;
  title: string | null;
  prompt: string | null;
  role: string | null;
  target_competencies: string[] | null;
  weights: { id: string; weight: number }[] | null;
  strength: string | null;
  missed: string | null;
  suggestion: string | null;
  coaching_focus: string | null;
  rationale: string;
}

const nullable = (t: object) => ({ anyOf: [t, { type: "null" }] });
const str = nullable({ type: "string" });

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "operations"],
  properties: {
    summary: { type: "string" },
    operations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "target_id", "label", "description", "tagline", "title", "prompt", "role", "target_competencies", "weights", "strength", "missed", "suggestion", "coaching_focus", "rationale"],
        properties: {
          type: { type: "string", enum: ["update_competency", "set_weights", "update_role", "create_scenario", "update_scenario", "delete_scenario"] },
          target_id: str,
          label: str,
          description: str,
          tagline: str,
          title: str,
          prompt: str,
          role: str,
          target_competencies: nullable({ type: "array", items: { type: "string" } }),
          weights: nullable({
            type: "array",
            items: { type: "object", additionalProperties: false, required: ["id", "weight"], properties: { id: { type: "string" }, weight: { type: "number" } } },
          }),
          strength: str,
          missed: str,
          suggestion: str,
          coaching_focus: str,
          rationale: { type: "string" },
        },
      },
    },
  },
};

async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let done = "";
  for (;;) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const e = JSON.parse(p);
        if (e.type === "response.output_text.delta") text += e.delta;
        else if (e.type === "response.completed") done = e.response?.output_text ?? "";
      } catch {
        /* partial */
      }
    }
  }
  return text || done;
}

export const proposeConfigChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instruction: z.string().min(3).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin access required");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const { loadRuntimeConfig } = await import("./runtime-config.server");
    const config = await loadRuntimeConfig(context.supabase);
    const { data: scenarios } = await context.supabase.from("scenarios").select("id,role,title,prompt");

    const prompt = [
      "You are the configuration assistant for a leadership readiness assessment platform.",
      "Translate the admin's instruction into a minimal list of configuration operations. Only propose what was asked.",
      "Rules:",
      "- Competency ids are fixed; you may edit label, description and the four template texts (update_competency, target_id = competency id). Unchanged fields must be null.",
      "- set_weights must list EVERY competency id with weights as decimals summing exactly to 1.0.",
      "- update_role: target_id is one of the existing role ids; you cannot create roles. target_competencies must use existing competency ids.",
      "- create_scenario needs role, title and a realistic 80-200 word prompt written in second person. update_scenario/delete_scenario use target_id = scenario id.",
      "- Give a one-sentence rationale per operation. If the instruction cannot be done, return no operations and explain in summary.",
      "",
      "Current configuration (JSON):",
      JSON.stringify({ competencies: config.competencies.map(({ signals: _s, ...c }) => c), roles: config.roles, scenarios }),
      "",
      "Admin instruction:",
      data.instruction,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: { format: { type: "json_schema", name: "config_ops", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("The assistant is busy — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits are exhausted. Add credits in Settings → Plans & credits.");
      throw new Error(`Assistant failed (${res.status}).`);
    }
    const raw = await readStream(res);
    if (!raw.trim()) throw new Error("The assistant returned an empty result.");
    const parsed = JSON.parse(raw) as { summary: string; operations: ProposedOp[] };
    return parsed;
  });
