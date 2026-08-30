import { FormEvent, useMemo, useState } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcToast } from "../../components/cc-toast";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
type Member = { id: string; userId: string; email: string; name?: string | null; role: WorkspaceRole; primaryOwner: boolean; joinedAt: string };
type Invitation = { id: string; email: string; role: WorkspaceRole; status: string; expiresAt: string; invitedBy: string };
type ApiKeyRecord = { id: string; name: string; keyPrefix?: string | null; scopes: string[]; active: boolean; lastUsedAt?: string | null };
type ApiKeyProfile = { id: string; label: string; description: string; riskLevel: string };

const roleOptions: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];

function roleLabel(role: WorkspaceRole, t: ReturnType<typeof useLanguage>["t"]) {
  return t(`workspaceAccess.role.${role}`);
}

function invitationLink(token: string) {
  return `${window.location.origin}/auth/invitations/${token}`;
}

export function WorkspaceAccessSection({ workspaceId, currentUserId, currentRole }: { workspaceId: string; currentUserId?: string; currentRole: WorkspaceRole }) {
  const { t } = useLanguage();
  const [refresh, setRefresh] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const canAdminister = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";
  const members = useOwnerPacket<Member[]>(`/v1/workspaces/${workspaceId}/access/members?refresh=${refresh}`, true, t);
  const invitations = useOwnerPacket<Invitation[]>(`/v1/workspaces/${workspaceId}/access/invitations?refresh=${refresh}`, canAdminister, t);
  const apiKeys = useOwnerPacket<ApiKeyRecord[]>(`/v1/api-keys?refresh=${refresh}`, canAdminister, t);
  const profiles = useOwnerPacket<ApiKeyProfile[]>("/v1/api-keys/profiles", canAdminister, t);
  const activeMembers = members.data || [];
  const currentMembership = activeMembers.find((member) => member.userId === currentUserId);
  const isPrimaryOwner = Boolean(currentMembership?.primaryOwner);
  const pendingInvitations = invitations.data || [];
  const activeKeys = useMemo(() => (apiKeys.data || []).filter((key) => key.active), [apiKeys.data]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setSuccess(t("workspaceAccess.copied"));
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await api<{ data: { token: string; email: string } }>(`/v1/workspaces/${workspaceId}/access/invitations`, {
        method: "POST", body: JSON.stringify({ email: form.get("email"), role: form.get("role") })
      });
      setInviteOpen(false); setRefresh((value) => value + 1);
      setSecret({ title: t("workspaceAccess.inviteLink"), value: invitationLink(response.data.token) });
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function changeRole(member: Member, role: WorkspaceRole) {
    setBusy(true); setError(null);
    try {
      await api(`/v1/workspaces/${workspaceId}/access/members/${member.userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setRefresh((value) => value + 1); setSuccess(t("workspaceAccess.roleChanged"));
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function removeMember() {
    if (!removeTarget) return;
    setBusy(true); setError(null);
    try {
      await api(`/v1/workspaces/${workspaceId}/access/members/${removeTarget.userId}`, { method: "DELETE" });
      setRemoveTarget(null); setRefresh((value) => value + 1); setSuccess(t("workspaceAccess.memberRemoved"));
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function transferOwnership() {
    if (!transferTarget) return;
    setBusy(true); setError(null);
    try {
      await api(`/v1/workspaces/${workspaceId}/access/actions/transfer-ownership`, {
        method: "POST", body: JSON.stringify({ userId: transferTarget.userId })
      });
      window.location.reload();
    } catch { setError(t("workspaceAccess.actionError")); setBusy(false); }
  }

  async function reissue(invitation: Invitation) {
    setBusy(true); setError(null);
    try {
      const response = await api<{ data: { token: string } }>(`/v1/workspaces/${workspaceId}/access/invitations/${invitation.id}/actions/reissue`, { method: "POST" });
      setRefresh((value) => value + 1); setSecret({ title: t("workspaceAccess.inviteLink"), value: invitationLink(response.data.token) });
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function revokeInvitation(invitation: Invitation) {
    setBusy(true); setError(null);
    try {
      await api(`/v1/workspaces/${workspaceId}/access/invitations/${invitation.id}`, { method: "DELETE" });
      setRefresh((value) => value + 1); setSuccess(t("workspaceAccess.inviteRevoked"));
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await api<{ data: { key: string } }>("/v1/api-keys", {
        method: "POST", body: JSON.stringify({ name: form.get("name"), profileId: form.get("profileId") })
      });
      setKeyOpen(false); setRefresh((value) => value + 1);
      setSecret({ title: t("workspaceAccess.apiKeySecret"), value: response.data.key });
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  async function toggleKey(key: ApiKeyRecord) {
    setBusy(true); setError(null);
    try {
      await api(`/v1/api-keys/${key.id}`, { method: "PATCH", body: JSON.stringify({ active: !key.active }) });
      setRefresh((value) => value + 1); setSuccess(t(key.active ? "workspaceAccess.keyRevoked" : "workspaceAccess.keyEnabled"));
    } catch { setError(t("workspaceAccess.actionError")); } finally { setBusy(false); }
  }

  return <>
    <section className="roost-settings-panel" aria-labelledby="workspace-members-heading">
      <header><span className="roost-settings-panel-icon"><i className="ph-bold ph-users-three" aria-hidden="true"></i></span><div><h2 id="workspace-members-heading">{t("workspaceAccess.members")}</h2><p>{t("workspaceAccess.membersDescription")}</p></div></header>
      {canAdminister ? <div className="roost-settings-actions"><CcButton iconLeft="ph-user-plus" onClick={() => setInviteOpen(true)} variant="primary">{t("workspaceAccess.invite")}</CcButton></div> : null}
      {members.status === "loading" ? <CcNotice tone="loading" title={t("workspaceAccess.loading")} /> : null}
      {members.status === "error" ? <CcNotice tone="error" title={members.error || t("workspaceAccess.actionError")} /> : null}
      <div className="roost-access-list">
        {activeMembers.map((member) => <div className="roost-access-row" key={member.id}>
          <div className="roost-access-identity"><span className="avatar placeholder"><span className="bg-base-300 text-base-content rounded-full w-10">{(member.name || member.email).slice(0, 2).toUpperCase()}</span></span><span><strong>{member.name || member.email}</strong><small>{member.email}{member.primaryOwner ? ` · ${t("workspaceAccess.primaryOwner")}` : ""}</small></span></div>
          <div className="roost-access-controls">
            {canAdminister && !member.primaryOwner && member.userId !== currentUserId ? <select aria-label={t("workspaceAccess.roleLabel")} className="select select-bordered select-sm" disabled={busy || (!isOwner && (member.role === "owner" || member.role === "admin"))} onChange={(event) => void changeRole(member, event.target.value as WorkspaceRole)} value={member.role}>{roleOptions.filter((role) => isOwner || (role !== "owner" && role !== "admin")).map((role) => <option key={role} value={role}>{roleLabel(role, t)}</option>)}</select> : <span className="badge badge-outline">{roleLabel(member.role, t)}</span>}
            {isOwner && isPrimaryOwner && !member.primaryOwner ? <CcButton disabled={busy} iconLeft="ph-crown" onClick={() => setTransferTarget(member)} size="sm" variant="ghost">{t("workspaceAccess.transfer")}</CcButton> : null}
            {canAdminister && !member.primaryOwner && member.userId !== currentUserId ? <CcButton ariaLabel={t("workspaceAccess.remove")} disabled={busy || (!isOwner && (member.role === "owner" || member.role === "admin"))} iconLeft="ph-user-minus" onClick={() => setRemoveTarget(member)} size="sm" variant="ghost">{t("workspaceAccess.remove")}</CcButton> : null}
          </div>
        </div>)}
      </div>
      {canAdminister && pendingInvitations.length ? <div className="roost-access-subsection"><h3>{t("workspaceAccess.pendingInvites")}</h3>{pendingInvitations.map((invitation) => <div className="roost-access-row" key={invitation.id}><div className="roost-access-identity"><i className="ph-bold ph-envelope-simple" aria-hidden="true"></i><span><strong>{invitation.email}</strong><small>{roleLabel(invitation.role, t)} · {invitation.status}</small></span></div><div className="roost-access-controls"><CcButton disabled={busy} onClick={() => void reissue(invitation)} size="sm" variant="ghost">{t("workspaceAccess.reissue")}</CcButton><CcButton disabled={busy} onClick={() => void revokeInvitation(invitation)} size="sm" variant="ghost">{t("workspaceAccess.revoke")}</CcButton></div></div>)}</div> : null}
    </section>
    {canAdminister ? <section className="roost-settings-panel" aria-labelledby="workspace-agent-access-heading">
      <header><span className="roost-settings-panel-icon"><i className="ph-bold ph-robot" aria-hidden="true"></i></span><div><h2 id="workspace-agent-access-heading">{t("workspaceAccess.agents")}</h2><p>{t("workspaceAccess.agentsDescription")}</p></div></header>
      <div className="roost-settings-actions"><CcButton iconLeft="ph-key" onClick={() => setKeyOpen(true)} variant="outline">{t("workspaceAccess.createKey")}</CcButton></div>
      <div className="roost-access-list">{(apiKeys.data || []).map((key) => <div className="roost-access-row" key={key.id}><div className="roost-access-identity"><i className="ph-bold ph-key" aria-hidden="true"></i><span><strong>{key.name}</strong><small>{key.keyPrefix || t("workspaceAccess.legacyKey")} · {key.scopes.join(", ")}</small></span></div><div className="roost-access-controls"><span className={`badge badge-outline ${key.active ? "badge-success" : ""}`}>{t(key.active ? "workspaceAccess.active" : "workspaceAccess.revoked")}</span><CcButton disabled={busy} onClick={() => void toggleKey(key)} size="sm" variant="ghost">{t(key.active ? "workspaceAccess.revoke" : "workspaceAccess.enable")}</CcButton></div></div>)}</div>
      {!activeKeys.length && apiKeys.status === "ready" ? <CcNotice tone="info" title={t("workspaceAccess.noActiveKeys")} /> : null}
    </section> : null}
    {error ? <CcNotice detail={error} live title={t("workspaceAccess.actionError")} tone="error" /> : null}
    {success ? <CcToast detail={success} dismissLabel={t("common.dismiss")} onDismiss={() => setSuccess(null)} title={t("workspaceAccess.saved")} tone="success" /> : null}
    {secret ? <CcRecordEditorModal actions={<><CcButton onClick={() => setSecret(null)} variant="ghost">{t("workspaceAccess.done")}</CcButton><CcButton iconLeft="ph-copy" onClick={() => void copy(secret.value)} variant="primary">{t("workspaceAccess.copy")}</CcButton></>} description={t("workspaceAccess.secretOnce")} eyebrow={t("workspaceAccess.accessCreated")} onClose={() => setSecret(null)} title={secret.title} titleId="workspace-secret-title"><CcRecordEditorSection description={t("workspaceAccess.secretOnce")} title={t("workspaceAccess.copyNow")}><input className="input input-bordered w-full font-mono text-xs" readOnly value={secret.value} /></CcRecordEditorSection></CcRecordEditorModal> : null}
    {inviteOpen ? <CcRecordEditorModal actions={<><CcButton onClick={() => setInviteOpen(false)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("workspaceAccess.createInvite")}</CcButton></>} description={t("workspaceAccess.inviteDescription")} eyebrow={t("workspaceAccess.members")} onClose={() => setInviteOpen(false)} onSubmit={invite} title={t("workspaceAccess.invite")} titleId="workspace-invite-title"><CcRecordEditorSection description={t("workspaceAccess.inviteExpiry")} title={t("workspaceAccess.inviteDetails")}><div className="grid gap-4 sm:grid-cols-2"><CcField label={t("account.email")} required>{({ id }) => <input className="input input-bordered w-full" id={id} name="email" required type="email" />}</CcField><CcField label={t("workspaceAccess.roleLabel")} required>{({ id }) => <select className="select select-bordered w-full" defaultValue="member" id={id} name="role">{[...(isOwner ? ["admin"] : []), "member", "viewer"].map((role) => <option key={role} value={role}>{roleLabel(role as WorkspaceRole, t)}</option>)}</select>}</CcField></div></CcRecordEditorSection></CcRecordEditorModal> : null}
    {keyOpen ? <CcRecordEditorModal actions={<><CcButton onClick={() => setKeyOpen(false)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("workspaceAccess.createKey")}</CcButton></>} description={t("workspaceAccess.keyDescription")} eyebrow={t("workspaceAccess.agents")} onClose={() => setKeyOpen(false)} onSubmit={createKey} title={t("workspaceAccess.createKey")} titleId="workspace-key-title"><CcRecordEditorSection description={t("workspaceAccess.keyScopeDescription")} title={t("workspaceAccess.keyDetails")}><div className="grid gap-4"><CcField label={t("workspaceAccess.keyName")} required>{({ id }) => <input className="input input-bordered w-full" id={id} name="name" required />}</CcField><CcField label={t("workspaceAccess.keyProfile")} required>{({ id }) => <select className="select select-bordered w-full" id={id} name="profileId" required>{(profiles.data || []).map((profile) => <option key={profile.id} value={profile.id}>{profile.label} · {profile.riskLevel}</option>)}</select>}</CcField></div></CcRecordEditorSection></CcRecordEditorModal> : null}
    {removeTarget ? <CcConfirmDialog busy={busy} confirmIcon="ph-user-minus" confirmLabel={t("workspaceAccess.remove")} confirmTone="danger" description={t("workspaceAccess.removeDescription")} detail={removeTarget.name || removeTarget.email} eyebrow={t("workspaceAccess.members")} onCancel={() => setRemoveTarget(null)} onConfirm={() => void removeMember()} title={t("workspaceAccess.removeTitle")} /> : null}
    {transferTarget ? <CcConfirmDialog busy={busy} confirmIcon="ph-crown" confirmLabel={t("workspaceAccess.transfer")} description={t("workspaceAccess.transferDescription")} detail={transferTarget.name || transferTarget.email} eyebrow={t("workspaceAccess.members")} onCancel={() => setTransferTarget(null)} onConfirm={() => void transferOwnership()} title={t("workspaceAccess.transferTitle")} /> : null}
  </>;
}
