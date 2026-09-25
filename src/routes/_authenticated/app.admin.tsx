import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getRuntimeConfig } from "@/lib/assessments.functions";
import {
  listScenarios, reviewScenario, createScenario, updateScenario, deleteScenario,
  updateCompetency, setWeights, updateRoleProfile, listPreviewResults,
} from "@/lib/admin.functions";
import { proposeConfigChanges, type ProposedOp } from "@/lib/admin-assistant.functions";
import { computeReadiness, type RuntimeCompetency, type RuntimeRole } from "@/lib/runtime-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Admin Studio — Mastery" }, { name: "robots", content: "noindex" }] }),
  component: AdminStudio,
});

type Scenario = {
  id: string; role: string; title: string; prompt: string; created_at: string;
  status: string; review_notes: string | null; reviewed_by: string | null; created_by: string | null;
};

function AdminStudio() {
  const getCfg = useServerFn(getRuntimeConfig);
  const cfg = useQuery({ queryKey: ["runtime-config"], queryFn: () => getCfg() });
  if (cfg.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!cfg.data?.isAdmin) return <div className="text-muted-foreground">Admin access required.</div>;
  const { competencies, roles } = cfg.data;

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Admin Studio</h1>
      <p className="mt-2 text-muted-foreground">Approve scenarios, tune the scoring model and calibrate against human raters.</p>
      <Tabs defaultValue="approvals" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="competencies">Competencies & weights</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="rater">Human rater</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals"><Approvals roles={roles} /></TabsContent>
        <TabsContent value="scenarios"><ScenarioEditor roles={roles} /></TabsContent>
        <TabsContent value="competencies"><CompetencyEditor competencies={competencies} /></TabsContent>
        <TabsContent value="roles"><RoleEditor roles={roles} competencies={competencies} /></TabsContent>
        <TabsContent value="rater"><RaterList roles={roles} /></TabsContent>
        <TabsContent value="assistant"><Assistant /></TabsContent>
      </Tabs>
    </div>
  );
}

const roleLabel = (roles: RuntimeRole[], id: string) => roles.find((r) => r.id === id)?.label ?? id;

function useScenarios() {
  const list = useServerFn(listScenarios);
  return useQuery({ queryKey: ["admin-scenarios"], queryFn: () => list() as Promise<Scenario[]> });
}

function StatusBadge({ s }: { s: string }) {
  const cls = s === "approved" ? "bg-primary/10 text-primary" : s === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s}</span>;
}

function Approvals({ roles }: { roles: RuntimeRole[] }) {
  const q = useScenarios();
  const qc = useQueryClient();
  const review = useServerFn(reviewScenario);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const submitted = (q.data ?? []).filter((s) => s.created_by);
  async function act(id: string, status: "approved" | "rejected") {
    try {
      await review({ data: { id, status, notes: notes[id] ?? "" } });
      toast.success(`Scenario ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-scenarios"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  if (q.isLoading) return <p className="mt-6 text-muted-foreground">Loading…</p>;
  if (!submitted.length) return <p className="mt-6 text-muted-foreground">No leader-submitted scenarios yet.</p>;
  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground">The AI reviewer decides instantly when a leader submits. You can override any decision here.</p>
      {submitted.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge s={s.status} />
            <span className="text-xs text-muted-foreground">{roleLabel(roles, s.role)} · reviewed by {s.reviewed_by ?? "—"}</span>
          </div>
          <div className="mt-2 font-serif text-xl">{s.title}</div>
          <p className="mt-2 whitespace-pre-line text-sm">{s.prompt}</p>
          {s.review_notes && <p className="mt-3 text-sm italic text-muted-foreground">“{s.review_notes}”</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Input className="max-w-md" placeholder="Note to the leader (optional)" value={notes[s.id] ?? ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} />
            <Button size="sm" onClick={() => act(s.id, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => act(s.id, "rejected")}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScenarioEditor({ roles }: { roles: RuntimeRole[] }) {
  const q = useScenarios();
  const qc = useQueryClient();
  const create = useServerFn(createScenario);
  const update = useServerFn(updateScenario);
  const del = useServerFn(deleteScenario);
  const [edit, setEdit] = useState<{ id?: string; role: string; title: string; prompt: string } | null>(null);
  async function save() {
    if (!edit) return;
    try {
      const payload = { role: edit.role, title: edit.title, prompt: edit.prompt };
      if (edit.id) await update({ data: { ...payload, id: edit.id } });
      else await create({ data: payload });
      toast.success("Saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-scenarios"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this scenario?")) return;
    try { await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["admin-scenarios"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div className="mt-6 space-y-4">
      <Button onClick={() => setEdit({ role: roles[0]?.id ?? "", title: "", prompt: "" })}>New scenario</Button>
      {edit && (
        <div className="space-y-3 rounded-2xl border border-primary bg-card p-5">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <Input placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          <Textarea className="min-h-[160px]" placeholder="Scenario prompt" value={edit.prompt} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} />
          <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
        </div>
      )}
      {(q.data ?? []).map((s) => (
        <div key={s.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{roleLabel(roles, s.role)} <StatusBadge s={s.status} />{s.created_by && <span>leader-submitted</span>}</div>
            <div className="mt-1 font-medium">{s.title}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEdit({ id: s.id, role: s.role, title: s.title, prompt: s.prompt })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompetencyEditor({ competencies }: { competencies: RuntimeCompetency[] }) {
  const qc = useQueryClient();
  const saveWeights = useServerFn(setWeights);
  const saveComp = useServerFn(updateCompetency);
  const previewFn = useServerFn(listPreviewResults);
  const preview = useQuery({ queryKey: ["admin-preview"], queryFn: () => previewFn() });
  const [w, setW] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, RuntimeCompetency>>({});
  useEffect(() => {
    setW(Object.fromEntries(competencies.map((c) => [c.id, Math.round(c.weight * 100)])));
    setDrafts(Object.fromEntries(competencies.map((c) => [c.id, c])));
  }, [competencies]);
  const total = Object.values(w).reduce((a, b) => a + (b || 0), 0);
  const live = useMemo(() => competencies.map((c) => ({ id: c.id, weight: (w[c.id] ?? 0) / 100 })), [competencies, w]);

  async function persistWeights() {
    try {
      await saveWeights({ data: { weights: live } });
      toast.success("Weights saved — new assessments use them now");
      qc.invalidateQueries({ queryKey: ["runtime-config"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function persistComp(id: string) {
    const d = drafts[id];
    try {
      await saveComp({ data: { id, label: d.label, description: d.description, signals: d.signals, templates: d.templates } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["runtime-config"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Readiness weights</h2>
            <span className={`text-sm ${total === 100 ? "text-primary" : "text-destructive"}`}>Total {total}%</span>
          </div>
          <div className="mt-4 space-y-3">
            {competencies.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-48 text-sm">{drafts[c.id]?.label ?? c.label}</span>
                <input type="range" min={0} max={100} value={w[c.id] ?? 0} onChange={(e) => setW({ ...w, [c.id]: Number(e.target.value) })} className="flex-1 accent-primary" />
                <span className="w-12 text-right text-sm tabular-nums">{w[c.id] ?? 0}%</span>
              </div>
            ))}
          </div>
          <Button className="mt-4" disabled={total !== 100} onClick={persistWeights}>Save weights</Button>
        </div>
        {competencies.map((c) => {
          const d = drafts[c.id];
          if (!d) return null;
          const set = (patch: Partial<RuntimeCompetency>) => setDrafts({ ...drafts, [c.id]: { ...d, ...patch } });
          const setT = (k: keyof RuntimeCompetency["templates"], v: string) => set({ templates: { ...d.templates, [k]: v } });
          return (
            <details key={c.id} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-medium">{d.label}</summary>
              <div className="mt-4 space-y-3">
                <Input value={d.label} onChange={(e) => set({ label: e.target.value })} />
                <Textarea value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="Description (used in the AI rubric)" />
                {(["strength", "missed", "suggestion", "coachingFocus"] as const).map((k) => (
                  <div key={k}><label className="text-xs text-muted-foreground">{k}</label><Input value={d.templates[k]} onChange={(e) => setT(k, e.target.value)} /></div>
                ))}
                <Button size="sm" onClick={() => persistComp(c.id)}>Save competency</Button>
              </div>
            </details>
          );
        })}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Live score preview</h2>
        <p className="mt-1 text-xs text-muted-foreground">Recent reports re-weighted with your unsaved weights.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {(preview.data ?? []).map((r) => (
            <li key={r.id} className="flex justify-between">
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              <span className="tabular-nums">{Math.round(r.savedReadiness)} → <b>{Math.round(computeReadiness(r.scores, live))}</b></span>
            </li>
          ))}
          {!preview.data?.length && <li className="text-muted-foreground">No reports yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function RoleEditor({ roles, competencies }: { roles: RuntimeRole[]; competencies: RuntimeCompetency[] }) {
  const qc = useQueryClient();
  const save = useServerFn(updateRoleProfile);
  const [drafts, setDrafts] = useState<Record<string, RuntimeRole>>({});
  useEffect(() => setDrafts(Object.fromEntries(roles.map((r) => [r.id, r]))), [roles]);
  async function persist(id: string) {
    const d = drafts[id];
    try {
      await save({ data: { id, label: d.label, tagline: d.tagline, targetCompetencies: d.targetCompetencies } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["runtime-config"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {roles.map((r) => {
        const d = drafts[r.id];
        if (!d) return null;
        const set = (p: Partial<RuntimeRole>) => setDrafts({ ...drafts, [r.id]: { ...d, ...p } });
        return (
          <div key={r.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Input value={d.label} onChange={(e) => set({ label: e.target.value })} />
            <Input value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {competencies.map((c) => {
                const on = d.targetCompetencies.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => set({ targetCompetencies: on ? d.targetCompetencies.filter((x) => x !== c.id) : [...d.targetCompetencies, c.id] })}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
            <Button size="sm" onClick={() => persist(r.id)}>Save role</Button>
          </div>
        );
      })}
    </div>
  );
}

function RaterList({ roles }: { roles: RuntimeRole[] }) {
  const previewFn = useServerFn(listPreviewResults);
  const q = useQuery({ queryKey: ["admin-preview"], queryFn: () => previewFn() });
  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">Pick a scored response, score it yourself (or have a colleague do it), and compare with the AI.</p>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {(q.data ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-3">
            <div className="text-sm">{roleLabel(roles, r.role)} <span className="text-muted-foreground">· {new Date(r.createdAt).toLocaleString()} · AI {Math.round(r.savedReadiness)}/100</span></div>
            <Button asChild size="sm" variant="ghost"><Link to="/app/admin/rate/$assessmentId" params={{ assessmentId: r.id }}>Rate →</Link></Button>
          </li>
        ))}
        {!q.data?.length && <li className="px-5 py-6 text-sm text-muted-foreground">No scored reports yet.</li>}
      </ul>
    </div>
  );
}

function Assistant() {
  const propose = useServerFn(proposeConfigChanges);
  const qc = useQueryClient();
  const fns = {
    update_competency: useServerFn(updateCompetency), set_weights: useServerFn(setWeights), update_role: useServerFn(updateRoleProfile),
    create_scenario: useServerFn(createScenario), update_scenario: useServerFn(updateScenario), delete_scenario: useServerFn(deleteScenario),
  };
  const getCfg = useServerFn(getRuntimeConfig);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<{ summary: string; operations: ProposedOp[] } | null>(null);

  async function ask() {
    setBusy(true);
    try { setPlan(await propose({ data: { instruction: text } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function apply(op: ProposedOp) {
    try {
      const cfg = await getCfg();
      if (op.type === "set_weights" && op.weights) await fns.set_weights({ data: { weights: op.weights } });
      else if (op.type === "update_competency") {
        const c = cfg.competencies.find((x) => x.id === op.target_id);
        if (!c) throw new Error("Unknown competency");
        await fns.update_competency({ data: { id: c.id, label: op.label ?? c.label, description: op.description ?? c.description, signals: c.signals,
          templates: { strength: op.strength ?? c.templates.strength, missed: op.missed ?? c.templates.missed, suggestion: op.suggestion ?? c.templates.suggestion, coachingFocus: op.coaching_focus ?? c.templates.coachingFocus } } });
      } else if (op.type === "update_role") {
        const r = cfg.roles.find((x) => x.id === op.target_id);
        if (!r) throw new Error("Unknown role");
        await fns.update_role({ data: { id: r.id, label: op.label ?? r.label, tagline: op.tagline ?? r.tagline, targetCompetencies: op.target_competencies ?? r.targetCompetencies } });
      } else if (op.type === "create_scenario") await fns.create_scenario({ data: { role: op.role, title: op.title, prompt: op.prompt } });
      else if (op.type === "update_scenario") await fns.update_scenario({ data: { id: op.target_id, role: op.role, title: op.title, prompt: op.prompt } });
      else if (op.type === "delete_scenario") await fns.delete_scenario({ data: { id: op.target_id } });
      toast.success("Applied");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div className="mt-6 space-y-4">
      <Textarea placeholder="e.g. Make coaching worth 30% and reduce clarity to 10%" value={text} onChange={(e) => setText(e.target.value)} />
      <Button onClick={ask} disabled={busy || text.trim().length < 3}>{busy ? "Thinking…" : "Propose changes"}</Button>
      {plan && (
        <div className="space-y-3">
          <p className="text-sm">{plan.summary}</p>
          {plan.operations.map((op, i) => (
            <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-sm">
              <div><b>{op.type.replace(/_/g, " ")}</b> {op.target_id ?? op.title ?? ""}<p className="text-muted-foreground">{op.rationale}</p></div>
              <Button size="sm" variant="outline" onClick={() => apply(op)}>Apply</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
