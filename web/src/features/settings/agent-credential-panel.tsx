import { useRef, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { useLanguage } from "../../i18n/i18n";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";

export const credentialCopy = {
  en: { title: "Agent identities", description: "A credential belongs to one agent. Review and correction decisions require the current task role, mandate and skills.", create: "Bind agent credential", agent: "Agent", name: "Credential name", expiry: "Expires on", rotate: "Rotate credential", revoke: "Revoke credential", confirm: "Confirm revocation", cancel: "Cancel", close: "Close", save: "Create credential", active: "Active", revoked: "Revoked", expired: "Expired", inactive: "Agent inactive", last: "Last used", never: "Never", until: "Expires", empty: "No agent credentials yet. Add an active agent in People / Agents to bind one.", loading: "Loading agent identities", error: "Could not complete the request. Retry uses the same request ID. Refresh the list if its version changed.", retry: "Refresh list", saved: "Credential change recorded.", once: "Copy this credential now. It will not be shown again.", copy: "Copy credential", copied: "Copied", replay: "This request was already recorded. The secret is unavailable; rotate the credential if the first response was lost.", rotateHint: "Rotation immediately revokes the previous credential. Update the agent with the new value shown once.", revokeHint: "Revocation is permanent. Existing review history remains available.", limit: "Showing the first 500 entries. The catalog is incomplete.", noAgent: "Select an active agent", scopes: "Access: task review and manager correction commands. No host execution or release authority.", identity: "Agent identity", prefix: "Credential prefix", reauth: "Confirm your password to finish this exact change. The prepared request will be sent once.", password: "Current password", reauthAction: "Confirm and continue", reauthError: "Password confirmation failed. The prepared change is still available." },
  pl: { title: "Tożsamości agentów", description: "Poświadczenie należy do jednego agenta. Decyzje oceny i korekty wymagają aktualnej roli w zadaniu, mandatu i kompetencji.", create: "Powiąż poświadczenie agenta", agent: "Agent", name: "Nazwa poświadczenia", expiry: "Data wygaśnięcia", rotate: "Rotuj poświadczenie", revoke: "Unieważnij poświadczenie", confirm: "Potwierdź unieważnienie", cancel: "Anuluj", close: "Zamknij", save: "Utwórz poświadczenie", active: "Aktywne", revoked: "Unieważnione", expired: "Wygasłe", inactive: "Agent nieaktywny", last: "Ostatnie użycie", never: "Nigdy", until: "Wygasa", empty: "Brak poświadczeń agentów. Dodaj aktywnego agenta w Ludzie / Agenci, aby utworzyć powiązanie.", loading: "Ładowanie tożsamości agentów", error: "Nie udało się wykonać żądania. Ponowienie użyje tego samego identyfikatora. Odśwież listę, jeśli zmieniła się jej wersja.", retry: "Odśwież listę", saved: "Zmiana poświadczenia zapisana.", once: "Skopiuj poświadczenie teraz. Nie będzie można wyświetlić go ponownie.", copy: "Kopiuj poświadczenie", copied: "Skopiowano", replay: "To żądanie zostało już zapisane. Sekret jest niedostępny; rotuj poświadczenie, jeśli pierwsza odpowiedź nie dotarła.", rotateHint: "Rotacja natychmiast unieważnia poprzednie poświadczenie. Zaktualizuj agenta nową wartością wyświetloną jednorazowo.", revokeHint: "Unieważnienie jest trwałe. Historia ocen pozostanie dostępna.", limit: "Wyświetlono pierwsze 500 wpisów. Katalog jest niepełny.", noAgent: "Wybierz aktywnego agenta", scopes: "Dostęp: ocena zadania i decyzje managera o korekcie. Bez uruchamiania hosta i uprawnień do wydania.", identity: "Tożsamość agenta", prefix: "Prefiks poświadczenia", reauth: "Potwierdź hasło, aby dokończyć dokładnie tę zmianę. Przygotowane żądanie zostanie wysłane jeden raz.", password: "Obecne hasło", reauthAction: "Potwierdź i kontynuuj", reauthError: "Potwierdzenie hasła nie powiodło się. Przygotowana zmiana nadal czeka." }
};
type Credential = { id: string; agentId: string; agentName: string; agentStatus: string; name: string; keyPrefix: string; active: boolean; revokedAt: string | null; expiresAt: string; version: number; lastUsedAt: string | null };
type Catalog = { credentials: Credential[]; agents: { id: string; name: string; status: string }[]; truncated: boolean };
type PreparedAction = { path: string; body: string };

async function bodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export function AgentCredentialPanel() {
  const { locale, t } = useLanguage(), c = credentialCopy[locale === "pl" ? "pl" : "en"];
  const [refresh, setRefresh] = useState(0), packet = useOwnerPacket<Catalog>(`/v1/api-keys/agent-credentials?refresh=${refresh}`, true, t);
  const [editor, setEditor] = useState<{ action: "create" | "rotate" | "revoke"; key?: Credential } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedAction | null>(null);
  const [reauthError, setReauthError] = useState(false);
  const request = useRef<{ signature: string; requestId: string } | null>(null);
  const stamp = (value: string | null) => value ? new Date(value).toLocaleString(locale) : c.never;
  const available = (packet.data?.agents ?? []).filter(a => a.status === "active" && !packet.data?.credentials.some(k => k.agentId === a.id && k.active && !k.revokedAt));
  function open(action: "create" | "rotate" | "revoke", key?: Credential) { request.current = null; setPrepared(null); setReauthError(false); setError(false); setNotice(""); setEditor({ action, key }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor || busy) return;
    const form = new FormData(event.currentTarget);
    if (prepared) {
      setBusy(true); setReauthError(false);
      try {
        const password = String(form.get("reauthPassword") || "");
        const proofResponse = await api<{ data: { proof: string } }>("/v1/auth/reauth", {
          method: "POST", body: JSON.stringify({ password, method: "POST", path: prepared.path, bodyDigest: await bodyDigest(prepared.body) })
        });
        const response = await api<{ data: Credential & { key: string | null; replayed: boolean } }>(prepared.path, {
          method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proofResponse.data.proof }
        });
        setPrepared(null); setEditor(null); setSecret(response.data.key);
        setNotice(response.data.replayed ? c.replay : c.saved); setRefresh(v => v + 1);
      } catch (reason) {
        if (reason instanceof AppApiError && reason.code === "invalid_credentials") setReauthError(true);
        else setError(true);
      } finally { setBusy(false); }
      return;
    }
    const expiresAt = editor.action === "revoke" ? undefined : new Date(`${form.get("expiresAt")}T23:59:59.000Z`).toISOString();
    const input = editor.action === "create" ? { agentId: form.get("agentId"), name: form.get("name"), expiresAt } : { expectedVersion: editor.key!.version, ...(expiresAt ? { expiresAt } : {}) };
    const path = editor.action === "create" ? "/v1/api-keys/agent-credentials" : `/v1/api-keys/${editor.key!.id}/actions/${editor.action}`;
    const signature = JSON.stringify({ path, input });
    if (request.current?.signature !== signature) request.current = { signature, requestId: crypto.randomUUID() };
    setBusy(true); setError(false);
    try {
      const body = JSON.stringify({ ...input, requestId: request.current.requestId });
      const response = await api<{ data: Credential & { key: string | null; replayed: boolean } }>(path, { method: "POST", body });
      setEditor(null); setSecret(response.data.key); setNotice(response.data.replayed ? c.replay : c.saved); setRefresh(v => v + 1);
    } catch (reason) {
      if (reason instanceof AppApiError && reason.code === "owner_reauth_required")
        setPrepared({ path, body: JSON.stringify({ ...input, requestId: request.current!.requestId }) });
      else setError(true);
    } finally { setBusy(false); }
  }
  return <div className="roost-access-subsection">
    <h3>{c.title}</h3><div className="px-4"><p>{c.description}</p><p className="text-sm text-base-content/70">{c.scopes}</p></div>
    <div className="roost-settings-actions"><CcButton onClick={() => open("create")} disabled={busy || !available.length} variant="primary">{c.create}</CcButton><CcButton onClick={() => setRefresh(v => v + 1)} disabled={busy} variant="ghost">{c.retry}</CcButton></div>
    {packet.status === "loading" ? <CcNotice tone="loading" title={c.loading} /> : null}
    {packet.status === "error" || error && !editor ? <CcNotice tone="error" title={c.error} /> : null}
    {notice ? <CcNotice live tone="info" title={notice} /> : null}
    {packet.data?.truncated ? <CcNotice tone="warning" title={c.limit} /> : null}
    {packet.status === "ready" && !packet.data?.credentials.length ? <CcNotice tone="info" title={c.empty} /> : null}
    <div className="roost-access-list">{packet.data?.credentials.map(key => {
      const usable = key.active && !key.revokedAt && new Date(key.expiresAt) > new Date() && key.agentStatus === "active";
      const state = key.revokedAt || !key.active ? c.revoked : key.agentStatus !== "active" ? c.inactive : new Date(key.expiresAt) <= new Date() ? c.expired : c.active;
      return <div className="roost-access-row" key={key.id}><div className="roost-access-identity min-w-0"><i className="ph-bold ph-robot" aria-hidden="true" /><span className="min-w-0 break-words"><strong>{key.agentName} · {key.name}</strong><small>{c.prefix}: {key.keyPrefix}</small><small>{c.last}: {stamp(key.lastUsedAt)} · {c.until}: {stamp(key.expiresAt)}</small><details><summary>{c.identity}</summary><small className="break-all">{key.agentId}</small></details></span></div><div className="roost-access-controls"><span className={`badge badge-outline ${usable ? "badge-success" : ""}`}>{state}</span>{key.active && !key.revokedAt ? <><CcButton size="sm" variant="ghost" disabled={busy || key.agentStatus !== "active"} onClick={() => open("rotate", key)}>{c.rotate}</CcButton><CcButton size="sm" variant="ghost" disabled={busy} onClick={() => open("revoke", key)}>{c.revoke}</CcButton></> : null}</div></div>;
    })}</div>
    {editor ? <CcRecordEditorModal titleId="agent-credential-title" eyebrow={c.title} title={editor.action === "create" ? c.create : editor.action === "rotate" ? c.rotate : c.revoke} description={editor.action === "create" ? c.scopes : editor.action === "rotate" ? c.rotateHint : c.revokeHint} onClose={() => !busy && setEditor(null)} onSubmit={submit} closeLabel={c.close} actions={<><CcButton variant="ghost" disabled={busy} onClick={() => setEditor(null)}>{c.cancel}</CcButton><CcButton variant="primary" type="submit" loading={busy}>{prepared ? c.reauthAction : editor.action === "create" ? c.save : editor.action === "rotate" ? c.rotate : c.confirm}</CcButton></>}>
      {error ? <CcNotice tone="error" live title={c.error} /> : null}
      {prepared ? <><CcNotice tone="info" title={c.reauth} />{reauthError ? <CcNotice tone="error" live title={c.reauthError} /> : null}<CcField label={c.password} required>{({ id }) => <input id={id} name="reauthPassword" type="password" autoComplete="current-password" className="input input-bordered w-full" required disabled={busy} />}</CcField></> : null}
      <div className="grid gap-4">{editor.key ? <p>{editor.key.agentName} · {editor.key.name} · {editor.key.keyPrefix}</p> : <><CcField label={c.agent} required>{({ id }) => <select id={id} name="agentId" className="select select-bordered w-full" required defaultValue="" disabled={busy || !!prepared}><option value="">{c.noAgent}</option>{available.map(a => <option key={a.id} value={a.id}>{a.name} · {a.id.slice(0, 8)}</option>)}</select>}</CcField><CcField label={c.name} required>{({ id }) => <input id={id} name="name" className="input input-bordered w-full" required maxLength={120} disabled={busy || !!prepared} />}</CcField></>}
      {editor.action !== "revoke" ? <CcField label={c.expiry} required>{({ id }) => <input id={id} name="expiresAt" className="input input-bordered w-full" type="date" min={new Date().toISOString().slice(0, 10)} max={new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)} defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)} required disabled={busy || !!prepared} />}</CcField> : null}</div>
    </CcRecordEditorModal> : null}
    {secret ? <CcRecordEditorModal titleId="agent-secret-title" eyebrow={c.title} title={c.once} description={c.scopes} onClose={() => setSecret(null)} onSubmit={e => e.preventDefault()} closeLabel={c.close} actions={<><CcButton variant="ghost" onClick={() => setSecret(null)}>{c.close}</CcButton><CcButton variant="primary" onClick={() => { void navigator.clipboard.writeText(secret).then(() => setNotice(c.copied)).catch(() => setNotice(c.once)); }}>{c.copy}</CcButton></>}><input aria-label={c.once} className="input input-bordered w-full font-mono text-xs" readOnly value={secret} autoComplete="off" /></CcRecordEditorModal> : null}
  </div>;
}
