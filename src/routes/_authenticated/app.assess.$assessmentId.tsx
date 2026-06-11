import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAssessment, submitResponse, ROLE_LABEL, type LeadershipRole } from "@/lib/assessments.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/assess/$assessmentId")({
  component: ScenarioPage,
});

function ScenarioPage() {
  const { assessmentId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getAssessment);
  const submit = useServerFn(submitResponse);

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => get({ data: { id: assessmentId } }),
  });

  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (response.trim().length < 20) {
      toast.error("Please write at least a couple of sentences.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: { id: assessmentId, response } });
      navigate({ to: "/app/results/$assessmentId", params: { assessmentId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  if (isLoading || !data) {
    return <div className="text-muted-foreground">Loading scenario…</div>;
  }

  const scenario = data.scenario as { title: string; prompt: string } | null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-xs uppercase tracking-[0.2em] text-primary">
        {ROLE_LABEL[data.role as LeadershipRole]}
      </div>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">{scenario?.title}</h1>
      <p className="mt-6 whitespace-pre-line rounded-2xl border border-border bg-card p-6 text-foreground">
        {scenario?.prompt}
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label className="text-sm font-medium" htmlFor="response">
          Your response
        </label>
        <Textarea
          id="response"
          className="mt-2 min-h-[260px]"
          placeholder="Walk through how you'd handle this — what you'd say, what you'd commit to, what comes next."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          required
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{response.length} chars</span>
          <span>Longer, specific answers score better.</span>
        </div>
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
          {submitting ? "Scoring…" : "Submit for evaluation"}
        </Button>
      </form>
    </div>
  );
}
