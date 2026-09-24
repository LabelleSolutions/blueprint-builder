import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { rowsToConfig, type RuntimeConfig } from "./runtime-config";

/** Load live config from the database (per request). Falls back to code defaults. */
export async function loadRuntimeConfig(supabase: SupabaseClient<Database>): Promise<RuntimeConfig> {
  const [c, r] = await Promise.all([
    supabase.from("competencies").select("id,label,description,weight,signals,templates").order("sort"),
    supabase.from("role_profiles").select("id,label,tagline,target_competencies"),
  ]);
  if (c.error) console.error("[config] competencies", c.error.message);
  if (r.error) console.error("[config] roles", r.error.message);
  return rowsToConfig(c.data ?? null, r.data ?? null);
}
