import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { startAssessment, ROLE_LABEL, type LeadershipRole } from "@/lib/assessments.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/assess/")({
  component: RoleSelection,
});

const ROLES: { role: LeadershipRole; tagline: string }[] = [
  { role: "engineering_manager", tagline: "Lead engineers through delivery and growth." },
  { role: "team_lead", tagline: "Set direction inside a hands-on team." },
  { role: "project_manager", tagline: "Drive scope, schedule, and stakeholders." },
  { role: "hr_manager", tagline: "Hold the people system together." },
  { role: "operations_manager", tagline: "Keep the work running when it breaks." },
  { role: "teacher", tagline: "Lead a classroom and its parents." },
];

function RoleSelection() {
  const navigate = useNavigate();
  const start = useServerFn(startAssessment);
  const [loading, setLoading] = useState<LeadershipRole | null>(null);

  async function pick(role: LeadershipRole) {
    setLoading(role);
    try {
      const { assessmentId } = await start({ data: { role } });
      navigate({ to: "/app/assess/$assessmentId", params: { assessmentId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start assessment");
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Pick the role you lead</h1>
      <p className="mt-2 text-muted-foreground">
        You'll get a scenario tailored to that role.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map(({ role, tagline }) => (
          <button
            key={role}
            onClick={() => pick(role)}
            disabled={!!loading}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-sm disabled:opacity-60"
          >
            <div className="font-serif text-xl tracking-tight">{ROLE_LABEL[role]}</div>
            <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
            <div className="mt-6 text-xs font-medium text-primary group-hover:underline">
              {loading === role ? "Starting…" : "Start →"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
