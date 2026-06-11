import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mastery — Leadership Readiness Assessment" },
      {
        name: "description",
        content:
          "Get a 5-competency readiness report on how you handle real leadership scenarios — empathy, accountability, coaching, clarity, psychological safety.",
      },
      { property: "og:title", content: "Mastery — Leadership Readiness Assessment" },
      {
        property: "og:description",
        content: "AI-judged scenario assessment that scores your leadership readiness.",
      },
    ],
  }),
  component: Landing,
});

const COMPETENCIES = [
  { name: "Empathy", weight: "20%" },
  { name: "Accountability", weight: "20%" },
  { name: "Coaching", weight: "25%" },
  { name: "Clarity", weight: "15%" },
  { name: "Psychological Safety", weight: "20%" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight">Mastery</div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-primary">
          Leadership Readiness Assessment
        </p>
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-foreground sm:text-6xl">
          Find out how ready you are to lead.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Pick a role. Respond to a real workplace scenario. Get a five-competency report
          on your leadership readiness — and a plan for what to work on next.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start your assessment</Link>
          </Button>
        </div>

        <section className="mt-24 rounded-2xl border border-border bg-card p-8 text-left">
          <h2 className="font-serif text-2xl tracking-tight">Five core competencies</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your readiness score is weighted across the signals leaders demonstrate every day.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {COMPETENCIES.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.weight}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mastery. MVP build.
      </footer>
    </div>
  );
}
