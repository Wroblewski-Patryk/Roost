import { useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { AuthMe } from "../../types";

export function TaskVerifierInvite({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const active = profile.data?.workspaces?.find((workspace) => workspace.active);
  const workspaceId = active?.id ?? profile.data?.workspaceId;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");

  if (active?.role !== "owner" || !workspaceId) return null;

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId || busy) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setBusy(true); setError(false);
    try {
      const response = await api<{ data: { token: string; email: string; taskScopeId: string } }>(`/v1/workspaces/${workspaceId}/access/task-invitations`, {
        method: "POST", body: JSON.stringify({ email, taskId })
      });
      if (response.data.taskScopeId !== taskId) throw new Error("scope_mismatch");
      setRecipient(response.data.email);
      setLink(`${window.location.origin}/auth/invitations/${response.data.token}`);
      setOpen(false);
    } catch { setError(true); } finally { setBusy(false); }
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); } catch { setError(true); }
  }

  return <>
    <div className="flex flex-wrap items-center gap-3">
      <CcButton iconLeft="ph-user-plus" onClick={() => { setError(false); setOpen(true); }} size="sm" variant="outline">{t("taskInvite.open")}</CcButton>
      <span className="text-sm text-company-muted">{t("taskInvite.assignmentSeparate")}</span>
    </div>
    {error ? <CcNotice live tone="error" title={t("taskInvite.error")} /> : null}
    {link ? <CcRecordEditorModal actions={<><CcButton onClick={() => setLink(null)} variant="ghost">{t("workspaceAccess.done")}</CcButton><CcButton iconLeft="ph-copy" onClick={() => void copy()} variant="primary">{t("workspaceAccess.copy")}</CcButton></>} description={t("taskInvite.linkDescription", { email: recipient, task: taskTitle })} eyebrow={t("taskInvite.open")} onClose={() => setLink(null)} title={t("taskInvite.linkTitle")} titleId="task-verifier-link-title"><CcRecordEditorSection description={t("workspaceAccess.secretOnce")} title={t("workspaceAccess.copyNow")}><input className="input input-bordered w-full font-mono text-xs" readOnly value={link} /></CcRecordEditorSection></CcRecordEditorModal> : null}
    {open ? <CcRecordEditorModal actions={<><CcButton onClick={() => setOpen(false)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("taskInvite.create")}</CcButton></>} description={t("taskInvite.description", { task: taskTitle })} eyebrow={t("taskInvite.open")} onClose={() => setOpen(false)} onSubmit={invite} title={t("taskInvite.title")} titleId="task-verifier-invite-title"><CcRecordEditorSection description={t("taskInvite.assignmentSeparate")} title={taskTitle}><CcField label={t("account.email")} required>{({ id }) => <input className="input input-bordered w-full" id={id} name="email" required type="email" />}</CcField></CcRecordEditorSection></CcRecordEditorModal> : null}
  </>;
}
