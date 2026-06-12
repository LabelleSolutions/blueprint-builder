/**
 * Role profiles — single source of truth.
 *
 * Each role maps to its target competencies (used for weighting hints and
 * UI surfacing). The DB enum mirrors `id` values; adding a role here
 * requires a tiny migration to extend the `leadership_role` enum.
 */

import type { CompetencyId } from "./competencies";

export interface RoleDef {
  id: string;
  label: string;
  tagline: string;
  /** Competencies most critical for this role (subset of competency ids). */
  targetCompetencies: CompetencyId[];
}

export const ROLES: RoleDef[] = [
  {
    id: "engineering_manager",
    label: "Engineering Manager",
    tagline: "Lead engineers through delivery and growth.",
    targetCompetencies: ["coaching", "accountability", "psychological_safety"],
  },
  {
    id: "team_lead",
    label: "Team Lead",
    tagline: "Set direction inside a hands-on team.",
    targetCompetencies: ["clarity", "coaching", "accountability"],
  },
  {
    id: "project_manager",
    label: "Project Manager",
    tagline: "Drive scope, schedule, and stakeholders.",
    targetCompetencies: ["clarity", "accountability", "empathy"],
  },
  {
    id: "hr_manager",
    label: "HR Manager",
    tagline: "Hold the people system together.",
    targetCompetencies: ["empathy", "psychological_safety", "coaching"],
  },
  {
    id: "operations_manager",
    label: "Operations Manager",
    tagline: "Keep the work running when it breaks.",
    targetCompetencies: ["accountability", "clarity", "psychological_safety"],
  },
  {
    id: "teacher",
    label: "Teacher",
    tagline: "Lead a classroom and its parents.",
    targetCompetencies: ["empathy", "coaching", "clarity"],
  },
];

export type RoleId = (typeof ROLES)[number]["id"];

export const roleById = (id: string): RoleDef | undefined => ROLES.find((r) => r.id === id);

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.id, r.label]),
);
