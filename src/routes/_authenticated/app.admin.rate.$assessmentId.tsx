import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getRatingTarget, saveHumanRating } from "@/lib/admin.functions";
import { getRuntimeConfig } from "@/lib/assessments.functions";
import { computeReadiness } from "@/lib/runtime-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/admin/rate/$assessmentId")({
  head: () => ({ meta: [{ title: "Human rating — Mastery" }, { name: "robots", content: "noindex" }] }),
  component: RatePage,
});

function RatePage() {
  const { assessmentId } = Route.useParams();
  const get = useServerFn(getRatingTarget);
  const getCfg = useServerFn(getRuntimeConfig);
  const save = useServerFn(saveHumanRating);
  const cfg = useQuery({ queryKey: ["runtime-config"], queryFn: () => getCfg() });
  const q = useQuery({ queryKey: ["rate", assessmentId], queryFn: () => get({ data: { id: assessmentId } }) });
  const [scores, setScores] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (q.isLoading || cfg.isLoading || !q.data || !cfg.data) return <div className="text-muted-foreground">Loading…</div>;
  const comps = cfg.data.competencies;
  const ai = Object.fromEntries(q.data.explainability.map((e) => [e.id, e]));
  const complete = comps.every((c) => typeof scores[c.id] === "number");

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { assessmentId, raterName: name, scores, notes } });
      toast.success("Human rating saved");
      setScores({}); setNotes("");
      q.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-8">
      <Link to="/app/admin" className="text-sm text-primary">← Admin Studio</Link>
      <div>
        <h1 className="font-serif text-3xl tracking-tight">{q.data.scenario?.title}</h1>
        <p className="mt-4 whitespace-pre-line rounded-2xl border border-border bg-card p-5 text-sm">{q.data.scenario?.prompt}</p>
        <h2 className="mt-6 text-sm font-medium">Leader's response</h2>
        <p className="mt-2 whitespace-pre-line rounded-2xl border border-border bg-muted/40 p-5 text-sm">{q.data.response}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Your scores (0–100)</h2>
        <p className="mt-1 text-xs text-muted-foreground">Score before looking at the AI column to avoid anchoring.</p>
        <div className="mt-4 space-y-3">
          {comps.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-52 text-sm">{c.label}</span>
              <Input type="number" min={0} max={100} className="w-24" value={scores[c.id] ?? ""}
                onChange={(e) => setScores({ ...scores, [c.id]: Math.max(0, Math.min(100, Number(e.target.value))) })} />
            </div>
          ))}
          <Input placeholder="Rater name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button disabled={!complete || !name.trim() || saving} onClick={submit}>{saving ? "Saving…" : "Save rating"}</Button>
        </div>
      </div>

      {q.data.ratings.map((r) => {
        const humanReadiness = computeReadiness(comps.map((c) => ({ id: c.id, score: r.scores[c.id] ?? 0 })), comps);
        const diffs = comps.map((c) => Math.abs((r.scores[c.id] ?? 0) - (ai[c.id]?.score ?? 0)));
        const mad = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl">AI vs {r.rater_name}</h2>
              <span className="text-sm text-muted-foreground">
                Readiness: AI <b>{Math.round(q.data.readiness ?? 0)}</b> · Human <b>{Math.round(humanReadiness)}</b> · avg gap <b>{mad.toFixed(1)}</b> pts
              </span>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Competency</th><th>AI</th><th>Human</th><th>Gap</th></tr></thead>
              <tbody>
                {comps.map((c, i) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2">{c.label}</td>
                    <td className="tabular-nums">{ai[c.id]?.score ?? "—"}</td>
                    <td className="tabular-nums">{r.scores[c.id] ?? "—"}</td>
                    <td className={`tabular-nums ${diffs[i] > 15 ? "text-destructive" : "text-primary"}`}>{diffs[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.notes && <p className="mt-3 text-sm italic text-muted-foreground">{r.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}
