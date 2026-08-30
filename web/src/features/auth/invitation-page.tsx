import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api/client";
import { setOwnerToken } from "../../api/auth-token";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { useLanguage } from "../../i18n/i18n";
import { PublicLayout } from "../../layout/public-layout";

type InvitationPreview = {
  email: string;
  role: string;
  expiresAt: string;
  accountExists: boolean;
  workspace: { name: string; logo?: string | null };
};

export function InvitationPage({ token }: { token: string }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: InvitationPreview }>(`/v1/auth/invitations/${token}`)
      .then((response) => { setPreview(response.data); setStatus("ready"); })
      .catch(() => { setError(t("invitation.invalid")); setStatus("error"); });
  }, [t, token]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("submitting"); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await api<{ data: { token: string } }>(`/v1/auth/invitations/${token}/accept`, {
        method: "POST", body: JSON.stringify({ name: String(form.get("name") || "") || undefined, password: form.get("password") })
      });
      setOwnerToken(response.data.token);
      window.location.assign("/areas?area=00-ogolny&view=overview");
    } catch { setError(t("invitation.acceptError")); setStatus("error"); }
  }

  return <PublicLayout active="login">
    <section className="roost-auth-shell">
      <div className="roost-auth-context"><p className="roost-auth-kicker">{t("invitation.kicker")}</p><h1>{t("invitation.title")}</h1><p>{t("invitation.description")}</p></div>
      <form className="roost-auth-card" onSubmit={accept}>
        <header className="roost-auth-card-header"><span className="roost-auth-card-icon"><i className="ph-bold ph-user-plus" aria-hidden="true"></i></span><div><h2>{preview?.workspace.name || t("invitation.loading")}</h2><p>{preview ? t("invitation.accessSummary", { email: preview.email, role: preview.role }) : t("invitation.loading")}</p></div></header>
        {status === "loading" ? <CcNotice tone="loading" title={t("invitation.loading")} /> : null}
        {error ? <CcNotice live tone="error" title={error} /> : null}
        {preview ? <>
          {!preview.accountExists ? <CcField label={t("auth.name")} required>{({ id }) => <CcTextInput autoComplete="name" id={id} name="name" required />}</CcField> : null}
          <CcField hint={t(preview.accountExists ? "invitation.existingPasswordHint" : "invitation.newPasswordHint")} label={t("auth.password")} required>{({ id, describedBy }) => <CcTextInput aria-describedby={describedBy} autoComplete={preview.accountExists ? "current-password" : "new-password"} id={id} minLength={12} name="password" required type="password" />}</CcField>
          <CcButton className="roost-auth-submit" iconRight="ph-arrow-right" loading={status === "submitting"} type="submit" variant="primary">{t("invitation.accept")}</CcButton>
        </> : null}
        <div className="roost-auth-switch"><span>{t("invitation.alreadyMember")}</span><a href="/auth/login">{t("auth.submit.login")}<i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i></a></div>
      </form>
    </section>
  </PublicLayout>;
}
