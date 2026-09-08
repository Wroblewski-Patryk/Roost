import { CapabilitySuspensionModal, SuspensionNotice } from "./capability-suspension";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcSelect } from "../../components/cc-select";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { capabilityMessages } from "./task-capability-messages";

const localTime = (date: Date) => new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
export function TaskCapabilityModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { locale } = useLanguage(), c = capabilityMessages[locale === "pl" ? "pl" : "en"];
  const [showSuspensions,setShowSuspensions]=useState(false);
  const [data, setData] = useState<any>(null), [busy, setBusy] = useState(true), [error, setError] = useState(false), [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState(""), [reason, setReason] = useState(""), [from, setFrom] = useState(() => localTime(new Date())), [until, setUntil] = useState(() => localTime(new Date(Date.now() + 1800000)));
  const [revoking, setRevoking] = useState<any>(null), [dirty, setDirty] = useState(false), [leave, setLeave] = useState(false);
  const mounted = useRef(true), request = useRef<{ signature: string; id: string } | null>(null), notice = useRef<HTMLDivElement>(null);
  const root = `/v1/agent-runtime/tasks/${taskId}/capability-grants`;
  const label = (key: string) => c[key as keyof typeof c] ?? key;
  async function load(cursor?: string) {
    setBusy(true); setError(false);
    try {
      const r = await api<{ data: any }>(root + (cursor ? `?cursor=${cursor}` : ""));
      if (mounted.current) setData((old: any) => cursor && old ? { ...r.data, grants: [...old.grants, ...r.data.grants] } : r.data);
    } catch { if (mounted.current) setError(true); }
    finally { if (mounted.current) setBusy(false); }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [taskId]);
  function close() { if (!busy) dirty ? setLeave(true) : onClose(); }
  function edit() { setDirty(true); setSaved(false); }
  const option = data?.options.find((o: any) => `${o.operation}:${o.credentialId}` === selected);
  const validWindow = Number.isFinite(Date.parse(from)) && Number.isFinite(Date.parse(until)) && Date.parse(from) >= Date.now() - 60000 && Date.parse(from) < Date.parse(until) && Date.parse(until) > Date.now() && Date.parse(until) <= Date.now() + 3600000 && Date.parse(until) <= Date.parse(option?.credentialExpiresAt);
  const currentInput = revoking ? { reason } : option && Number.isFinite(Date.parse(from)) && Number.isFinite(Date.parse(until)) ? { expectedVersion: data.expectedVersion, credentialId: option.credentialId, operation: option.operation, validFrom: new Date(from).toISOString(), validUntil: new Date(until).toISOString(), reason } : null;
  const currentRoute = revoking ? `${root}/${revoking.id}/actions/revoke` : root;
  const isRetry = Boolean(currentInput && request.current?.signature === JSON.stringify({ route: currentRoute, input: currentInput }));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !data || !currentInput || !revoking && (!option || !validWindow && !isRetry)) return;
    const input = currentInput, route = currentRoute;
    const signature = JSON.stringify({ route, input });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setError(false); setSaved(false);
    try {
      await api(route, { method: "POST", body: JSON.stringify({ ...input, requestId: request.current.id }) });
      if (!mounted.current) return;
      request.current = null; setReason(""); setSelected(""); setRevoking(null); setDirty(false); await load(); setSaved(true);
    } catch { if (mounted.current) { setError(true); requestAnimationFrame(() => notice.current?.focus()); } }
    finally { if (mounted.current) setBusy(false); }
  }
  if(showSuspensions)return <CapabilitySuspensionModal taskId={taskId} onClose={()=>{setShowSuspensions(false);void load();}}/>;
  if (leave) return <CcRecordEditorModal titleId="grant-discard" title={c.discard} closeLabel={c.stay} onClose={() => setLeave(false)} onSubmit={e => { e.preventDefault(); onClose(); }} actions={<><CcButton onClick={() => setLeave(false)}>{c.stay}</CcButton><CcButton type="submit" variant="warning">{c.leave}</CcButton></>}>{c.boundary}</CcRecordEditorModal>;
  return <CcRecordEditorModal titleId="grant-title" title={c.title} eyebrow={data?.task.title} description={c.boundary} closeLabel={c.close} onClose={close} onSubmit={submit} maxWidthClassName="max-w-4xl" actions={<><CcButton variant="ghost" disabled={busy} onClick={close}>{c.close}</CcButton>{revoking ? <CcButton variant="warning" type="submit" disabled={busy || reason.trim().length < 3}>{c.confirm}</CcButton> : data?.options.length ? <CcButton variant="primary" type="submit" disabled={busy || !option || !validWindow && !isRetry || reason.trim().length < 3}>{c.issue}</CcButton> : null}</>}>
    <div className="grid min-w-0 gap-5 [overflow-wrap:anywhere]">
      <div ref={notice} tabIndex={-1}>{error ? <CcNotice tone="error" title={c.error} live /> : saved ? <CcNotice tone="success" title={c.saved} live /> : null}</div>
      <SuspensionNotice items={data?.suspensions??[]} onOpen={()=>setShowSuspensions(true)}/>
      {busy && !data ? <CcNotice tone="loading" title={c.loading} /> : null}
      <div className="flex flex-wrap justify-end gap-2"><CcButton variant="outline" size="sm" disabled={busy} onClick={() => void load()}>{c.refresh}</CcButton></div>
      {revoking ? <section className="grid gap-3"><h3 className="font-bold">{c.revoke} · {label(revoking.operation)}</h3><p>{revoking.snapshot.agentLabel} · {revoking.snapshot.credentialPrefix}</p><p>{c.revokedHint}</p><CcButton variant="ghost" disabled={busy} onClick={() => { setRevoking(null); setReason(""); setDirty(false); }}>{c.cancel}</CcButton></section> : data?.options.length ? <section className="grid gap-4">
        <p>{c.application}: {data.applicationLabel}</p><CcField label={c.operation} required>{({ id }) => <CcSelect id={id} required value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setFrom(localTime(new Date())); edit(); }}><option value="">{c.choose}</option>{data.options.map((o: any) => <option key={`${o.operation}:${o.credentialId}`} value={`${o.operation}:${o.credentialId}`}>{o.agentLabel} · {label(o.operation)} · {o.credentialPrefix}</option>)}</CcSelect>}</CcField>
        {option ? <p className="break-words text-sm">{option.agentLabel} · {label(option.operation)} · {c.credential}: {option.credentialPrefix}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">{[[c.from, from, setFrom], [c.until, until, setUntil]].map(([caption, value, setter]) => <CcField key={caption as string} label={caption as string} required>{({ id }) => <input id={id} className="input input-bordered w-full min-w-0" type="datetime-local" step="1" required disabled={busy} value={value as string} onChange={e => { (setter as (value: string) => void)(e.target.value); edit(); }} />}</CcField>)}</div><p className="text-sm text-company-muted">{c.window}</p>
      </section> : data ? <p role="status">{c.unavailable}</p> : null}
      {revoking || data?.options.length ? <CcField label={revoking ? c.revokeReason : c.reason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-24 w-full" required minLength={3} maxLength={1000} disabled={busy} value={reason} onChange={e => { setReason(e.target.value); edit(); }} />}</CcField> : null}
      {data ? <section className="grid gap-4 border-t border-base-300 pt-5"><h3 className="font-bold">{c.history}</h3>{!data.grants.length ? <p>{c.empty}</p> : data.grants.map((g: any) => <article key={g.id} className="grid min-w-0 gap-2 border-b border-base-300 pb-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{g.snapshot.agentLabel} · {label(g.operation)}</strong><span>{label(g.status)}</span></div>
        <p className="break-words">{g.reason}</p><p>{c.application}: {g.snapshot.applicationLabel} · {c.credential}: {g.snapshot.credentialPrefix}</p><p>{c.issuer}: {g.snapshot.issuerLabel}</p>
        <p>{new Date(g.validFrom).toLocaleString(locale)} — {new Date(g.validUntil).toLocaleString(locale)}</p>
        {g.status === "invalidated" ? <p>{c.invalidatedHint}</p> : null}
        {g.usage ? <p>{c.used}: {new Date(g.usage.createdAt).toLocaleString(locale)}</p> : null}
        {g.revocation ? <p>{c.revoked}: {g.revocation.reason} · {new Date(g.revocation.createdAt).toLocaleString(locale)}</p> : null}
        <small className="break-all font-mono">{g.id}</small>
        {!g.revocation && ["active", "pending", "consumed"].includes(g.status) ? <div><CcButton size="sm" variant="outline" disabled={busy || dirty} onClick={() => { setRevoking(g); setReason(""); }}>{c.revoke}</CcButton></div> : null}
      </article>)}{data.nextCursor ? <CcButton variant="outline" disabled={busy} onClick={() => void load(data.nextCursor)}>{c.older}</CcButton> : null}</section> : null}
    </div>
  </CcRecordEditorModal>;
}
