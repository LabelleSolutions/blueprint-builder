import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listMyScenarios, submitMyScenario } from "@/lib/scenarios.functions";
import { getRuntimeConfig, startAssessment, type LeadershipRole } from "@/lib/assessments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/scenarios")({
  head: () => ({ meta: [{ title: "My scenarios — Mastery" }, { name: "description", content: "Write your own leadership scenarios and take them as assessments." }] }),
  component: MyScenarios,
});

function MyScenarios() {
  const navigate = useNavigate();
  const list = useServerFn(listMyScenarios);
  const submit = useServerFn(submitMyScenario);
  const start = useServerFn(startAssessment);
  const getCfg = useServerFn(getRuntimeConfig);
  const cfg = useQuery({ queryKey: ["runtime-config"], queryFn: () => getCfg() });
  const q = useQuery({ queryKey: ["my-scenarios"], queryFn: () => list() });
  const roles = cfg.data?.roles ?? [];
  const [role, setRole] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await submit({ data: { role: role || roles[0]?.id, title, prompt } });
      if (r.status === "approved") toast.success("Approved — you can take it now");
      else if (r.status === "rejected") toast.error(`Not approved: ${r.notes}`);
      else toast.message(r.notes);
      if (r.status === "approved") { setTitle(""); setPrompt(""); }
      q.refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not submit"); }
    finally { setBusy(false); }
  }

  async function take(s: { id: string; role: string }) {
    try {
      const { assessmentId } = await start({ data: { role: s.role as LeadershipRole, scenarioId: s.id } });
      navigate({ to: "/app/assess/$assessmentId", params: { assessmentId } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not start"); }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="font-serif text-4xl tracking-tight">Create a scenario</h1>
        <p className="text-muted-foreground">Describe a real situation you face. Our AI reviewer checks it straight away; once approved you can take it as an assessment.</p>
        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={role || roles[0]?.id || ""} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <Input placeholder="Title, e.g. A senior engineer missed three deadlines" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        <Textarea className="min-h-[220px]" placeholder="Write it to the leader: 'You manage… This morning…' (at least 80 characters)" value={prompt} onChange={(e) => setPrompt(e.target.value)} required minLength={80} />
        <div className="text-xs text-muted-foreground">{prompt.length} / 80+ characters</div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Reviewing…" : "Submit for review"}</Button>
      </form>

      <div>
        <h2 className="font-serif text-2xl">My scenarios</h2>
        <ul className="mt-4 space-y-3">
          {(q.data ?? []).map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{s.title}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-primary/10 text-primary" : s.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
              </div>
              {s.review_notes && <p className="mt-2 text-sm text-muted-foreground">{s.review_notes}</p>}
              {s.status === "approved" && <Button size="sm" className="mt-3" onClick={() => take(s)}>Take this assessment</Button>}
            </li>
          ))}
          {!q.isLoading && !q.data?.length && <li className="text-sm text-muted-foreground">You haven't written any scenarios yet.</li>}
        </ul>
      </div>
    </div>
  );
}
