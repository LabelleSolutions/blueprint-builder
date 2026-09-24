/**
 * Runtime configuration (client-safe, pure).
 *
 * Competencies, weights and role profiles are editable in the Admin Studio
 * and stored in the database. `src/config/*` remains the seed + fallback.
 */
import { COMPETENCIES } from "@/config/competencies";
import { ROLES } from "@/config/roles";

export interface CompetencyTemplates {
  strength: string;
  missed: string;
  suggestion: string;
  coachingFocus: string;
}

export interface RuntimeCompetency {
  id: string;
  label: string;
  description: string;
  weight: number;
  /** Regex sources (case-insensitive). */
  signals: string[];
  templates: CompetencyTemplates;
}

export interface RuntimeRole {
  id: string;
  label: string;
  tagline: string;
  targetCompetencies: string[];
}

export interface RuntimeConfig {
  competencies: RuntimeCompetency[];
  roles: RuntimeRole[];
}

export const FALLBACK_CONFIG: RuntimeConfig = {
  competencies: COMPETENCIES.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    weight: c.weight,
    signals: c.signals.map((r) => r.source),
    templates: { ...c.templates },
  })),
  roles: ROLES.map((r) => ({ ...r, targetCompetencies: [...r.targetCompetencies] })),
};

const EMPTY_T: CompetencyTemplates = { strength: "", missed: "", suggestion: "", coachingFocus: "" };

export function rowsToConfig(
  compRows: Array<{ id: string; label: string; description: string; weight: number | string; signals: string[]; templates: unknown }> | null,
  roleRows: Array<{ id: string; label: string; tagline: string; target_competencies: string[] }> | null,
): RuntimeConfig {
  const competencies =
    compRows && compRows.length
      ? compRows.map((r) => ({
          id: r.id,
          label: r.label,
          description: r.description,
          weight: Number(r.weight),
          signals: r.signals ?? [],
          templates: { ...EMPTY_T, ...((r.templates as Partial<CompetencyTemplates>) ?? {}) },
        }))
      : FALLBACK_CONFIG.competencies;
  const roles =
    roleRows && roleRows.length
      ? roleRows.map((r) => ({ id: r.id, label: r.label, tagline: r.tagline, targetCompetencies: r.target_competencies ?? [] }))
      : FALLBACK_CONFIG.roles;
  return { competencies, roles };
}

/** Readiness Engine — weighted sum of competency scores. */
export function computeReadiness(
  scores: Array<{ id: string; score: number }>,
  competencies: Array<{ id: string; weight: number }>,
): number {
  let total = 0;
  for (const s of scores) {
    const def = competencies.find((c) => c.id === s.id);
    if (def) total += s.score * def.weight;
  }
  return Math.round(total * 100) / 100;
}

export function safeRegex(source: string): RegExp | null {
  try {
    return new RegExp(source, "i");
  } catch {
    return null;
  }
}
