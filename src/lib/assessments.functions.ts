import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum([
  "engineering_manager",
  "team_lead",
  "project_manager",
  "hr_manager",
  "operations_manager",
  "teacher",
]);

export type LeadershipRole = z.infer<typeof RoleEnum>;

export const ROLE_LABEL: Record<LeadershipRole, string> = {
  engineering_manager: "Engineering Manager",
  team_lead: "Team Lead",
  project_manager: "Project Manager",
  hr_manager: "HR Manager",
  operations_manager: "Operations Manager",
  teacher: "Teacher",
};

export const startAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { role: LeadershipRole }) =>
    z.object({ role: RoleEnum }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // pick a scenario for this role (random row)
    const { data: scenarios, error: sErr } = await supabase
      .from("scenarios")
      .select("id, title, prompt")
      .eq("role", data.role);
    if (sErr) throw new Error(sErr.message);
    if (!scenarios || scenarios.length === 0) throw new Error("No scenarios for this role");
    const pick = scenarios[Math.floor(Math.random() * scenarios.length)];

    const { data: a, error: aErr } = await supabase
      .from("assessments")
      .insert({ user_id: userId, role: data.role, scenario_id: pick.id })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);
    return { assessmentId: a.id as string };
  });

export const getAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: a, error } = await supabase
      .from("assessments")
      .select("id, role, response, status, scenario:scenarios(id, title, prompt)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return a;
  });

export const submitResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; response: string }) =>
    z.object({ id: z.string().uuid(), response: z.string().min(20).max(8000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // fetch assessment + scenario (RLS scoped to user)
    const { data: a, error: aErr } = await supabase
      .from("assessments")
      .select("id, role, user_id, scenario:scenarios(prompt)")
      .eq("id", data.id)
      .single();
    if (aErr) throw new Error(aErr.message);
    if (a.user_id !== userId) throw new Error("Forbidden");

    const { scoreResponse } = await import("./ai-judge.server");
    const scenarioPrompt = (a.scenario as { prompt: string } | null)?.prompt ?? "";
    const judged = await scoreResponse({
      role: a.role,
      scenarioPrompt,
      response: data.response,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("assessments")
      .update({ response: data.response, status: "scored" })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    const { error: rErr } = await supabaseAdmin.from("results").upsert({
      assessment_id: data.id,
      empathy: judged.empathy,
      accountability: judged.accountability,
      coaching: judged.coaching,
      clarity: judged.clarity,
      psychological_safety: judged.psychological_safety,
      readiness_score: judged.readiness_score,
      strengths: judged.strengths,
      missed: judged.missed,
      suggestions: judged.suggestions,
      coaching_feedback: judged.coaching_feedback,
      outcome_projection: judged.outcome_projection,
      explainability: judged.explainability,
    });
    if (rErr) throw new Error(rErr.message);

    return { assessmentId: data.id };
  });

export const getAssessmentWithResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: a, error: aErr } = await supabase
      .from("assessments")
      .select("id, role, response, status, created_at, scenario:scenarios(id, title, prompt)")
      .eq("id", data.id)
      .single();
    if (aErr) throw new Error(aErr.message);
    const { data: r, error: rErr } = await supabase
      .from("results")
      .select("*")
      .eq("assessment_id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    return { assessment: a, result: r };
  });

export const listMyAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("assessments")
      .select("id, role, status, created_at, result:results(readiness_score)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
