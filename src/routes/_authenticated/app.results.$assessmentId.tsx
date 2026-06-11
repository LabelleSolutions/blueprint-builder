import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAssessmentWithResult, ROLE_LABEL, type LeadershipRole } from "@/lib/assessments.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/results/$assessmentId")({
  component: ResultsPage,
});

const BARS: { key: "empathy" | "accountability" | "coaching" | "clarity" | "psychological_safety"; label: string; weight: string }[] = [
  { key: "empathy", label: "Empathy", weight: "20%" },
  { key: "accountability", label: "Accountability", weight: "20%" },
  { key: "coaching", label: "Coaching", weight: "25%" },
  { key: "clarity", label: "Clarity", weight: "15%" },
  { key: "psychological_safety", label: "Psychological Safety", weight: "20%" },
];

function ResultsPage() {
  const { assessmentId } = Route.useParams();
  const get = useServerFn(getAssessmentWithResult);
  const { data, isLoading } = useQuery({
    queryKey: ["result", assessmentId],
    queryFn: () => get({ data: { id: assessmentId } }),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading your report…</div>;
  const { assessment, result } = data;
  if (!result) {
    return (
      <div>
        <p className="text-muted-foreground">No report yet for this assessment.</p>
        <Button asChild className="mt-4">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const readiness = Math.round(Number(result.readiness_score));
  const proj = (result.outcome_projection ?? {}) as {
    trust_30d?: number;
    team_morale_90d?: number;
    promotion_readiness_365d?: number;
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-primary">
          {ROLE_LABEL[assessment.role as LeadershipRole]}
        </div>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Your readiness report</h1>
      </div>

      <section className="grid gap-6 rounded-2xl border border-border bg-card p-8 sm:grid-cols-[auto_1fr] sm:items-center">
        <Gauge value={readiness} />
        <div>
          <div className="text-sm uppercase tracking-wider text-muted-foreground">Readiness</div>
          <div className="font-serif text-5xl tracking-tight">{readiness}<span className="text-2xl text-muted-foreground">/100</span></div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Weighted across the five leadership competencies. Repeat in two weeks to see movement.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="font-serif text-2xl tracking-tight">Competencies</h2>
        <ul className="mt-6 space-y-4">
          {BARS.map(({ key, label, weight }) => {
            const v = (result as Record<string, unknown>)[key] as number;
            return (
              <li key={key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">
                    <span className="mr-2 text-xs">{weight}</span>
                    <span className="font-semibold text-foreground">{v}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${v}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-8">
          <h3 className="font-serif text-xl tracking-tight">Strengths</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {(result.strengths as string[]).map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-primary">✓</span>{s}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-8">
          <h3 className="font-serif text-xl tracking-tight">Development areas</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {(result.missed as string[]).map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-8">
        <h3 className="font-serif text-xl tracking-tight">Suggested next actions</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {(result.suggestions as string[]).map((s, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">→</span>{s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-8">
        <h3 className="font-serif text-xl tracking-tight">Coaching feedback</h3>
        <p className="mt-4 leading-relaxed text-foreground">{result.coaching_feedback}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-8">
        <h3 className="font-serif text-xl tracking-tight">Outcome projection</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Projection label="Trust" delta={proj.trust_30d ?? 0} horizon="30 days" />
          <Projection label="Team morale" delta={proj.team_morale_90d ?? 0} horizon="90 days" />
          <Projection label="Promotion readiness" delta={proj.promotion_readiness_365d ?? 0} horizon="365 days" />
        </div>
      </section>

      <div className="flex justify-center gap-3 pt-4">
        <Button asChild size="lg" variant="outline"><Link to="/app">Dashboard</Link></Button>
        <Button asChild size="lg"><Link to="/app/assess">Take another</Link></Button>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r={r} stroke="var(--muted)" strokeWidth="12" fill="none" />
      <circle
        cx="70"
        cy="70"
        r={r}
        stroke="var(--primary)"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset .6s" }}
      />
      <text x="70" y="76" textAnchor="middle" className="fill-foreground font-serif" fontSize="28">
        {value}
      </text>
    </svg>
  );
}

function Projection({ label, delta, horizon }: { label: string; delta: number; horizon: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{horizon}</div>
      <div className="mt-1 text-sm">{label}</div>
      <div className="mt-2 font-serif text-2xl tracking-tight text-primary">
        +{delta}
      </div>
    </div>
  );
}
