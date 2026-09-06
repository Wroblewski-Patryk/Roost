import { FormEvent, useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcMultiSelect } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage, type MessageKey } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";
import { catalogFor, contractInput, draftFrom, fields, groups, selectReferences, validationSections, type Draft, type FieldName, type ReadyPacket, type RefGroup } from "./task-readiness-model";

export function TaskReadinessModal({ taskId, onClose, onSaved }: { taskId: string; onClose: () => void; onSaved?: () => void }) {
  const { locale, t } = useLanguage();
  const tr = (key: string) => t(`ready.${key}` as MessageKey);
  const [packet, setPacket] = useState<ReadyPacket | null>(null), [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>("loading"), [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]), [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false), [leave, setLeave] = useState(false), [expanded, setExpanded] = useState(false);
  const [links, setLinks] = useState({ projectId: "", goalId: "", assignedWorkforceEntityId: "" });
  const mounted = useRef(true), errorRef = useRef<HTMLDivElement>(null);
  function close() { if (busy && busy !== "loading") return; if (dirty) setLeave(true); else onClose(); }
  function update(next: Draft) { setDraft(next); setDirty(true); setSuccess(null); }
  function errorCopy(caught: unknown) {
    if (!(caught instanceof AppApiError)) return "error.failed";
    if (["forbidden", "workspace_read_only"].includes(caught.code)) return "error.forbidden";
    if (caught.code === "task_agent_execution_active") return "active";
    if (caught.code === "agent_execution_disabled") return "disabled";
    if (["task_ready_revalidation_required", "task_ready_context_conflict", "task_ready_contract_mismatch"].includes(caught.code)) return "error.conflict";
    if (caught.code === "task_execution_contract_invalid") return "invalid";
    return "error.failed";
  }
  async function load(applicationId?: string, preserve = false) {
    setBusy("loading"); setError(null);
    try {
      const response = await api<{ data: ReadyPacket }>(`/v1/agent-runtime/tasks/${taskId}/execution-readiness?editor=1${applicationId ? `&applicationId=${encodeURIComponent(applicationId)}` : ""}`);
      if (!mounted.current) return;
      if (!response.data.editor) throw new Error("editor_unavailable");
      setPacket(response.data);
      if (!preserve) { setDraft(draftFrom(response.data.editor)); setDirty(false); }
      setLinks({ projectId: response.data.editor.task.project?.id ?? "", goalId: response.data.editor.task.goal?.id ?? "", assignedWorkforceEntityId: response.data.editor.agent?.id ?? "" });
    } catch (caught) { if (mounted.current) setError(errorCopy(caught)); }
    finally { if (mounted.current) setBusy(null); }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [taskId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!packet || !draft || !packet.canSubmit || packet.editor.activeExecution || busy) return;
    setBusy("submitting"); setError(null); setIssues([]); setSuccess(null);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/submit-for-execution`, { method: "POST", body: JSON.stringify(contractInput(packet.editor, draft)) });
      if (!mounted.current) return;
      setDirty(false); setExpanded(false); await load(); setSuccess("accepted"); onSaved?.();
    } catch (caught) {
      if (!mounted.current) return;
      setError(errorCopy(caught)); setIssues(caught instanceof AppApiError && caught.code === "task_execution_contract_invalid" ? validationSections(caught.details) : []);
      setExpanded(true); requestAnimationFrame(() => errorRef.current?.focus());
    } finally { if (mounted.current) setBusy(null); }
  }
  async function saveLinks() {
    if (!packet?.canSubmit || busy) return;
    setBusy("links"); setError(null);
    try { await api(`/v1/operations/work-items/${taskId}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(Object.entries(links).map(([key, value]) => [key, value || null]))) }); await load(undefined, true); setDirty(true); onSaved?.(); }
    catch (caught) { setError(errorCopy(caught)); } finally { setBusy(null); }
  }
  async function queue() {
    if (!packet?.canSubmit || packet.status !== "ready" || !packet.executionEnabled || packet.editor.activeExecution || dirty || busy) return;
    setBusy("queue"); setError(null);
    try { await api("/v1/agent-runtime/executions", { method: "POST", body: JSON.stringify({ taskId, applicationId: packet.editor.applicationId }) }); await load(); setSuccess("queued"); onSaved?.(); }
    catch (caught) { setError(errorCopy(caught)); } finally { setBusy(null); }
  }
  if (leave) return <CcRecordEditorModal titleId="ready-discard-title" eyebrow={tr("title")} title={tr("leave")} closeLabel={tr("stay")} onClose={() => setLeave(false)} onSubmit={event => { event.preventDefault(); onClose(); }} actions={<><CcButton variant="ghost" onClick={() => setLeave(false)}>{tr("stay")}</CcButton><CcButton variant="warning" type="submit">{tr("discard")}</CcButton></>}><p>{tr("unsaved")}</p></CcRecordEditorModal>;
  const e = packet?.editor;
  const writable = packet?.canSubmit && !e?.activeExecution;
  const pendingLinks = e && (links.projectId !== e.task.project?.id || links.goalId !== e.task.goal?.id || links.assignedWorkforceEntityId !== e.agent?.id);
  const linksValid = Boolean(!pendingLinks && e?.task.project && e.task.goal && e.agent?.eligible && e.applicationId && ["todo", "in_progress"].includes(e.task.status));
  const showForm = e && draft && (expanded || packet?.status !== "ready");
  const reason = ["ready_pin_required", "context_changed", "context_invalid", "revalidation_required"].includes(packet?.reason ?? "") ? packet!.reason! : "revalidation_required";
  function input(name: FieldName) {
    const bounds: Record<string, [number, number]> = { maxAttempts: [1, 5], maxDurationSeconds: [60, 3600], maxOutputTokens: [128, 100000] };
    const multiline = !["version", "baseBranch", ...Object.keys(bounds)].includes(name);
    const isList = ["allowed", "forbidden", "restrictions", "criteria", "tests", "evidence"].includes(name);
    return <CcField key={name} label={tr(`field.${name}`)} hint={isList ? tr("lineHint") : bounds[name] ? `${bounds[name][0]}–${bounds[name][1]}` : undefined} required={!["prompt", "baseBranch"].includes(name)}>{({ id, describedBy }) => {
      const props = { id, "aria-describedby": describedBy, name, value: draft!.values[name], required: !["prompt", "baseBranch"].includes(name), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ ...draft!, values: { ...draft!.values, [name]: event.target.value } }) };
      return multiline ? <textarea {...props} className="textarea textarea-bordered w-full min-h-24" maxLength={name === "prompt" ? 20000 : isList ? 60000 : 2000} /> : <input {...props} className="input input-bordered w-full" type={bounds[name] ? "number" : "text"} min={bounds[name]?.[0]} max={bounds[name]?.[1]} step={bounds[name] ? 1 : undefined} maxLength={name === "baseBranch" ? 240 : 2000} />;
    }}</CcField>;
  }
  function selection(key: "competencies" | "tools" | "permissions", options: string[]) {
    const values = [...new Set([...options, ...(draft?.[key] ?? [])])];
    return <CcField label={tr(key)} required>{({ id }) => <CcMultiSelect id={id} name={key} popupLabel={tr(key)} placeholder={tr("choose")} searchPlaceholder={tr("choose")} emptyLabel={tr("empty")} clearLabel={tr("clear")} doneLabel={tr("done")} selectedLabel={tr("selected")} showValues={false} disabled={!writable || Boolean(busy)} value={draft![key]} onChange={value => update({ ...draft!, [key]: value })} options={values.map(value => ({ value, label: key === "competencies" ? value : tr(`operation.${value}`), disabled: !options.includes(value) }))} />}</CcField>;
  }
  function refs(group: RefGroup) {
    const catalog = catalogFor(e!, group), selected = draft!.refs[group];
    const stale = selected.some(item => !catalog.some(current => current.id === item.id && current.revision === item.revision));
    const options = [...catalog, ...selected.filter(item => !catalog.some(current => current.id === item.id)).map(item => ({ ...item, label: tr("staleRefs"), eligible: false }))];
    function select(ids: string[], refresh = false) { update({ ...draft!, refs: { ...draft!.refs, [group]: selectReferences(selected, catalog, ids, refresh) } }); }
    const revisionLabel = (value: string) => Number.isFinite(Date.parse(value)) && value.length > 12 ? new Date(value).toLocaleString(locale) : value;
    return <section className="grid gap-3 border-t border-base-300 pt-4" key={group}>
      <CcField label={tr(group)} hint={tr("sourceHint")} error={stale ? tr("staleRefs") : issues.includes(group) ? tr(`issue.${group}`) : undefined} required={group === "company" || group === "product" || group === "technical"}>{({ id, describedBy }) => <CcMultiSelect id={id} name={group} popupLabel={tr(group)} invalid={stale || issues.includes(group)} describedBy={describedBy} placeholder={tr("choose")} searchPlaceholder={tr("choose")} emptyLabel={tr("empty")} clearLabel={tr("clear")} doneLabel={tr("done")} selectedLabel={tr("selected")} showValues={false} disabled={!writable || Boolean(busy)} value={selected.map(item => item.id)} onChange={select} options={options.map(item => ({ value: item.id, label: `${humanizeBusinessValue(item.label, undefined, locale)} · ${revisionLabel(selected.find(row => row.id === item.id)?.revision ?? item.revision)}`, description: selected.some(row => row.id === item.id && row.revision !== item.revision) ? `${tr("currentRevision")}: ${revisionLabel(item.revision)}` : undefined, disabled: item.eligible === false }))} />}</CcField>
      {stale && writable ? <CcButton size="sm" variant="outline" onClick={() => select(selected.filter(item => catalog.some(row => row.id === item.id)).map(item => item.id), true)}>{tr("refreshRefs")}</CcButton> : null}
      {!["company", "product", "technical"].includes(group) && !selected.length ? <CcField label={tr("none")} required>{({ id }) => <input className="input input-bordered w-full" id={id} required maxLength={2000} value={draft!.none[group]} onChange={event => update({ ...draft!, none: { ...draft!.none, [group]: event.target.value } })} />}</CcField> : null}
      {group === "dependencies" ? selected.map(item => <CcField key={item.id} label={`${tr("dependencyEvidence")}: ${humanizeBusinessValue(catalog.find(row => row.id === item.id)?.label || "dependency", undefined, locale)}`} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" required maxLength={2000} value={item.evidence ?? ""} onChange={event => update({ ...draft!, refs: { ...draft!.refs, dependencies: selected.map(row => row.id === item.id ? { ...row, evidence: event.target.value } : row) } })} />}</CcField>) : null}
    </section>;
  }
  return <CcRecordEditorModal titleId="task-readiness-title" eyebrow={tr("title")} title={e?.task.title || tr("title")} description={tr("description")} closeLabel={tr("close")} onClose={close} onSubmit={submit} maxWidthClassName="max-w-5xl" actions={<>
    <CcButton className="min-h-11" onClick={close} variant="ghost" disabled={Boolean(busy && busy !== "loading")}>{tr("close")}</CcButton>
    {packet && writable ? showForm ? <CcButton key="submit" className="min-h-11" variant="primary" type="submit" loading={busy === "submitting"} disabled={Boolean(busy) || !linksValid}>{packet.revision ? tr("resubmit") : tr("submit")}</CcButton> : <CcButton key="review" className="min-h-11" variant="primary" onClick={event => { event.preventDefault(); setExpanded(true); }}>{tr("edit")}</CcButton> : null}
  </>}>
    {busy === "loading" ? <div aria-live="polite" className="grid gap-3 py-3"><p>{tr("loading")}</p><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-3/4" /></div> : null}
    {error ? <div ref={errorRef} tabIndex={-1}><CcNotice live tone="error" title={tr(error)} />{issues.length ? <ul className="mt-3 grid gap-2 text-sm list-disc pl-5">{issues.map(issue => <li key={issue}>{tr(`issue.${issue}`)}</li>)}</ul> : null}{!packet ? <CcButton onClick={() => void load()} variant="outline">{tr("retry")}</CcButton> : null}</div> : null}
    {success ? <CcNotice live tone="success" title={tr(success)} /> : null}
    {packet && e && draft ? <>
      <section aria-label={tr("title")} className="grid gap-4 border-b border-base-300 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><span className={`badge ${packet.status === "ready" ? "badge-success" : "badge-warning"}`}>{tr(["ready", "not_ready", "needs_revalidation"].includes(packet.status) ? packet.status : "needs_revalidation")}</span><span className="text-sm text-company-muted">{tr("taskStatus")}: {humanizeBusinessValue(e.task.status, undefined, locale)}</span></div><CcButton size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void load(e.applicationId ?? undefined, dirty)}>{tr("refresh")}</CcButton></div>
        {packet.status !== "ready" ? <p className="text-sm">{tr(`reason.${reason}`)}</p> : null}
        {packet.revision ? <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-company-muted">{tr("fingerprint")}</dt><dd className="font-mono break-all">{packet.revision.slice(0, 12)}…{packet.revision.slice(-8)}</dd><dd className="mt-1 text-xs text-company-muted">{packet.validationRevision === packet.revision ? tr("proof") : tr("reason.revalidation_required")}</dd></div><div><dt className="text-company-muted">{tr("author")}</dt><dd>{e.acceptance?.authorName || tr(e.acceptance?.authorType === "agent" ? "agentAuthor" : "unknownAuthor")}</dd></div><div><dt className="text-company-muted">{tr("date")}</dt><dd>{e.acceptance?.validatedAt ? new Date(e.acceptance.validatedAt).toLocaleString(locale) : "—"}</dd></div></dl> : null}
        {!packet.canSubmit ? <CcNotice tone="info" title={tr("readOnly")} /> : e.activeExecution ? <CcNotice tone="warning" title={tr("active")} /> : !linksValid ? <CcNotice tone="warning" title={tr("missingLinks")} /> : null}
        {!packet.executionEnabled ? <p className="text-sm text-company-muted">{tr("disabled")}</p> : null}
        {dirty ? <p role="status" className="text-sm text-warning">{tr("unsaved")}</p> : null}
        <div className="flex flex-wrap gap-2">{packet.status === "ready" && !writable ? <CcButton size="sm" variant="outline" onClick={() => setExpanded(!expanded)}>{tr("edit")}</CcButton> : null}{packet.status === "ready" && packet.canSubmit ? <CcButton size="sm" variant="outline" onClick={() => void queue()} disabled={!packet.executionEnabled || Boolean(busy) || dirty || e.activeExecution}>{tr("queue")}</CcButton> : null}<CcButton size="sm" variant="ghost" href="/areas?area=06-kadry&view=executions" onClick={event => { if (dirty) { event.preventDefault(); setError("unsaved"); } }}>{tr("runs")}</CcButton></div>
      </section>
      {showForm ? <fieldset disabled={!writable || Boolean(busy)} className="min-w-0 grid gap-4">
        <details open={!linksValid} className="border-b border-base-300 pb-4"><summary className="cursor-pointer py-2 font-bold">{tr("links")}</summary><p className="my-2 text-sm text-company-muted">{tr("linksHint")}</p><div className="grid gap-4 sm:grid-cols-3">{(["projectId", "goalId", "assignedWorkforceEntityId"] as const).map((key, index) => <CcField key={key} label={tr(["project", "goal", "agent"][index]!)}>{({ id }) => <CcSelect id={id} value={links[key]} onChange={event => { setLinks({ ...links, [key]: event.target.value }); setDirty(true); }}><option value="">{tr("choose")}</option>{(index === 0 ? e.projects : index === 1 ? e.goals.map(item => ({ id: item.id, name: item.title })) : e.agents).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</CcSelect>}</CcField>)}</div><CcButton className="mt-3" size="sm" variant="outline" onClick={() => void saveLinks()}>{tr("saveLinks")}</CcButton></details>
        <div className="grid gap-4 sm:grid-cols-2"><CcField label={tr("application")} required>{({ id }) => <CcSelect id={id} value={e.applicationId ?? ""} required onChange={event => { if (!event.target.value) return; update({ ...draft, refs: { ...draft.refs, product: [], technical: [] } }); void load(event.target.value, true); }}><option value="">{tr("choose")}</option>{e.applications.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</CcSelect>}</CcField><div className="text-sm"><p className="text-company-muted">{tr("goal")}</p><p>{e.task.goal?.title || "—"}</p><p className="mt-2 text-company-muted">{tr("agent")}</p><p>{e.agent?.name || "—"}</p></div></div>
        <section className="grid gap-3"><h3 className="font-bold">{tr("intent")}</h3><div className="grid gap-4 sm:grid-cols-2">{fields.intent.map(input)}</div></section>
        <section className="grid gap-3 border-t border-base-300 pt-4"><h3 className="font-bold">{tr("assignment")}</h3><div className="grid gap-4 sm:grid-cols-2"><CcField label={tr("model")} required>{({ id }) => <CcSelect required id={id} value={draft.model} onChange={event => update({ ...draft, model: event.target.value, effort: "" })}><option value="">{tr("choose")}</option>{e.models.map(item => <option key={item.id}>{item.id}</option>)}</CcSelect>}</CcField><CcField label={tr("effort")} required>{({ id }) => <CcSelect required id={id} value={draft.effort} onChange={event => update({ ...draft, effort: event.target.value })}><option value="">{tr("choose")}</option>{e.models.find(item => item.id === draft.model)?.efforts.map(value => <option key={value} value={value}>{tr(`effort.${value}`)}</option>)}</CcSelect>}</CcField>{selection("competencies", e.agent?.competencies ?? [])}{selection("tools", e.agent?.tools ?? [])}{selection("permissions", e.agent?.permissions ?? [])}</div><p className="text-sm text-company-muted">{tr("boundary")}</p></section>
        <section className="grid gap-3"><h3 className="font-bold">{tr("context")}</h3>{e.catalogTruncated ? <CcNotice tone="info" title={tr("limited")} /> : null}<div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{groups.map(refs)}</div></section>
        {(["limits", "acceptance", "recovery"] as const).map(section => <section className="grid gap-3 border-t border-base-300 pt-4" key={section}><h3 className="font-bold">{tr(section)}</h3><div className="grid gap-4 sm:grid-cols-2">{fields[section].map(input)}{section === "recovery" ? <CcField label={tr("rollbackMode")} required>{({ id }) => <CcSelect required id={id} value={draft.rollbackMode} onChange={event => update({ ...draft, rollbackMode: event.target.value })}><option value="">{tr("choose")}</option>{["restore_task_changes", "not_applicable"].map(value => <option key={value} value={value}>{tr(value)}</option>)}</CcSelect>}</CcField> : null}</div></section>)}
      </fieldset> : null}
    </> : null}
  </CcRecordEditorModal>;
}
