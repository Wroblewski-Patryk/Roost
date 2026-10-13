import { TaskDecisionAuthorityHistory } from "./decision-authority";
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
import { ChangedContextSources } from "./changed-context-sources";
import { CompanyInformationResult } from "./company-information-result";
import { CompanyInformationAuthorization } from "./company-information-authorization";
import { SingleTaskFields } from "./single-task-fields";
import { TaskRoleFields, TaskRoleSummary } from "./task-role-fields";
import { TaskReviewModal } from "./task-review";
import { TaskVerifierInvite } from "./task-verifier-invite";
import { TaskVerifierQualification } from "./task-verifier-qualification";
import { TaskProcedureCompositionModal } from "./procedure-composition";
import { TaskRiskModal } from "./task-risk";
import { reviewMessages } from "./task-review-messages";
import { isSpecialistOfferData, TaskSpecialistOffer, type SpecialistOfferState } from "./task-specialist-offer";
import { canPrepareForWorker, catalogFor, companyInformationClass, companyInformationRuntimeClass, contractInput, draftFrom, fields, isCompanyInformation, modelPolicyOverride, modelPolicyProposalFor, modelPolicyReasonText, runtimeInformationInput, visibleContextGroups, selectReferences, validationSections, type Draft, type FieldName, type ReadyPacket, type RefGroup } from "./task-readiness-model";

export function TaskReadinessModal({ taskId, onClose, onSaved, returnToApplication = false }: { taskId: string; onClose: () => void; onSaved?: () => void; returnToApplication?: boolean }) {
  const { locale, t } = useLanguage();
  const tr = (key: string) => t(`ready.${key}` as MessageKey);
  const [packet, setPacket] = useState<ReadyPacket | null>(null), [draft, setDraft] = useState<Draft | null>(null);
  const [specialistOffer, setSpecialistOffer] = useState<SpecialistOfferState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>("loading"), [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]), [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false), [leave, setLeave] = useState(false), [expanded, setExpanded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [compositionOpen,setCompositionOpen]=useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [links, setLinks] = useState({ projectId: "", goalId: "", assignedWorkforceEntityId: "" });
  const mounted = useRef(true), errorRef = useRef<HTMLDivElement>(null);
  const submission = useRef<{ body: string; requestId: string } | null>(null);
  const classQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("executionClass") : null;
  const requestedClass = useRef(classQuery === companyInformationClass || classQuery === "roost-company-information-runtime-v1" || classQuery === "application" ? classQuery : "");
  function close() { if (busy && busy !== "loading") return; if (dirty) setLeave(true); else onClose(); }
  function update(next: Draft) { setDraft(next); setDirty(true); setSuccess(null); }
  function errorCopy(caught: unknown) {
    if (!(caught instanceof AppApiError)) return "error.failed";
    if (caught.code.startsWith("procedure_composition_")) return "compositionRequired";
    if (caught.code.startsWith("risk_admission_")) return "admissionRequired";
    if (caught.code.startsWith("task_risk_")) return "riskRequired";
    if (["forbidden", "workspace_read_only"].includes(caught.code)) return "error.forbidden";
    if (caught.code === "task_agent_execution_active") return "active";
    if (caught.code === "agent_execution_disabled") return "disabled";
    if (["task_ready_revalidation_required", "task_ready_context_conflict", "task_ready_contract_mismatch", "task_submission_version_conflict", "task_submission_key_conflict", "task_submission_superseded"].includes(caught.code)) return "error.conflict";
    if (caught.code === "task_execution_contract_invalid") return "invalid";
    return "error.failed";
  }
  async function loadSpecialistOffer() {
    setSpecialistOffer({ kind: "loading" });
    try {
      const response = await api<{ data: Omit<Extract<SpecialistOfferState, { kind: "offer" }>, "kind"> }>(`/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/specialist-offer`, { cache: "no-store" });
      if (mounted.current) setSpecialistOffer(isSpecialistOfferData(response.data, taskId) ? { kind: "offer", ...response.data } : { kind: "error" });
    } catch (caught) {
      if (mounted.current) setSpecialistOffer({ kind: caught instanceof AppApiError && caught.status === 404 ? "none" : "error" });
    }
  }
  async function load(applicationId?: string, preserve = false) {
    setBusy("loading"); setError(null);
    try {
      const response = await api<{ data: ReadyPacket }>(`/v1/agent-runtime/tasks/${taskId}/execution-readiness?editor=1${applicationId ? `&applicationId=${encodeURIComponent(applicationId)}` : ""}${requestedClass.current ? `&executionClass=${requestedClass.current}` : ""}`, { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.data.editor) throw new AppApiError({ code: response.data.reason ?? "task_editor_unavailable", status: 409 });
      setPacket(response.data);
      if (["needs_context", "needs_decision"].includes(response.data.status)) { setError("invalid"); setIssues(validationSections(response.data)); }
      if (!preserve) { setDraft(draftFrom(response.data.editor)); setDirty(false); }
      setLinks({ projectId: response.data.editor.task.project?.id ?? "", goalId: response.data.editor.task.goal?.id ?? "", assignedWorkforceEntityId: response.data.editor.agent?.id ?? "" });
    } catch (caught) {
      console.warn(`Owner task readiness read rejected: ${caught instanceof AppApiError ? caught.code : "task_editor_unavailable"}`);
      if (mounted.current) setError(errorCopy(caught));
    }
    finally { if (mounted.current) setBusy(null); }
  }
  useEffect(() => { mounted.current = true; void load(); void loadSpecialistOffer(); return () => { mounted.current = false; }; }, [taskId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!packet || !draft || !packet.canSubmit || !offerAllowsSubmit || packet.editor.activeExecution || busy
      || packet.editor.executionClass === companyInformationRuntimeClass && !modelPolicyProposalFor(packet.editor)) return;
    setBusy("submitting"); setError(null); setIssues([]); setSuccess(null);
    try {
      const input = contractInput(packet.editor, draft), body = JSON.stringify(input);
      if (submission.current?.body !== body) submission.current = { body, requestId: crypto.randomUUID() };
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/submit-for-execution`, { method: "POST", body: JSON.stringify({ ...input, requestId: submission.current!.requestId }) });
      if (!mounted.current) return;
      submission.current = null; setDirty(false); setExpanded(false); await Promise.all([load(), loadSpecialistOffer()]); setSuccess("accepted"); onSaved?.();
    } catch (caught) {
      if (!mounted.current) return;
      if (caught instanceof AppApiError && (caught.code === "task_execution_contract_invalid" || (caught.code.startsWith("task_risk_") || caught.code.startsWith("risk_admission_") || caught.code.startsWith("procedure_composition_")))) await load(packet.editor.applicationId ?? undefined, true);
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
    if (!packet?.canSubmit || !offerAllowsSubmit || packet.status !== "ready" || !canPrepareForWorker(packet) || packet.editor.activeExecution || dirty || busy) return;
    setBusy("queue"); setError(null);
    try { await api("/v1/agent-runtime/executions", { method: "POST", body: JSON.stringify({ taskId, ...(isCompanyInformation(packet.editor) ? { executionClass: companyInformationClass } : { applicationId: packet.editor.applicationId }) }) }); await load(); setSuccess(isCompanyInformation(packet.editor) ? "information.queued" : "queued"); onSaved?.(); }
    catch (caught) { setError(errorCopy(caught)); } finally { setBusy(null); }
  }
  if (leave) return <CcRecordEditorModal titleId="ready-discard-title" eyebrow={tr("title")} title={tr("leave")} closeLabel={tr("stay")} onClose={() => setLeave(false)} onSubmit={event => { event.preventDefault(); onClose(); }} actions={<><CcButton variant="ghost" onClick={() => setLeave(false)}>{tr("stay")}</CcButton><CcButton variant="warning" type="submit">{tr("discard")}</CcButton></>}><p>{tr("unsaved")}</p></CcRecordEditorModal>;
  const e = packet?.editor;
  const offerAllowsSubmit = specialistOffer.kind === "none" || specialistOffer.kind === "offer" && specialistOffer.canSubmit;
  const informational = Boolean(e && isCompanyInformation(e));
  const runtimeInformation = e?.executionClass === companyInformationRuntimeClass;
  const modelProposal = e ? modelPolicyProposalFor(e) : null;
  const acceptedModelSelection = runtimeInformation && e?.accepted?.contract.executionClass === companyInformationRuntimeClass ? e.accepted.contract.modelSelection : null;
  const acceptedModel = acceptedModelSelection?.modelSelection ?? acceptedModelSelection;
  const writable = packet?.canSubmit && !e?.activeExecution;
  const pendingLinks = e && (links.projectId !== (e.task.project?.id ?? "") || links.goalId !== (e.task.goal?.id ?? "") || links.assignedWorkforceEntityId !== (e.agent?.id ?? ""));
  const linksValid = Boolean(!pendingLinks && e && (informational || e.task.project) && e.task.goal && e.agent?.eligible && (informational || e.applicationId) && ["todo", "in_progress"].includes(e.task.status));
  const showForm = e && draft && (expanded || packet?.status !== "ready"
    || (e.executionClass ?? "application") !== (e.accepted?.contract.executionClass ?? "application"));
  const reason = ["ready_pin_required", "context_changed", "context_invalid", "revalidation_required", "source_watch_required", "submission_required", "submission_incomplete", "single_task_scope_required", "task_roles_required"].includes(packet?.reason ?? "") ? packet!.reason! : "revalidation_required";
  function input(name: FieldName) {
    const bounds: Record<string, [number, number]> = { maxAttempts: [1, 5], maxDurationSeconds: [60, 3600], maxOutputTokens: [128, 100000] };
    const multiline = !["version", "outcome", "baseBranch", ...Object.keys(bounds)].includes(name);
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
    const checklist = group === "procedures" && runtimeInformation ? e!.referenceSiteChecklist : undefined;
    const checklistIds = new Set([...(checklist?.selectedIds ?? []), ...(checklist?.id ? [checklist.id] : [])]);
    const catalog = catalogFor(e!, group).filter(item => item.kind !== "reference_site_checklist");
    const selected = draft!.refs[group].filter(item => !checklistIds.has(item.id));
    const selectedChecklist = checklist ? draft!.refs.procedures.find(item => checklistIds.has(item.id)) : undefined;
    const stale = selected.some(item => !catalog.some(current => current.id === item.id && current.revision === item.revision));
    const options = [...catalog, ...selected.filter(item => !catalog.some(current => current.id === item.id)).map(item => ({ ...item, label: tr("staleRefs"), eligible: false }))];
    function select(ids: string[], refresh = false) { update({ ...draft!, refs: { ...draft!.refs,
      [group]: [...selectReferences(selected, catalog, ids, refresh), ...(selectedChecklist ? [selectedChecklist] : [])] } }); }
    function chooseChecklist(useCurrent: boolean) {
      if (!checklist) return;
      const chosen = useCurrent && checklist.status === "current" && checklist.id && checklist.version
        ? [{ id: checklist.id, revision: String(checklist.version) }] : [];
      const procedures = [...draft!.refs.procedures.filter(item => !checklistIds.has(item.id)), ...chosen];
      update({ ...draft!, refs: { ...draft!.refs, procedures },
        none: { ...draft!.none, procedures: procedures.length ? "" : draft!.none.procedures } });
    }
    const revisionLabel = (value: string) => Number.isFinite(Date.parse(value)) && value.length > 12 ? new Date(value).toLocaleString(locale) : value;
    return <section className="grid gap-3 border-t border-base-300 pt-4" key={group}>
      <CcField label={tr(group)} hint={tr("sourceHint")} error={stale ? tr("staleRefs") : issues.includes(group) ? tr(`issue.${group}`) : undefined} required={group === "company" || group === "product" || group === "technical"}>{({ id, describedBy }) => <CcMultiSelect id={id} name={group} popupLabel={tr(group)} invalid={stale || issues.includes(group)} describedBy={describedBy} placeholder={tr("choose")} searchPlaceholder={tr("choose")} emptyLabel={tr("empty")} clearLabel={tr("clear")} doneLabel={tr("done")} selectedLabel={tr("selected")} showValues={false} disabled={!writable || Boolean(busy)} value={selected.map(item => item.id)} onChange={select} options={options.map(item => ({ value: item.id, label: `${humanizeBusinessValue(item.label, undefined, locale)} · ${revisionLabel(selected.find(row => row.id === item.id)?.revision ?? item.revision)}`, description: selected.some(row => row.id === item.id && row.revision !== item.revision) ? `${tr("currentRevision")}: ${revisionLabel(item.revision)}` : undefined, disabled: item.eligible === false }))} />}</CcField>
      {checklist ? <div className="rounded-lg border border-base-300 bg-base-200 p-3 text-sm">
        <CcField label={locale === "pl" ? "Checklista strony dla tego zadania" : "Site checklist for this task"}
          hint={checklist.status === "none" ? locale === "pl" ? "Brak przyjętej checklisty. Otwórz w tym zadaniu panel stron referencyjnych i checklisty." : "No accepted checklist. Open this task's reference sites and checklist panel."
            : checklist.status === "stale" ? locale === "pl" ? "Źródło lub przegląd straciły aktualność. Sprawdź panel stron referencyjnych i checklisty, a potem odśwież Ready." : "Source or review is stale. Check the reference sites and checklist panel, then refresh Ready."
            : checklist.status === "withdrawn" ? locale === "pl" ? "Ta wersja jest wycofana lub niedostępna. Sprawdź panel stron referencyjnych i checklisty." : "This version is withdrawn or unavailable. Check the reference sites and checklist panel."
            : locale === "pl" ? `Przyjęta wersja ${checklist.version}; decyzja ${checklist.decisionId}.` : `Accepted version ${checklist.version}; decision ${checklist.decisionId}.`}>{({ id }) => <CcSelect id={id} disabled={!writable || Boolean(busy)}
            value={selectedChecklist?.id === checklist.id && selectedChecklist.revision === String(checklist.version)
              && checklist.status === "current" ? checklist.id : ""}
            onChange={event => chooseChecklist(Boolean(event.target.value))}><option value="">{locale === "pl" ? "Nie używaj checklisty" : "Do not use a checklist"}</option>
            {checklist.status === "current" && checklist.id ? <option value={checklist.id}>{checklist.label} · v{checklist.version}</option> : null}</CcSelect>}</CcField>
        {selectedChecklist && (selectedChecklist.id !== checklist.id || checklist.status !== "current" || selectedChecklist.revision !== String(checklist.version))
          ? <div className="mt-2 grid gap-2"><p role="status" className="text-warning">{locale === "pl" ? "W Ready wybrano nieaktualną checklistę. Usuń wybór lub użyj bieżącej wersji przed ponownym zatwierdzeniem." : "Ready contains a stale checklist. Remove it or use the current version before approving again."}</p>
            <div className="flex flex-wrap gap-2"><CcButton size="sm" variant="outline" disabled={!writable || Boolean(busy)} onClick={() => chooseChecklist(false)}>{locale === "pl" ? "Usuń nieaktualny wybór" : "Remove stale selection"}</CcButton>
              {checklist.status === "current" ? <CcButton size="sm" variant="outline" disabled={!writable || Boolean(busy)} onClick={() => chooseChecklist(true)}>{locale === "pl" ? "Użyj bieżącej wersji" : "Use current version"}</CcButton> : null}</div></div> : null}
      </div> : null}
      {stale && writable ? <CcButton size="sm" variant="outline" onClick={() => select(selected.filter(item => catalog.some(row => row.id === item.id)).map(item => item.id), true)}>{tr("refreshRefs")}</CcButton> : null}
      {!["company", "product", "technical"].includes(group) && !draft!.refs[group].length ? <CcField label={tr("none")} required>{({ id }) => <input className="input input-bordered w-full" id={id} required maxLength={2000} value={draft!.none[group]} onChange={event => update({ ...draft!, none: { ...draft!.none, [group]: event.target.value } })} />}</CcField> : null}
      {group === "dependencies" ? selected.map(item => <CcField key={item.id} label={`${tr("dependencyEvidence")}: ${humanizeBusinessValue(catalog.find(row => row.id === item.id)?.label || "dependency", undefined, locale)}`} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered w-full" required maxLength={2000} value={item.evidence ?? ""} onChange={event => update({ ...draft!, refs: { ...draft!.refs, dependencies: selected.map(row => row.id === item.id ? { ...row, evidence: event.target.value } : row) } })} />}</CcField>) : null}
    </section>;
  }
  if (reviewOpen) return <TaskReviewModal taskId={taskId} onClose={() => { setReviewOpen(false); void load(); }} onSaved={onSaved}/>;
  if (compositionOpen) return <TaskProcedureCompositionModal taskId={taskId} onClose={()=>{setCompositionOpen(false);void load(e?.applicationId??undefined,true);}}/>;
  if (riskOpen) {
    const base = e && draft ? !dirty && e.accepted
      ? { applicationId: e.accepted.applicationId, contract: e.accepted.contract, prompt: e.accepted.prompt, baseBranch: e.accepted.baseBranch }
      : contractInput(e, draft) : undefined;
    const riskInput = base && informational ? runtimeInformationInput(base) : base;
    return <TaskRiskModal taskId={taskId} input={riskInput} onClose={()=>{setRiskOpen(false);void load(e?.applicationId??undefined,true);}} onSaved={onSaved}/>;
  }
  if (authorizationOpen) return <CompanyInformationAuthorization taskId={taskId} taskTitle={e?.task.title ?? "Information task"} onClose={()=>{setAuthorizationOpen(false);void load(e?.applicationId??undefined,true);onSaved?.();}}/>;
  if (qualificationOpen) return <TaskVerifierQualification taskId={taskId} contract={e && draft ? !dirty && e.accepted ? e.accepted.contract : contractInput(e,draft).contract : null} onClose={()=>{setQualificationOpen(false);void load(e?.applicationId??undefined,true);}} onSaved={onSaved}/>;
  return <CcRecordEditorModal titleId="task-readiness-title" eyebrow={tr("title")} title={e?.task.title || tr("title")} description={tr("description")} closeLabel={tr("close")} onClose={close} onSubmit={submit} maxWidthClassName="max-w-5xl" actions={<>
    {!informational ? <CcButton disabled={Boolean(busy)||dirty} onClick={()=>setCompositionOpen(true)}>{locale==="pl"?"Skład procedury":"Procedure composition"}</CcButton> : null}
    {!informational ? <CcButton variant="outline" disabled={Boolean(busy) || dirty} onClick={()=>setReviewOpen(true)}>{reviewMessages[locale === "pl" ? "pl" : "en"].open}</CcButton> : null}
    <CcButton className="min-h-11" onClick={close} variant="ghost" disabled={Boolean(busy && busy !== "loading")}>{returnToApplication ? locale === "pl" ? "Wróć do aplikacji" : "Back to application" : tr("close")}</CcButton>
    {packet && writable ? showForm ? <CcButton key="submit" className="min-h-11" variant="primary" type="submit" loading={busy === "submitting"} disabled={Boolean(busy) || !linksValid || !offerAllowsSubmit || runtimeInformation && !modelProposal}>{packet.revision ? tr("resubmit") : tr("submit")}</CcButton> : <CcButton key="review" className="min-h-11" variant="primary" onClick={event => { event.preventDefault(); setExpanded(true); }}>{tr("edit")}</CcButton> : null}
  </>}>
    {busy === "loading" ? <div aria-live="polite" className="grid gap-3 py-3"><p>{tr("loading")}</p><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-3/4" /></div> : null}
    {error ? <div ref={errorRef} tabIndex={-1}><CcNotice live tone="error" title={tr(error)} />{issues.length ? <ul className="mt-3 grid gap-2 text-sm list-disc pl-5">{issues.map(issue => <li key={issue}>{tr(`issue.${issue}`)}</li>)}</ul> : null}{!packet ? <CcButton onClick={() => void load()} variant="outline">{tr("retry")}</CcButton> : null}</div> : null}
    {success ? <CcNotice live tone="success" title={tr(success)} /> : null}
    <TaskSpecialistOffer taskId={taskId} state={specialistOffer} onRefresh={loadSpecialistOffer} onSaved={() => { void load(); onSaved?.(); }} />
    {packet && e && draft ? <>
      <section aria-label={tr("title")} className="grid gap-4 border-b border-base-300 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><span className={`badge ${packet.status === "ready" ? "badge-success" : "badge-warning"}`}>{tr(["ready", "draft", "needs_context", "needs_decision", "not_ready", "needs_revalidation"].includes(packet.status) ? packet.status : "needs_revalidation")}</span><span className="text-sm text-company-muted">{tr("taskStatus")}: {humanizeBusinessValue(e.task.status, undefined, locale)}</span></div><CcButton variant="outline" disabled={Boolean(busy) || !e} onClick={()=>setRiskOpen(true)}>{locale==="pl"?"Ocena ryzyka":"Risk assessment"}</CcButton><CcButton size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void load(e.applicationId ?? undefined, dirty)}>{tr("refresh")}</CcButton></div>
        {packet.status !== "ready" ? <p className="text-sm">{tr(`reason.${reason}`)}</p> : null}
        <TaskDecisionAuthorityHistory records={packet.editor.decisionAuthorities}/>
        <ChangedContextSources sources={packet.changedSources} />
        {packet.reason?.startsWith("procedure_composition_")?<CcNotice tone="warning" title={tr("compositionRequired")}/>:null}
        {packet.reason?.startsWith("task_risk_") || packet.reason==="risk_context_changed" ? <CcNotice tone="warning" title={tr("riskRequired")}/> : null}
        <TaskRoleSummary editor={e} tr={tr} />
        <TaskVerifierInvite taskId={taskId} taskTitle={e.task.title} />
        {runtimeInformation ? <CcButton size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => setQualificationOpen(true)}>{locale === "pl" ? "Kwalifikacja weryfikatora" : "Verifier qualification"}</CcButton> : null}
        {e.accepted?.contract.singleTask ? <section className="grid gap-2 text-sm"><h3 className="font-bold">{tr("single.title")}</h3><p>{!informational ? <>{e.components?.find(item => item.id === e.accepted?.contract.singleTask.component?.id)?.label ?? tr("staleRefs")} · </> : null}{e.managers?.find(item => item.id === e.accepted?.contract.singleTask.accountableManager.id)?.label ?? tr("staleRefs")}</p>{!informational ? <p className="break-all font-mono text-xs">{e.accepted.contract.singleTask.branch}</p> : null}{e.accepted.contract.singleTask.commonCause ? <details><summary className="cursor-pointer py-2 font-bold text-warning">{tr("single.exception")}</summary><p>{e.accepted.contract.singleTask.commonCause.mechanism}</p><p className="mt-2">{e.accepted.contract.singleTask.commonCause.inseparability}</p><ul className="mt-2 list-disc pl-5">{e.accepted.contract.singleTask.problems.map((problem: { statement: string; causalLink: string }, index: number) => <li key={index}>{problem.statement}: {problem.causalLink}</li>)}</ul></details> : null}</section> : null}
        {packet.revision ? <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-company-muted">{tr("fingerprint")}</dt><dd className="font-mono break-all">{packet.revision.slice(0, 12)}…{packet.revision.slice(-8)}</dd><dd className="mt-1 text-xs text-company-muted">{packet.validationRevision === packet.revision ? tr("proof") : tr("reason.revalidation_required")}</dd></div><div><dt className="text-company-muted">{tr("author")}</dt><dd>{e.acceptance?.authorName || tr(e.acceptance?.authorType === "agent" ? "agentAuthor" : "unknownAuthor")}</dd></div><div><dt className="text-company-muted">{tr("date")}</dt><dd>{e.acceptance?.validatedAt ? new Date(e.acceptance.validatedAt).toLocaleString(locale) : "—"}</dd></div></dl> : null}
        {!packet.canSubmit ? <CcNotice tone="info" title={tr("readOnly")} /> : e.activeExecution ? <CcNotice tone="warning" title={tr("active")} /> : !linksValid ? <CcNotice tone="warning" title={tr(informational ? "information.missingLinks" : "missingLinks")} /> : null}
        {!canPrepareForWorker(packet) ? <p className="text-sm text-company-muted">{tr(informational ? "information.preparationDisabled" : "disabled")}</p> : null}
        {dirty ? <p role="status" className="text-sm text-warning">{tr("unsaved")}</p> : null}
        <div className="flex flex-wrap gap-2">{packet.status === "ready" && !writable ? <CcButton size="sm" variant="outline" onClick={() => setExpanded(!expanded)}>{tr("edit")}</CcButton> : null}{packet.status === "ready" && packet.canSubmit ? <CcButton size="sm" variant="outline" onClick={() => void queue()} disabled={!offerAllowsSubmit || !canPrepareForWorker(packet) || Boolean(busy) || dirty || e.activeExecution}>{tr(informational ? "information.queue" : "queue")}</CcButton> : null}<CcButton size="sm" variant="ghost" href="/areas?area=06-kadry&view=executions" onClick={event => { if (dirty) { event.preventDefault(); setError("unsaved"); } }}>{tr("runs")}</CcButton></div>
      </section>
      <CcField label={tr("executionClass")} hint={tr("executionClassHint")}>{({ id }) => <CcSelect id={id} disabled={!writable || Boolean(busy) || dirty} value={runtimeInformation ? companyInformationRuntimeClass : informational ? companyInformationClass : "application"} onChange={event => { requestedClass.current = event.target.value; submission.current = null; void load(); }}><option value="application">{tr("applicationTask")}</option><option value={companyInformationClass}>{tr("informationTask")}</option>{informational ? <option value={companyInformationRuntimeClass}>{locale === "pl" ? "Zadanie informacyjne — wykonanie" : "Information task — runtime"}</option> : null}</CcSelect>}</CcField>
      {informational && !runtimeInformation ? <CcNotice tone="info" title={tr("informationTask")} detail={tr("information.boundary")} /> : null}
      {informational ? <CompanyInformationResult taskId={taskId} canStart={Boolean(packet.canSubmit && packet.status === "ready" && !dirty && !busy && !e.activeExecution)} canAuthorize={Boolean(runtimeInformation && packet.canSubmit && !busy && !e.activeExecution)} onAuthorize={()=>setAuthorizationOpen(true)} onReview={()=>setReviewOpen(true)} onSaved={() => { void load(); onSaved?.(); }} /> : null}
      {packet.status === "ready" && acceptedModel ? <p className="text-sm text-company-muted">{locale === "pl" ? "Wybór przyjęty w Ready" : "Selection accepted at Ready"}: {acceptedModelSelection?.backend === "ollama_loopback" ? "Ollama" : "Codex Responses"} · {acceptedModel.model} · {acceptedModel.reasoningEffort}</p> : null}
      {showForm ? <fieldset disabled={!writable || Boolean(busy)} className="min-w-0 grid gap-4">
        <details open={!linksValid} className="border-b border-base-300 pb-4"><summary className="cursor-pointer py-2 font-bold">{tr("links")}</summary><p className="my-2 text-sm text-company-muted">{tr("linksHint")}</p><div className="grid gap-4 sm:grid-cols-3">{(["projectId", "goalId", "assignedWorkforceEntityId"] as const).map((key, index) => <CcField key={key} label={tr(["project", "goal", "agent"][index]!)}>{({ id }) => <CcSelect id={id} value={links[key]} onChange={event => { setLinks({ ...links, [key]: event.target.value }); setDirty(true); }}><option value="">{tr("choose")}</option>{(index === 0 ? e.projects : index === 1 ? e.goals.map(item => ({ id: item.id, name: item.title })) : e.agents).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</CcSelect>}</CcField>)}</div><CcButton className="mt-3" size="sm" variant="outline" onClick={() => void saveLinks()}>{tr("saveLinks")}</CcButton></details>
        <div className="grid gap-4 sm:grid-cols-2">{!informational ? <CcField label={tr("application")} required>{({ id }) => <CcSelect id={id} value={e.applicationId ?? ""} required onChange={event => { if (!event.target.value) return; update({ ...draft, refs: { ...draft.refs, product: [], technical: [] } }); void load(event.target.value, true); }}><option value="">{tr("choose")}</option>{e.applications.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</CcSelect>}</CcField> : null}<div className="text-sm"><p className="text-company-muted">{tr("goal")}</p><p>{e.task.goal?.title || "—"}</p><p className="mt-2 text-company-muted">{tr("agent")}</p><p>{e.agent?.name || "—"}</p></div></div>
        <section className="grid gap-3"><h3 className="font-bold">{tr("intent")}</h3><div className="grid gap-4 sm:grid-cols-2">{fields.intent.filter(name => !informational || name !== "baseBranch").map(input)}</div></section>
        <SingleTaskFields editor={e} draft={draft} update={update} tr={tr} />
        <TaskRoleFields editor={e} draft={draft} update={update} tr={tr} />
        <section className="grid gap-3 border-t border-base-300 pt-4"><h3 className="font-bold">{tr("assignment")}</h3>
          {runtimeInformation && !modelProposal ? <CcNotice tone="warning" title={locale === "pl" ? "Nie można odczytać propozycji modelu" : "Model proposal unavailable"} detail={locale === "pl" ? "Odśwież widok przed zapisaniem Ready. Bez propozycji nie można zatwierdzić wyboru modelu." : "Refresh before saving Ready. A model choice cannot be approved without its proposal."} /> : null}
          {runtimeInformation && modelProposal ? <div className="rounded-lg border border-base-300 bg-base-200 p-4 text-sm" aria-label={locale === "pl" ? "Propozycja polityki modelu" : "Model policy proposal"}>
            <p className="font-bold">{locale === "pl" ? "Propozycja przed Ready" : "Proposal before Ready"}</p>
            <p className="mt-1">{modelProposal.backend === "ollama_loopback" ? "Ollama" : "Codex Responses"} · {modelProposal.model} · {modelProposal.reasoningEffort}</p>
            <p className="mt-2 text-company-muted">{modelPolicyReasonText(modelProposal.reasonCode, locale)}</p>
            {!modelProposal.eligible ? <p className="mt-2 text-warning">{locale === "pl" ? "Warunki dopuszczenia nie są jeszcze spełnione." : "Admission requirements are not yet met."}</p> : null}
            <p className="mt-2 font-medium">{e.accepted?.contract.executionClass === companyInformationRuntimeClass ? locale === "pl" ? "Wybór przyjęty w Ready pozostaje obowiązujący." : "The selection accepted at Ready remains in force." : modelPolicyOverride(e, draft) ? locale === "pl" ? "Wybór właściciela różni się od propozycji; serwer sprawdzi minima przy Ready." : "Owner selection differs from the proposal; the server will check minima at Ready." : locale === "pl" ? "W formularzu wybrano propozycję." : "The proposal is selected in the form."}</p>
          </div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {runtimeInformation ? <CcField label={locale === "pl" ? "Środowisko modelu" : "Model backend"} required>{({ id }) => <CcSelect required id={id} value={draft.backend} onChange={event => update({ ...draft, backend: event.target.value as Draft["backend"], model: event.target.value === "ollama_loopback" ? "gpt-oss:20b" : "", modelDigest: "", effort: "" })}><option value="codex_responses">Codex Responses</option><option value="ollama_loopback">Ollama · 127.0.0.1</option></CcSelect>}</CcField> : null}
            <CcField label={tr("model")} required>{({ id }) => <CcSelect required id={id} value={draft.model} onChange={event => update({ ...draft, model: event.target.value, effort: "" })}><option value="">{tr("choose")}</option>{runtimeInformation && draft.backend === "ollama_loopback" ? <option value="gpt-oss:20b">gpt-oss:20b</option> : e.models.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}</CcSelect>}</CcField>
            <CcField label={tr("effort")} required>{({ id }) => <CcSelect required id={id} value={draft.effort} onChange={event => update({ ...draft, effort: event.target.value })}><option value="">{tr("choose")}</option>{(runtimeInformation && draft.backend === "ollama_loopback" ? ["low"] : e.models.find(item => item.id === draft.model)?.efforts ?? []).map(value => <option key={value} value={value}>{tr(`effort.${value}`)}</option>)}</CcSelect>}</CcField>
            {runtimeInformation && draft.backend === "ollama_loopback" ? <CcField label={locale === "pl" ? "Dokładny digest modelu SHA-256" : "Exact model SHA-256 digest"} required hint={locale === "pl" ? "Skopiuj digest przypiętego modelu z hosta Workera lub poproś o niego operatora hosta. Bez digestu wybór lokalny nie może przejść Ready; wybór nie potwierdza dostępności zasobów." : "Copy the pinned model digest from the Worker host or ask the host operator for it. Local Ready requires the digest; selection does not prove resource availability."}>{({ id, describedBy }) => <input className="input input-bordered w-full font-mono text-xs" id={id} aria-describedby={describedBy} required pattern="sha256:[a-f0-9]{64}" maxLength={71} value={draft.modelDigest} onChange={event => update({ ...draft, modelDigest: event.target.value })} placeholder="sha256:…" />}</CcField> : null}
            {selection("competencies", e.agent?.competencies ?? [])}{!informational ? <>{selection("tools", e.agent?.tools ?? [])}{selection("permissions", e.agent?.permissions ?? [])}</> : null}
          </div>
          {runtimeInformation && draft.backend === "ollama_loopback" ? <p className="break-all text-xs text-company-muted">Ollama · http://127.0.0.1:11434 · {draft.model || "gpt-oss:20b"} · {draft.modelDigest || "sha256:…"} · {locale === "pl" ? "bez automatycznego fallbacku" : "no automatic fallback"}</p> : null}
          <p className="text-sm text-company-muted">{runtimeInformation ? locale === "pl" ? "Zadanie informacyjne nie nadaje uprawnień do repozytorium, push ani deploymentu." : "An information task grants no repository, push or deployment authority." : tr(informational ? "information.boundary" : "boundary")}</p>
        </section>
        <section className="grid gap-3"><h3 className="font-bold">{tr("context")}</h3>{e.catalogTruncated ? <CcNotice tone="info" title={tr("limited")} /> : null}<div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{visibleContextGroups(e).map(refs)}</div></section>
        {(["limits", "acceptance", "recovery"] as const).map(section => <section className="grid gap-3 border-t border-base-300 pt-4" key={section}><h3 className="font-bold">{tr(section)}</h3><div className="grid gap-4 sm:grid-cols-2">{fields[section].map(input)}{section === "recovery" ? <CcField label={tr("rollbackMode")} required>{({ id }) => <CcSelect required id={id} disabled={informational} value={draft.rollbackMode} onChange={event => update({ ...draft, rollbackMode: event.target.value })}><option value="">{tr("choose")}</option>{["restore_task_changes", "not_applicable"].map(value => <option key={value} value={value}>{tr(value)}</option>)}</CcSelect>}</CcField> : null}</div></section>)}
      </fieldset> : null}
    </> : null}
  </CcRecordEditorModal>;
}
