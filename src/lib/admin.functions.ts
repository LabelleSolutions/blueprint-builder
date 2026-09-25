import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin access required");
}

async function audit(ctx: Ctx, entity: string, entityId: string | null, before: unknown, after: unknown) {
  await ctx.supabase.from("config_audit").insert({
    actor: ctx.userId,
    entity,
    entity_id: entityId,
    before: (before ?? null) as Json,
    after: (after ?? null) as Json,
  });
}

const RoleEnum = z.enum(["engineering_manager", "team_lead", "project_manager", "hr_manager", "operations_manager", "teacher"]);

const Templates = z.object({
  strength: z.string().max(300),
  missed: z.string().max(300),
  suggestion: z.string().max(300),
  coachingFocus: z.string().max(300),
});

export const updateCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        label: z.string().min(1).max(80),
        description: z.string().max(500),
        signals: z.array(z.string().max(500)).max(20),
        templates: Templates,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const s of data.signals) {
      try {
        new RegExp(s, "i");
      } catch {
        throw new Error(`Invalid signal pattern: ${s}`);
      }
    }
    const { data: before } = await context.supabase.from("competencies").select("*").eq("id", data.id).single();
    const { error } = await context.supabase
      .from("competencies")
      .update({ label: data.label, description: data.description, signals: data.signals, templates: data.templates, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "competency", data.id, before, data);
    return { ok: true };
  });

export const setWeights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ weights: z.array(z.object({ id: z.string(), weight: z.number().min(0).max(1) })).min(1) })
      .refine((v) => Math.abs(v.weights.reduce((a, w) => a + w.weight, 0) - 1) < 0.001, "Weights must total 100%")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: before } = await context.supabase.from("competencies").select("id,weight");
    for (const w of data.weights) {
      const { error } = await context.supabase.from("competencies").update({ weight: w.weight, updated_at: new Date().toISOString() }).eq("id", w.id);
      if (error) throw new Error(error.message);
    }
    await audit(context, "weights", null, before, data.weights);
    return { ok: true };
  });

export const updateRoleProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: RoleEnum, label: z.string().min(1).max(80), tagline: z.string().max(200), targetCompetencies: z.array(z.string()).max(10) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: before } = await context.supabase.from("role_profiles").select("*").eq("id", data.id).single();
    const { error } = await context.supabase
      .from("role_profiles")
      .update({ label: data.label, tagline: data.tagline, target_competencies: data.targetCompetencies, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "role", data.id, before, data);
    return { ok: true };
  });

export const listScenarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("scenarios").select("id,role,title,prompt,created_at,status,review_notes,reviewed_by,created_by").order("role").order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ScenarioInput = z.object({ role: RoleEnum, title: z.string().min(3).max(160), prompt: z.string().min(20).max(4000) });

export const createScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScenarioInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("scenarios").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    await audit(context, "scenario", row.id, null, data);
    return { id: row.id };
  });

export const updateScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScenarioInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const { data: before } = await context.supabase.from("scenarios").select("*").eq("id", id).single();
    const { error } = await context.supabase.from("scenarios").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(context, "scenario", id, before, rest);
    return { ok: true };
  });

export const deleteScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: before } = await context.supabase.from("scenarios").select("*").eq("id", data.id).single();
    const { error } = await context.supabase.from("scenarios").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") throw new Error("This scenario has been used in past assessments and can't be deleted. Edit it instead.");
      throw new Error(error.message);
    }
    await audit(context, "scenario", data.id, before, null);
    return { ok: true };
  });

/** Recent scored reports (all users) for the live score preview. Read-only. */
export const listPreviewResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("results")
      .select("assessment_id, readiness_score, empathy, accountability, coaching, clarity, psychological_safety, created_at, assessment:assessments(role)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.assessment_id,
      role: (r.assessment as { role: string } | null)?.role ?? "",
      createdAt: r.created_at,
      savedReadiness: Number(r.readiness_score),
      scores: [
        { id: "empathy", score: r.empathy },
        { id: "accountability", score: r.accountability },
        { id: "coaching", score: r.coaching },
        { id: "clarity", score: r.clarity },
        { id: "psychological_safety", score: r.psychological_safety },
      ],
    }));
  });

export const reviewScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]), notes: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("scenarios")
      .update({ status: data.status, review_notes: data.notes || null, reviewed_by: "admin", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "scenario_review", data.id, null, data);
    return { ok: true };
  });

/** Full scored assessment (any user) for human rating. Admin only. */
export const getRatingTarget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a, error } = await supabaseAdmin
      .from("assessments")
      .select("id, role, response, created_at, scenario:scenarios(title, prompt), result:results(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: ratings } = await context.supabase
      .from("human_ratings")
      .select("id, rater_name, scores, notes, created_at")
      .eq("assessment_id", data.id)
      .order("created_at", { ascending: false });
    const result = Array.isArray(a.result) ? a.result[0] : a.result;
    return {
      id: a.id,
      role: a.role,
      response: a.response ?? "",
      createdAt: a.created_at,
      scenario: a.scenario as { title: string; prompt: string } | null,
      readiness: result ? Number(result.readiness_score) : null,
      explainability: (result?.explainability ?? []) as Array<{ id: string; score: number; reason: string; evidence: string; recommendation: string }>,
      ratings: (ratings ?? []).map((r) => ({ ...r, scores: r.scores as Record<string, number> })),
    };
  });

export const saveHumanRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        raterName: z.string().trim().min(1).max(100),
        scores: z.record(z.string(), z.number().min(0).max(100)),
        notes: z.string().max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("human_ratings").insert({
      assessment_id: data.assessmentId,
      rater_id: context.userId,
      rater_name: data.raterName,
      scores: data.scores,
      notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
