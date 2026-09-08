import { TaskCapabilityModal } from "./task-capability";
import { capabilityMessages } from "./task-capability-messages";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcSelect } from "../../components/cc-select";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { reviewMessages } from "./task-review-messages";

const lines = (value: string) => value.split("\n").map(v=>v.trim()).filter(Boolean);
const initial = { summary: "", reference: "", testResult: "", reproduction: "", expected: "", observed: "", scope: "", excluded: "", outcome: "", competencies: "" };
export function TaskReviewModal({ taskId, onClose, onSaved }: { taskId: string; onClose: () => void; onSaved?: () => void }) {
  const { locale } = useLanguage(), c = reviewMessages[locale === "pl" ? "pl" : "en"];
  const [showGrants, setShowGrants] = useState(false);
  const credentialLabel = locale === "pl" ? "Poświadczenie agenta" : "Agent credential";
  const [data, setData] = useState<any>(null), [busy, setBusy] = useState(true), [error, setError] = useState(false), [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(initial), [decision, setDecision] = useState("reject"), [disposition, setDisposition] = useState("return_to_executor"), [specialist, setSpecialist] = useState("");
  const [scope, setScope] = useState<string[]>([]), [dirty, setDirty] = useState(false), [leave, setLeave] = useState(false);
  const request = useRef<{ body: string; id: string } | null>(null), mounted = useRef(true), notice = useRef<HTMLDivElement>(null);
  async function load(cursor?: string) {
    setBusy(true); setError(false);
    try { const r = await api<{ data: any }>(`/v1/agent-runtime/tasks/${taskId}/review${cursor ? `?cursor=${cursor}` : ""}`); if (!mounted.current) return;
      setData((old:any) => cursor && old ? { ...r.data, history: [...old.history, ...r.data.history] } : r.data);
      if (!cursor) { setScope(r.data.decision?.evidence?.correction?.scope ?? []); setDirty(false); }
    } catch { if (mounted.current) setError(true); } finally { if (mounted.current) setBusy(false); }
  }
  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;};},[taskId]);
  function close() { if (busy) return; if (dirty) setLeave(true); else onClose(); }
  function edit(key: keyof typeof initial, value: string) { setDraft(d=>({...d,[key]:value})); setDirty(true); setSaved(false); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!data || busy || !data.canReview && !data.canManage) return;
    const worker = data.specialists.find((w:any)=>w.id===specialist);
    const input = data.canReview ? { expectedVersion: data.expectedVersion, executionId: data.result.executionId, materialVersion: data.materialVersion, decision, summary: draft.summary,
      evidence: [{ kind: "test", reference: draft.reference, result: draft.testResult }], ...(decision === "reject" ? { reproduction: lines(draft.reproduction), expected: draft.expected, observed: draft.observed, correction: { scope: lines(draft.scope), excluded: lines(draft.excluded), outcome: draft.outcome, competencies: lines(draft.competencies) } } : {}) } :
      { expectedVersion: data.expectedVersion, reviewId: data.decision.id, action: disposition, scope, ...(disposition === "create_specialist_task" ? { specialist: worker ? { id: worker.id, revision: worker.revision } : null } : {}) };
    const body = JSON.stringify(input); if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() };
    setBusy(true); setError(false); setSaved(false);
    try { await api(`/v1/agent-runtime/tasks/${taskId}/actions/${data.canReview ? "review" : "review-return"}`,{method:"POST",body:JSON.stringify({...input,requestId:request.current.id})});
      if (!mounted.current) return; request.current=null;setDirty(false);await load();setSaved(true);onSaved?.();
    } catch { if(mounted.current){setError(true);requestAnimationFrame(()=>notice.current?.focus());} } finally {if(mounted.current)setBusy(false);}
  }
  const field = (key: keyof typeof initial, multiline = false) => <CcField key={key} label={c[key]} required>{({id,describedBy})=>multiline ? <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" required minLength={3} maxLength={2000} value={draft[key]} onChange={e=>edit(key,e.target.value)}/> : <input id={id} aria-describedby={describedBy} className="input input-bordered w-full" required minLength={3} maxLength={2000} value={draft[key]} onChange={e=>edit(key,e.target.value)}/>}</CcField>;
  if(showGrants)return <TaskCapabilityModal taskId={taskId} onClose={()=>{setShowGrants(false);void load();}}/>;
  if(leave)return <CcRecordEditorModal titleId="review-discard" title={c.discard} eyebrow={c.title} closeLabel={c.stay} onClose={()=>setLeave(false)} onSubmit={e=>{e.preventDefault();onClose();}} actions={<><CcButton variant="ghost" onClick={()=>setLeave(false)}>{c.stay}</CcButton><CcButton type="submit" variant="warning">{c.leave}</CcButton></>}>{c.boundary}</CcRecordEditorModal>;
  return <CcRecordEditorModal titleId="review-title" title={data?.task.title ?? c.title} eyebrow={c.title} description={c.boundary} closeLabel={c.close} onClose={close} onSubmit={submit} maxWidthClassName="max-w-5xl" actions={<><CcButton variant="ghost" disabled={busy} onClick={close}>{c.close}</CcButton>{data?.canReview || data?.canManage ? <CcButton variant="primary" type="submit" disabled={busy || data.canManage && (!scope.length || disposition === "create_specialist_task" && !specialist)}>{data.canReview ? c.recordReview : c.recordAction}</CcButton> : null}</>}>
    <div className="grid min-w-0 gap-5">
      <div ref={notice} tabIndex={-1}>{error ? <CcNotice tone="error" title={c.error} live/> : saved ? <CcNotice tone="success" title={c.saved} live/> : null}</div>
      {busy && !data ? <CcNotice tone="loading" title={c.loading}/> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">{data?.reason ? <p className="text-sm" role="status">{c[data.reason as keyof typeof c] ?? c.roles_need_context}</p> : <span/>}{data?.canManageGrants ? <CcButton size="sm" variant="outline" disabled={busy || dirty} onClick={()=>setShowGrants(true)}>{capabilityMessages[locale === "pl" ? "pl" : "en"].title}</CcButton> : null}<CcButton size="sm" variant="outline" disabled={busy} onClick={()=>void load()}>{c.refresh}</CcButton></div>
      {data?.result ? <section className="grid min-w-0 gap-3 border-b border-base-300 pb-5"><h3 className="font-bold">{c.material}</h3><p>{data.result.summary}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-company-muted">{c.version}</dt><dd className="break-all font-mono" title={data.materialVersion}>{data.materialVersion?.slice(0,16)}</dd></div><div><dt className="text-company-muted">{c.attempt}</dt><dd>{data.result.attempt} · {new Date(data.result.completedAt).toLocaleString(locale)}</dd></div><div><dt className="text-company-muted">{c.verifier}</dt><dd>{data.labels?.verifier ?? "—"}</dd></div><div><dt className="text-company-muted">{c.manager}</dt><dd>{data.labels?.manager ?? "—"}</dd></div></dl>
        <details><summary className="cursor-pointer py-2 font-semibold">{c.details}</summary><pre className="whitespace-pre-wrap break-words text-sm">{data.result.finalResponse}{"\n"}{JSON.stringify(data.result.verification,null,2)}</pre><ul className="text-sm">{(data.result.changedFiles??[]).map((file:string)=><li className="break-all" key={file}>{file}</li>)}</ul></details></section> : null}
      {data?.canReview ? <section className="grid gap-4"><h3 className="font-bold">{c.decision}</h3><CcField label={c.decision}>{({id})=><CcSelect id={id} value={decision} onChange={e=>{setDecision(e.target.value);setDirty(true);}}><option value="reject">{c.reject}</option><option value="approve">{c.approve}</option></CcSelect>}</CcField>
        {field("summary",true)}<div className="grid gap-4 sm:grid-cols-2">{field("reference")}{field("testResult")}</div>
        {decision === "reject" ? <><p className="text-sm text-company-muted">{c.lines}</p>{field("reproduction",true)}<div className="grid gap-4 sm:grid-cols-2">{field("expected",true)}{field("observed",true)}{field("scope",true)}{field("excluded",true)}</div>{field("outcome")}{field("competencies",true)}</> : null}
      </section> : null}
      {data?.canManage ? <section className="grid gap-4"><h3 className="font-bold">{c.disposition}</h3><p>{data.decision.evidence.summary}</p><p className="text-sm text-company-muted">{c.selection}</p>
        <fieldset className="grid gap-2"><legend className="mb-2 font-semibold">{c.scope}</legend>{data.decision.evidence.correction.scope.map((item:string)=><label key={item} className="flex items-start gap-3 py-1"><input type="checkbox" className="checkbox" checked={scope.includes(item)} onChange={e=>{setScope(old=>e.target.checked?[...old,item]:old.filter(x=>x!==item));setDirty(true);}}/><span>{item}</span></label>)}</fieldset>
        <CcField label={c.disposition}>{({id})=><CcSelect id={id} value={disposition} onChange={e=>{setDisposition(e.target.value);setDirty(true);}}><option value="return_to_executor">{c.return_to_executor}</option><option value="create_specialist_task">{c.create_specialist_task}</option></CcSelect>}</CcField>
        {disposition === "create_specialist_task" ? <CcField label={c.specialist} required>{({id})=><CcSelect id={id} required value={specialist} onChange={e=>{setSpecialist(e.target.value);setDirty(true);}}><option value="">{c.choose}</option>{data.specialists.filter((w:any)=>w.role && data.decision.evidence.correction.competencies.every((skill:string)=>Array.isArray(w.competencies) && w.competencies.includes(skill)) && w.id!==data.result.contract.assignment.agentId).map((w:any)=><option key={w.id} value={w.id}>{w.label}</option>)}</CcSelect>}</CcField> : null}
        <p className="text-sm text-company-muted">{c.draft}</p>{data.specialistsTruncated?<p>{c.limited}</p>:null}
      </section> : null}
      {data?.history.length ? <section className="grid gap-4 border-t border-base-300 pt-5"><h3 className="font-bold">{c.history}</h3>{data.history.map((d:any)=><article key={d.id} className="grid min-w-0 gap-2 border-b border-base-300 pb-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{d.decision==="approve"?c.approve:c.reject} · {d.verifierLabel ?? (d.actorAgentId ?? d.actorUserId ?? "").slice(0,8)}</strong><time>{new Date(d.createdAt).toLocaleString(locale)}</time></div><p>{d.evidence.summary}</p>{d.actorCredentialPrefix ? <small>{credentialLabel}: {d.actorCredentialPrefix}</small> : null}<p className="text-company-muted">{c.version}: {d.materialVersion.slice(0,16)}</p>
        <details><summary className="cursor-pointer py-2">{c.details}</summary>{["reproduction","expected","observed"].filter(key=>d.evidence[key]).map(key=><div key={key} className="py-2"><strong>{c[key as keyof typeof c]}</strong><p className="whitespace-pre-wrap break-words">{Array.isArray(d.evidence[key])?d.evidence[key].join("\n"):d.evidence[key]}</p></div>)}{d.evidence.evidence.map((e:any,i:number)=><p key={i} className="break-words py-1">{e.reference} — {e.result}</p>)}</details>
        {d.action?<div className="grid gap-1"><strong>{c[d.action.action as "return_to_executor"|"create_specialist_task"]} · {d.action.managerLabel ?? (d.action.actorAgentId ?? d.action.actorUserId ?? "").slice(0,8)}</strong><p>{d.action.correction.scope.join(" · ")}</p>{d.action.actorCredentialPrefix ? <small>{credentialLabel}: {d.action.actorCredentialPrefix}</small> : null}{d.action.childTaskId?<p className="break-all">{c.child}: <a className="link" href={`/areas?area=04-operacje&view=tasks&taskId=${d.action.childTaskId}`}>{d.action.correction.outcome}</a></p>:null}</div>:null}
      </article>)}{data.nextCursor?<CcButton variant="outline" disabled={busy} onClick={()=>void load(data.nextCursor)}>{c.older}</CcButton>:null}</section>:null}
    </div>
  </CcRecordEditorModal>;
}
