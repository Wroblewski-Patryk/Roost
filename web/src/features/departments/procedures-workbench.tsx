import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";

type ProcedureStep = {
  id: string;
  stepOrder: number;
  instruction: string;
  stepType: string;
  expectedInput?: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  validationRule?: Record<string, unknown>;
  rollbackInstruction?: string | null;
};

type Procedure = {
  id: string;
  familyId: string;
  name: string;
  purpose: string;
  scope?: string | null;
  expectedResult?: string | null;
  requiredTools: string[];
  requiredPermissions: string[];
  status: string;
  version: number;
  process?: { id: string; name: string } | null;
  ownerRole?: { id: string; name: string } | null;
  steps: ProcedureStep[];
  updatedAt: string;
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function commaList(value: FormDataEntryValue | null) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function ProceduresWorkbench() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("current");
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api<{ data: Procedure[] }>("/v1/process-core/procedures");
      setProcedures(response.data);
      setStatus("ready");
      setSelectedId((current) => current && response.data.some((item) => item.id === current) ? current : response.data[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "procedures_load_failed");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const selected = procedures.find((item) => item.id === selectedId) || null;
  const filtered = useMemo(() => procedures.filter((procedure) => {
    if (statusFilter === "current" && ["retired", "archived"].includes(procedure.status)) return false;
    if (statusFilter !== "all" && statusFilter !== "current" && procedure.status !== statusFilter) return false;
    return `${procedure.name} ${procedure.purpose} ${procedure.scope || ""}`.toLowerCase().includes(query.toLowerCase());
  }), [procedures, query, statusFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      purpose: form.get("purpose"),
      scope: form.get("scope") || undefined,
      expectedResult: form.get("expectedResult"),
      requiredTools: commaList(form.get("requiredTools")),
      requiredPermissions: commaList(form.get("requiredPermissions")),
      steps: lines(form.get("steps")).map((instruction) => ({ instruction, stepType: "manual" }))
    };
    if (mode === "edit" && selected) {
      await api(`/v1/process-core/procedures/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("/v1/process-core/procedures", { method: "POST", body: JSON.stringify(payload) });
    }
    setMode("list");
    await load();
  }

  async function activate() {
    if (!selected) return;
    try {
      await api(`/v1/process-core/procedures/${selected.id}/actions/activate`, { method: "POST", body: "{}" });
      await load();
    } catch (caught) { setError(caught instanceof AppApiError ? caught.code : "procedure_activation_failed"); }
  }

  async function archive() {
    if (!selected) return;
    await api(`/v1/process-core/procedures/${selected.id}/actions/archive`, { method: "POST", body: "{}" });
    await load();
  }

  return (
    <section className="grid min-h-[38rem] gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="rounded-company border border-base-300 bg-base-100 p-4">
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-black uppercase text-primary">Process Core</p><h1 className="text-xl font-black">Procedures</h1></div><button className="btn btn-primary btn-sm btn-square" onClick={() => { setMode("create"); setSelectedId(null); }} aria-label="Create procedure"><i className="ph-bold ph-plus" aria-hidden="true"></i></button></div>
        <input className="input input-bordered input-sm mt-4 w-full" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search procedures" />
        <select className="select select-bordered select-sm mt-2 w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="current">Current</option><option value="draft">Drafts</option><option value="active">Active</option><option value="all">All versions</option></select>
        <div className="mt-4 grid gap-2">{filtered.map((procedure) => <button className={`rounded-company border p-3 text-left ${selectedId === procedure.id ? "border-primary bg-primary/5" : "border-base-300"}`} key={procedure.id} onClick={() => { setSelectedId(procedure.id); setMode("list"); }}><div className="flex justify-between gap-2"><strong className="line-clamp-2 text-sm">{procedure.name}</strong><span className="badge badge-outline badge-sm">v{procedure.version}</span></div><p className="mt-1 text-xs text-company-muted">{humanize(procedure.status)}</p></button>)}</div>
      </aside>

      <main className="rounded-company border border-base-300 bg-base-100 p-5">
        {status === "loading" ? <CcNotice tone="loading" title="Loading procedures" /> : null}
        {status === "error" || error ? <CcNotice tone="error" title={error || "Procedures could not load"} /> : null}
        {mode === "create" || mode === "edit" ? <form className="grid gap-4" onSubmit={submit}><div><p className="text-xs font-black uppercase text-primary">{mode === "edit" && selected?.status !== "draft" ? "Propose versioned improvement" : "Procedure draft"}</p><h2 className="text-2xl font-black">{mode === "edit" ? `Edit ${selected?.name}` : "Create procedure"}</h2><p className="mt-1 text-sm text-company-muted">An AI or human may improve an active procedure, but the change becomes a new draft version until explicitly activated.</p></div><label className="form-control"><span className="label-text font-bold">Name</span><input className="input input-bordered" name="name" defaultValue={selected?.name || ""} required /></label><label className="form-control"><span className="label-text font-bold">Purpose</span><textarea className="textarea textarea-bordered" name="purpose" defaultValue={selected?.purpose || ""} required></textarea></label><div className="grid gap-4 md:grid-cols-2"><label className="form-control"><span className="label-text font-bold">Scope</span><textarea className="textarea textarea-bordered" name="scope" defaultValue={selected?.scope || ""}></textarea></label><label className="form-control"><span className="label-text font-bold">Expected result</span><textarea className="textarea textarea-bordered" name="expectedResult" defaultValue={selected?.expectedResult || ""} required></textarea></label></div><div className="grid gap-4 md:grid-cols-2"><label className="form-control"><span className="label-text font-bold">Required tools (comma separated)</span><input className="input input-bordered" name="requiredTools" defaultValue={(selected?.requiredTools || []).join(", ")} /></label><label className="form-control"><span className="label-text font-bold">Required permissions (comma separated)</span><input className="input input-bordered" name="requiredPermissions" defaultValue={(selected?.requiredPermissions || []).join(", ")} /></label></div><label className="form-control"><span className="label-text font-bold">Steps — one instruction per line</span><textarea className="textarea textarea-bordered min-h-64 font-mono" name="steps" defaultValue={selected?.steps.map((step) => step.instruction).join("\n") || ""} required></textarea></label><div className="flex gap-2"><CcButton type="submit">Save draft</CcButton><CcButton variant="ghost" onClick={() => setMode("list")}>Cancel</CcButton></div></form> : selected ? <div className="grid gap-5"><header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex gap-2"><span className={`badge ${selected.status === "active" ? "badge-success" : "badge-warning"}`}>{humanize(selected.status)}</span><span className="badge badge-outline">Version {selected.version}</span></div><h2 className="mt-3 text-3xl font-black">{selected.name}</h2><p className="mt-2 max-w-3xl text-company-muted">{selected.purpose}</p></div><div className="flex flex-wrap gap-2"><CcButton variant="outline" onClick={() => setMode("edit")}>{selected.status === "draft" ? "Edit draft" : "Propose improvement"}</CcButton>{selected.status === "draft" ? <CcButton variant="success" onClick={() => void activate()}>Activate</CcButton> : null}<CcButton variant="ghost" onClick={() => void archive()}>Archive</CcButton></div></header><section className="grid gap-4 md:grid-cols-3"><article className="rounded-company bg-base-200/60 p-4"><p className="text-xs font-black uppercase text-company-muted">Scope</p><p className="mt-2 text-sm">{selected.scope || "Not specified"}</p></article><article className="rounded-company bg-base-200/60 p-4"><p className="text-xs font-black uppercase text-company-muted">Expected result</p><p className="mt-2 text-sm">{selected.expectedResult || "Missing — activation is blocked"}</p></article><article className="rounded-company bg-base-200/60 p-4"><p className="text-xs font-black uppercase text-company-muted">Authority</p><p className="mt-2 text-sm">{selected.requiredPermissions.length ? selected.requiredPermissions.join(", ") : "No explicit permission requirements"}</p></article></section><section><h3 className="text-xl font-black">Procedure steps</h3><ol className="mt-4 grid gap-3">{selected.steps.map((step) => <li className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-company border border-base-300 p-4" key={step.id}><span className="grid size-9 place-items-center rounded-full bg-primary font-black text-primary-content">{step.stepOrder}</span><div><strong>{step.instruction}</strong><p className="mt-1 text-xs text-company-muted">{humanize(step.stepType)}</p>{step.rollbackInstruction ? <p className="mt-2 text-xs text-warning">Rollback: {step.rollbackInstruction}</p> : null}</div></li>)}</ol></section><section className="rounded-company border border-info/30 bg-info/5 p-4"><h3 className="font-black">AI improvement contract</h3><p className="mt-1 text-sm">Agents may read this procedure and propose an updated draft through the API. Active behavior changes only after the version passes explicit activation, leaving audit and event evidence.</p></section></div> : <CcNotice tone="empty" title="No procedure selected" detail="Create a procedure to make repeatable work available to people and supervised AI agents." />}
      </main>
    </section>
  );
}
