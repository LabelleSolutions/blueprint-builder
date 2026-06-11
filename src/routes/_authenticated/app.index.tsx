import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyAssessments } from "@/lib/assessments.functions";
import { ROLE_LABEL, type LeadershipRole } from "@/lib/assessments.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const list = useServerFn(listMyAssessments);
  const { data, isLoading } = useQuery({
    queryKey: ["my-assessments"],
    queryFn: () => list(),
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Your assessments</h1>
          <p className="mt-2 text-muted-foreground">
            Practice a scenario and get a readiness report.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/app/assess">Start new assessment</Link>
        </Button>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">No assessments yet.</p>
            <Button asChild className="mt-4">
              <Link to="/app/assess">Take your first one</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((a) => {
              const r = Array.isArray(a.result) ? a.result[0] : a.result;
              return (
                <li key={a.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <div className="font-medium">{ROLE_LABEL[a.role as LeadershipRole] ?? a.role}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} · {a.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {r?.readiness_score != null && (
                      <span className="text-sm font-medium text-primary">
                        {Number(r.readiness_score).toFixed(0)}/100
                      </span>
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        to={a.status === "scored" ? "/app/results/$assessmentId" : "/app/assess/$assessmentId"}
                        params={{ assessmentId: a.id }}
                      >
                        {a.status === "scored" ? "View report" : "Resume"}
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
