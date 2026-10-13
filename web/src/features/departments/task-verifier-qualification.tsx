import { useEffect, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";

type View = {
  task: { id: string; title: string };
  executor: { id: string; name: string; revision: string } | null;
  checklist: { id: string; version: number; decisionId: string; sourceDigest: string; reviewIds: string[]; current: boolean } | null;
  candidates: { id: string; name: string; revision: string; competency: string }[];
  latest: { id: string; action: string; verifierId: string; evidence: string; rationale: string; validUntil: string } | null;
  current: { id: string; verifierId: string; validUntil: string } | null;
  canQualify: boolean;
  expectedVersion: string;
};

async function bodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function TaskVerifierQualification({ taskId, contract, onClose, onSaved }: {
  taskId: string; contract: Record<string, unknown> | null; onClose: () => void; onSaved?: () => void;
}) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [view, setView] = useState<View | null>(null);
  const [verifierId, setVerifierId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [rationale, setRationale] = useState("");
  const [prepared, setPrepared] = useState<{ action: "qualify" | "revoke"; body: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const path = `/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/verifier-qualification`;
  async function refresh() {
    setBusy(true); setError("");
    try {
      const result = await api<{ data: View }>(path, { cache: "no-store" });
      setView(result.data);
      setPrepared(null);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "load_failed");
    } finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [taskId]);
  function prepare(action: "qualify" | "revoke") {
    if (!view || busy || action === "qualify" && (!view.canQualify || !verifierId || !contract || evidence.trim().length < 20 || rationale.trim().length < 20)
      || action === "revoke" && !view.current) return;
    const payload = action === "qualify"
      ? { action, requestId: crypto.randomUUID(), expectedVersion: view.expectedVersion, verifierId, contract, evidence: evidence.trim(), rationale: rationale.trim() }
      : { action, requestId: crypto.randomUUID(), expectedVersion: view.expectedVersion, rationale: rationale.trim() };
    setPrepared({ action, body: JSON.stringify(payload) });
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared || busy) return;
    const password = String(new FormData(event.currentTarget).get("ownerPassword") || "");
    if (!password) return;
    setBusy(true); setError("");
    try {
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", {
        method: "POST", body: JSON.stringify({ password, method: "POST", path, bodyDigest: await bodyDigest(prepared.body) })
      });
      await api(path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      setSaved(true); setPrepared(null); onSaved?.();
      const response = await api<{ data: View }>(path, { cache: "no-store" });
      setView(response.data);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "save_failed");
    } finally { setBusy(false); }
  }
  const chosen = view?.candidates.find(item => item.id === verifierId);
  return <CcRecordEditorModal titleId="task-verifier-qualification-title"
    eyebrow={pl ? "Kwalifikacja weryfikatora" : "Verifier qualification"}
    title={view?.task.title ?? (pl ? "Zadanie" : "Task")}
    description={pl
      ? "Wyjątek dotyczy tylko tego zadania i przyjętej checklisty. Nie dopisuje kompetencji do profilu agenta. Późniejsza niezależna ocena wyniku nadal jest wymagana."
      : "This authorization applies only to this task and accepted checklist. It does not add a skill to the agent profile. Independent result review is still required."}
    onClose={onClose} onSubmit={submit} closeLabel={pl ? "Zamknij" : "Close"}
    actions={<><CcButton variant="ghost" onClick={onClose} disabled={busy}>{pl ? "Zamknij" : "Close"}</CcButton>
      {prepared ? <CcButton type="submit" variant="primary" loading={busy}>{pl ? "Potwierdź i zapisz" : "Confirm and save"}</CcButton>
          : view?.current ? <CcButton variant="outline" disabled={busy || rationale.trim().length < 20} onClick={() => prepare("revoke")}>{pl ? "Cofnij kwalifikację" : "Revoke qualification"}</CcButton>
          : <CcButton variant="primary" disabled={busy || !view?.canQualify || !chosen || !contract || evidence.trim().length < 20 || rationale.trim().length < 20}
            onClick={() => prepare("qualify")}>{pl ? "Przygotuj potwierdzenie" : "Prepare confirmation"}</CcButton>}</>}>
    {busy && !view ? <p role="status">{pl ? "Ładowanie…" : "Loading…"}</p> : null}
    {error ? <CcNotice tone="error" live title={pl ? "Nie udało się wykonać operacji" : "The operation failed"} detail={error} /> : null}
    {saved ? <CcNotice tone="success" live title={pl ? "Decyzja zapisana" : "Decision recorded"} /> : null}
    {view ? <div className="grid gap-4 text-sm">
      <p><strong>{pl ? "Wykonawca" : "Executor"}:</strong> {view.executor?.name ?? "—"} · <code>{view.executor?.id}</code></p>
      <p><strong>{pl ? "Checklista" : "Checklist"}:</strong> {view.checklist ? `v${view.checklist.version} · ${view.checklist.id}` : "—"} · {view.checklist?.current ? pl ? "aktualna" : "current" : pl ? "nieaktualna" : "stale"}</p>
      <p className="break-all"><strong>{pl ? "Decyzja właściciela" : "Owner decision"}:</strong> {view.checklist?.decisionId ?? "—"}</p>
      <p className="break-all"><strong>{pl ? "Skrót źródeł" : "Source digest"}:</strong> {view.checklist?.sourceDigest ?? "—"}</p>
      <p className="break-all"><strong>{pl ? "Potwierdzone Findings" : "Confirmed Findings"}:</strong> {view.checklist?.reviewIds.join(", ") || "—"}</p>
      {contract ? <details><summary>{pl ? "Dokładny kontrakt zadania objęty kwalifikacją" : "Exact task contract covered by qualification"}</summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(contract,null,2)}</pre></details> : null}
      {view.current ? <CcNotice tone="success" title={pl ? "Kwalifikacja aktywna" : "Qualification active"} detail={`${view.current.verifierId} · ${view.current.validUntil}`} /> : null}
      {view.latest && !view.current ? <CcNotice tone="warning" title={pl ? "Brak aktywnej kwalifikacji" : "No active qualification"} detail={pl ? "Poprzednia decyzja została cofnięta lub utraciła aktualność." : "The previous decision was revoked or became stale."} /> : null}
      {prepared ? <>
        <CcNotice tone="warning" title={pl ? "Potwierdź dokładny zakres" : "Confirm the exact scope"}
          detail={prepared.action === "qualify"
            ? `${chosen?.name} · application audit · ${view.task.id} · v${view.checklist?.version} · ${view.checklist?.reviewIds.join(", ")}`
            : pl ? "Cofnięcie aktualnej kwalifikacji tego zadania" : "Revoke this task's current qualification"} />
        <p><strong>{pl ? "Dowód" : "Evidence"}:</strong> {prepared.action === "qualify" ? evidence : view.latest?.evidence}</p>
        <p><strong>{pl ? "Uzasadnienie" : "Rationale"}:</strong> {rationale}</p>
        <CcField label={pl ? "Obecne hasło" : "Current password"} required>{({ id }) =>
          <input id={id} name="ownerPassword" type="password" autoComplete="current-password" required className="input input-bordered w-full" disabled={busy} />}</CcField>
      </> : <>
        {!view.current ? <CcField label={pl ? "Niezależny weryfikator" : "Independent verifier"} required>{({ id }) =>
          <CcSelect id={id} value={verifierId} disabled={busy || !view.canQualify} onChange={event => setVerifierId(event.target.value)}>
            <option value="">{pl ? "Wybierz agenta" : "Choose an agent"}</option>
            {view.candidates.map(item => <option key={item.id} value={item.id}>{item.name} · {item.competency}</option>)}
          </CcSelect>}</CcField> : null}
        {!view.current ? <CcField label={pl ? "Dowód kompetencji dla tej checklisty" : "Competence evidence for this checklist"} required>{({ id }) =>
          <textarea id={id} className="textarea textarea-bordered w-full" value={evidence} minLength={20} maxLength={2000}
            onChange={event => setEvidence(event.target.value)} disabled={busy} />}</CcField> : null}
        <CcField label={pl ? "Uzasadnienie decyzji" : "Decision rationale"} required>{({ id }) =>
          <textarea id={id} className="textarea textarea-bordered w-full" value={rationale} minLength={20} maxLength={2000}
            onChange={event => setRationale(event.target.value)} disabled={busy} />}</CcField>
        {!view.canQualify && !view.current ? <CcNotice tone="warning" title={pl ? "Kwalifikacja niedostępna" : "Qualification unavailable"}
          detail={pl ? "Sprawdź status zadania, przyjętą checklistę i agentów z mandatem weryfikacji." : "Check the task status, accepted checklist and agents with review authority."} /> : null}
      </>}
    </div> : null}
  </CcRecordEditorModal>;
}
