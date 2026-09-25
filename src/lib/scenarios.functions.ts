import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["engineering_manager", "team_lead", "project_manager", "hr_manager", "operations_manager", "teacher"]);

/** Leader submits their own scenario; the AI reviewer approves or rejects it immediately. */
export const submitMyScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ role: RoleEnum, title: z.string().trim().min(3).max(160), prompt: z.string().trim().min(80).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("scenarios")
      .insert({ ...data, created_by: userId, status: "pending" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { loadRuntimeConfig } = await import("./runtime-config.server");
    const config = await loadRuntimeConfig(supabase);
    const roleLabel = config.roles.find((r) => r.id === data.role)?.label ?? data.role;

    const { reviewScenarioWithAI } = await import("./scenario-review.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const review = await reviewScenarioWithAI({ roleLabel, title: data.title, prompt: data.prompt });
      await supabaseAdmin
        .from("scenarios")
        .update({ status: review.decision, review_notes: review.notes, reviewed_by: "ai", reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      return { id: row.id, status: review.decision, notes: review.notes };
    } catch (e) {
      // Leave it pending for an admin to review manually.
      const notes = "Automatic review was unavailable — an admin will review this scenario.";
      await supabaseAdmin.from("scenarios").update({ review_notes: notes }).eq("id", row.id);
      console.error("[scenario-review]", e);
      return { id: row.id, status: "pending" as const, notes };
    }
  });

export const listMyScenarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scenarios")
      .select("id, role, title, prompt, status, review_notes, reviewed_by, created_at")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
