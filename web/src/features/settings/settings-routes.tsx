import { FormEvent, useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcIdentityMark, CcIdentityPicker } from "../../components/cc-identity-picker";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcToast } from "../../components/cc-toast";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { formatAppDate } from "../../i18n/date-format";
import { useLanguage } from "../../i18n/i18n";
import { AuthMe, ConnectionPacket, IntegrationStatus, LoadState } from "../../types";

const workspaceAccentPresets = ["#6366F1", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EC4899"];

function identityLabels(t: ReturnType<typeof useLanguage>["t"]) {
  return {
    initials: t("identity.initials"),
    icon: t("identity.icon"),
    image: t("identity.image"),
    chooseFile: t("identity.chooseFile"),
    replaceFile: t("identity.replaceFile"),
    removeFile: t("identity.removeFile"),
    imageHint: t("identity.imageHint"),
    imageTooLarge: t("identity.imageTooLarge"),
    imageInvalid: t("identity.imageInvalid"),
    searchIcons: t("identity.searchIcons")
  };
}

function SettingRow({ icon, label, value }: { icon?: string; label: string; value?: string | null }) {
  return (
    <div className="roost-settings-fact">
      {icon ? <i className={`ph-bold ${icon}`} aria-hidden="true"></i> : null}
      <span><small>{label}</small><strong>{value || "—"}</strong></span>
    </div>
  );
}

function roleLabel(role: string | undefined, t: ReturnType<typeof useLanguage>["t"]) {
  return role === "owner" ? t("account.role.owner") : role || "—";
}

function authLabel(authType: AuthMe["authType"] | undefined, t: ReturnType<typeof useLanguage>["t"]) {
  if (authType === "user") return t("account.auth.user");
  if (authType === "api_key") return t("account.auth.api_key");
  return "—";
}

function useIntegrationSetting(provider: "clickup" | "google_drive", enabled: boolean, refreshKey = 0): LoadState<IntegrationStatus | null> {
  const [state, setState] = useState<LoadState<IntegrationStatus | null>>({ status: enabled ? "loading" : "idle", data: null });

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ status: "idle", data: null });
      return () => {
        active = false;
      };
    }

    setState({ status: "loading", data: null });
    api<{ data: IntegrationStatus }>(`/v1/integration-settings/${provider}`)
      .then((response) => {
        if (active) {
          setState({ status: "ready", data: response.data });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        if (error instanceof AppApiError && error.code === "integration_not_configured") {
          setState({ status: "ready", data: null });
          return;
        }
        setState({ status: "error", data: null, error: "settings provider status unavailable" });
      });

    return () => {
      active = false;
    };
  }, [enabled, provider, refreshKey]);

  return state;
}

function StatusBadge({ ready }: { ready: boolean }) {
  const { t } = useLanguage();
  return (
    <span className={`badge ${ready ? "badge-success" : "badge-warning"} badge-outline font-black`}>
      {ready ? t("workspaceSettings.status.configured") : t("workspaceSettings.status.unconfigured")}
    </span>
  );
}

function IntegrationRow({
  title,
  icon,
  connectionStatus,
  settingStatus,
  onConfigure,
  onToggle,
  busy,
  requiresRefreshToken = false
}: {
  title: string;
  icon: string;
  connectionStatus?: IntegrationStatus;
  settingStatus: LoadState<IntegrationStatus | null>;
  onConfigure: () => void;
  onToggle: (active: boolean) => void;
  busy: boolean;
  requiresRefreshToken?: boolean;
}) {
  const { t } = useLanguage();
  const setting = settingStatus.data ?? undefined;
  const status = setting ?? connectionStatus;
  const configured = Boolean(status?.secretConfigured ?? status?.configured);
  const active = Boolean(status?.active);
  const updatedAt = status?.updatedAt ? formatAppDate(status.updatedAt, { dateStyle: "medium", timeStyle: "short" }) : null;
  const ready = configured && active && (!requiresRefreshToken || Boolean(status?.hasRefreshToken));

  return (
    <article className="roost-integration-row">
      <span className="roost-integration-row-icon"><i className={`ph-bold ${icon}`} aria-hidden="true"></i></span>
      <div className="roost-integration-row-copy">
        <div className="flex flex-wrap items-center gap-2"><h3>{title}</h3><StatusBadge ready={ready} /></div>
        <p>{settingStatus.status === "loading" ? t("workspaceSettings.loadingProvider") : ready ? t("workspaceSettings.providerReadyDetail") : t("workspaceSettings.providerSetupDetail")}</p>
        {updatedAt ? <small>{t("workspaceSettings.lastUpdatedValue", { date: updatedAt })}</small> : null}
      </div>
      <div className="roost-integration-row-actions">
        {configured ? <label className="label cursor-pointer gap-2 py-0"><span className="label-text text-xs font-bold">{active ? t("workspaceSettings.enabled") : t("workspaceSettings.disabled")}</span><input aria-label={t("workspaceSettings.toggleConnection", { provider: title })} checked={active} className="toggle toggle-primary toggle-sm" disabled={busy} onChange={(event) => onToggle(event.target.checked)} type="checkbox" /></label> : null}
        <CcButton iconRight="ph-arrow-right" onClick={onConfigure} size="sm" variant={ready ? "outline" : "primary"}>
          {ready ? t("workspaceSettings.manage") : t("workspaceSettings.configure")}
        </CcButton>
      </div>
    </article>
  );
}

type IntegrationEditor = "clickup" | "google_drive" | null;

export function AccountSettingsRoute() {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profilePassword, setProfilePassword] = useState("");
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const activeWorkspace = profile.data?.workspaces?.find((workspace) => workspace.active);
  const emailChanged = Boolean(profile.data?.user?.email && email.trim().toLowerCase() !== profile.data.user.email.toLowerCase());

  useEffect(() => {
    setName(profile.data?.user?.name || "");
    setEmail(profile.data?.user?.email || "");
    setAvatar(profile.data?.user?.avatar || "initials");
  }, [profile.data?.user?.avatar, profile.data?.user?.email, profile.data?.user?.name]);

  function friendlyAccountError(reason: unknown) {
    if (reason instanceof AppApiError) {
      if (reason.code === "current_password_invalid") return t("account.error.currentPassword");
      if (reason.code === "email_already_registered") return t("account.error.emailTaken");
      if (reason.code === "new_password_must_differ") return t("account.error.passwordSame");
    }
    return t("account.error.generic");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api<{ data: { name: string | null; email: string; avatar?: string | null } }>("/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), avatar, ...(profilePassword ? { currentPassword: profilePassword } : {}) })
      });
      setName(response.data.name || "");
      setEmail(response.data.email);
      setProfilePassword("");
      setAvatar(response.data.avatar || "initials");
      window.dispatchEvent(new CustomEvent("roost:profile-updated", { detail: { name: response.data.name, avatar: response.data.avatar } }));
      setSuccess(t("account.profileSaved"));
    } catch (reason) {
      setError(friendlyAccountError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setError(t("account.error.passwordMismatch"));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/v1/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setPasswordEditorOpen(false);
      setSuccess(t("account.passwordChanged"));
    } catch (reason) {
      setError(friendlyAccountError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="roost-settings-page">
        <header className="roost-settings-header">
          <span>{t("user.myAccount")}</span>
          <h1>{t("account.title")}</h1>
          <p>{t("account.description")}</p>
        </header>
        {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
        <section className="roost-settings-panel" aria-labelledby="account-profile-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-user-circle" aria-hidden="true"></i></span>
            <div><h2 id="account-profile-heading">{t("account.profile")}</h2><p>{t("account.profileDescription")}</p></div>
          </header>
          <form className="roost-account-form" onSubmit={saveProfile}>
            <div className="roost-account-identity">
              <CcField label={t("account.avatar")} hint={t("account.avatarHint")}>
                {() => <CcIdentityPicker labels={identityLabels(t)} onChange={setAvatar} previewName={name || email} value={avatar} />}
              </CcField>
            </div>
            <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.name")}</span></span><input autoComplete="name" className="input input-bordered w-full" disabled={profile.status !== "ready"} maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></label>
            <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.email")}</span></span><input autoComplete="email" className="input input-bordered w-full" disabled={profile.status !== "ready"} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            {emailChanged ? <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.confirmEmailChange")}</span></span><input autoComplete="current-password" className="input input-bordered w-full" onChange={(event) => setProfilePassword(event.target.value)} placeholder={t("account.confirmEmailChangePlaceholder")} required type="password" value={profilePassword} /></label> : null}
            <div className="roost-account-form-action"><CcButton disabled={profile.status !== "ready"} loading={saving} type="submit" variant="primary">{t("account.saveProfile")}</CcButton></div>
          </form>
        </section>
        <section className="roost-settings-panel" aria-labelledby="account-security-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-lock-key" aria-hidden="true"></i></span>
            <div><h2 id="account-security-heading">{t("account.security")}</h2><p>{t("account.securityDescription")}</p></div>
            <CcButton iconRight="ph-arrow-right" onClick={() => { setError(null); setPasswordEditorOpen(true); }} size="sm" variant="outline">{t("account.changePassword")}</CcButton>
          </header>
        </section>
        <section className="roost-settings-panel" aria-labelledby="account-access-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-identification-card" aria-hidden="true"></i></span>
            <div><h2 id="account-access-heading">{t("account.workspaceAccess")}</h2><p>{t("account.workspaceAccessDescription")}</p></div>
          </header>
          <div className="roost-settings-facts">
            <SettingRow icon="ph-buildings" label={t("workspace.label")} value={activeWorkspace?.name} />
            <SettingRow icon="ph-crown" label={t("account.role")} value={roleLabel(activeWorkspace?.role, t)} />
            <SettingRow icon="ph-fingerprint" label={t("account.authType")} value={authLabel(profile.data?.authType, t)} />
            <SettingRow icon="ph-shield-check" label={t("account.accessScope")} value={t("account.workspaceBound")} />
          </div>
          <details className="roost-settings-technical">
            <summary>{t("account.technicalDetails")}</summary>
            <p>{t("account.technicalDescription")}</p>
            <dl><div><dt>{t("account.userId")}</dt><dd>{profile.data?.userId || "—"}</dd></div><div><dt>{t("workspaceSettings.id")}</dt><dd>{activeWorkspace?.id || profile.data?.workspaceId || "—"}</dd></div></dl>
          </details>
        </section>
        {error ? <CcNotice detail={error} live title={t("account.saveError")} tone="error" /> : null}
      </div>
      {success ? <CcToast detail={success} dismissLabel={t("common.dismiss")} onDismiss={() => setSuccess(null)} title={t("account.saved")} tone="success" /> : null}
      {passwordEditorOpen ? (
        <CcRecordEditorModal
          actions={<><CcButton onClick={() => setPasswordEditorOpen(false)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton loading={saving} type="submit" variant="primary">{t("account.updatePassword")}</CcButton></>}
          description={t("account.passwordEditorDescription")}
          eyebrow={t("account.security")}
          maxWidthClassName="max-w-xl"
          onClose={() => setPasswordEditorOpen(false)}
          onSubmit={changePassword}
          title={t("account.changePassword")}
          titleId="change-password-title"
        >
          {error ? <CcNotice detail={error} live title={t("account.saveError")} tone="error" /> : null}
          <CcRecordEditorSection description={t("account.passwordRequirements")} title={t("account.passwordCredentials")}>
            <div className="grid gap-4">
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.currentPassword")}</span></span><input autoComplete="current-password" className="input input-bordered w-full" name="currentPassword" required type="password" /></label>
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.newPassword")}</span></span><input autoComplete="new-password" className="input input-bordered w-full" minLength={12} name="newPassword" required type="password" /></label>
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("account.confirmPassword")}</span></span><input autoComplete="new-password" className="input input-bordered w-full" minLength={12} name="confirmPassword" required type="password" /></label>
            </div>
          </CcRecordEditorSection>
        </CcRecordEditorModal>
      ) : null}
    </>
  );
}

export function WorkspaceSettingsRoute() {
  const { t } = useLanguage();
  const [editor, setEditor] = useState<IntegrationEditor>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const [workspaceAccent, setWorkspaceAccent] = useState("#6366F1");
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const connection = useOwnerPacket<ConnectionPacket>("/v1/connection", true, t);
  const clickUpConnectionStatus = connection.data?.integrations?.clickup;
  const googleDriveConnectionStatus = connection.data?.integrations?.googleDrive;
  const clickUpSetting = useIntegrationSetting("clickup", connection.status === "ready", refreshKey);
  const googleDriveSetting = useIntegrationSetting("google_drive", connection.status === "ready", refreshKey);
  const activeWorkspace = profile.data?.workspaces?.find((workspace) => workspace.active);
  const clickUpStatus = clickUpSetting.data ?? clickUpConnectionStatus;
  const googleDriveStatus = googleDriveSetting.data ?? googleDriveConnectionStatus;
  const configuredCount = [
    Boolean(clickUpStatus?.active && (clickUpStatus.secretConfigured ?? clickUpStatus.configured)),
    Boolean(googleDriveStatus?.active && (googleDriveStatus.secretConfigured ?? googleDriveStatus.configured) && googleDriveStatus.hasRefreshToken)
  ].filter(Boolean).length;

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaceName(activeWorkspace.name);
    setWorkspaceLogo(activeWorkspace.logo || "initials");
    setWorkspaceAccent(activeWorkspace.accentColor || "#6366F1");
  }, [activeWorkspace?.accentColor, activeWorkspace?.id, activeWorkspace?.logo, activeWorkspace?.name]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || params.get("provider") !== "google_drive") return;

    const expectedState = window.sessionStorage.getItem("roost.google-drive-oauth-state");
    if (!state || !expectedState || state !== expectedState) {
      setActionError(t("workspaceSettings.oauthStateError"));
      return;
    }

    setSaving(true);
    const redirectUri = `${window.location.origin}/workspace/settings?provider=google_drive`;
    api<{ data: IntegrationStatus }>("/v1/integration-settings/google_drive/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code, redirectUri, active: true })
    }).then(() => {
      window.sessionStorage.removeItem("roost.google-drive-oauth-state");
      window.history.replaceState({}, "", "/workspace/settings");
      setRefreshKey((value) => value + 1);
      setActionSuccess(t("workspaceSettings.googleConnected"));
    }).catch(() => {
      setActionError(t("workspaceSettings.saveErrorDetail"));
    }).finally(() => setSaving(false));
  }, [t]);

  async function saveClickUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const token = String(form.get("clickupApiToken") || "").trim();
    const teamId = String(form.get("clickupWorkspaceReference") || "").trim();
    const syncMode = String(form.get("syncMode") || "pull");
    const nextConfig = { ...(clickUpSetting.data?.config ?? {}), syncMode };
    if (teamId) {
      nextConfig.teamId = teamId;
    } else {
      delete nextConfig.teamId;
    }
    const payload: Record<string, unknown> = {
      active: form.get("active") === "on",
      config: nextConfig
    };
    if (token) payload.token = token;

    try {
      await api("/v1/integration-settings/clickup", { method: "PUT", body: JSON.stringify(payload) });
      setEditor(null);
      setRefreshKey((value) => value + 1);
      setActionSuccess(t("workspaceSettings.clickupSaved"));
    } catch (error) {
      setActionError(t("workspaceSettings.saveErrorDetail"));
    } finally {
      setSaving(false);
    }
  }

  async function connectGoogleDrive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const clientId = String(form.get("clientId") || "").trim();
    const clientSecret = String(form.get("clientSecret") || "").trim();

    try {
      if (clientId) {
        await api("/v1/integration-settings/google_drive", {
          method: "PUT",
          body: JSON.stringify({ oauthClient: { clientId, ...(clientSecret ? { clientSecret } : {}) }, active: true })
        });
      }
      const state = crypto.randomUUID();
      const redirectUri = `${window.location.origin}/workspace/settings?provider=google_drive`;
      const response = await api<{ data: { authorizationUrl: string } }>("/v1/integration-settings/google_drive/oauth/authorize-url", {
        method: "POST",
        body: JSON.stringify({ redirectUri, state })
      });
      window.sessionStorage.setItem("roost.google-drive-oauth-state", state);
      window.location.assign(response.data.authorizationUrl);
    } catch (error) {
      setActionError(t("workspaceSettings.saveErrorDetail"));
      setSaving(false);
    }
  }

  async function toggleIntegration(provider: "clickup" | "google_drive", active: boolean) {
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api(`/v1/integration-settings/${provider}`, { method: "PUT", body: JSON.stringify({ active }) });
      setRefreshKey((value) => value + 1);
      setActionSuccess(t(active ? "workspaceSettings.connectionEnabledSuccess" : "workspaceSettings.connectionDisabledSuccess"));
    } catch (error) {
      setActionError(t("workspaceSettings.saveErrorDetail"));
    } finally {
      setSaving(false);
    }
  }

  async function saveWorkspaceIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await api<{ data: { id: string; name: string; logo?: string | null; accentColor?: string | null } }>(`/v1/workspaces/${activeWorkspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: workspaceName.trim(), logo: workspaceLogo, accentColor: workspaceAccent })
      });
      setWorkspaceName(response.data.name);
      setWorkspaceLogo(response.data.logo || "initials");
      setWorkspaceAccent(response.data.accentColor || "#6366F1");
      window.dispatchEvent(new CustomEvent("roost:workspace-updated", { detail: response.data }));
      setActionSuccess(t("workspaceSettings.identitySaved"));
    } catch {
      setActionError(t("workspaceSettings.saveErrorDetail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="roost-settings-page">
        <header className="roost-settings-header">
          <span>{t("workspace.settings")}</span>
          <h1>{t("workspaceSettings.title")}</h1>
          <p>{t("workspaceSettings.description")}</p>
        </header>
        {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
        {connection.status === "loading" ? <CcNotice tone="loading" title={t("workspaceSettings.connectionLoading")} detail={t("workspaceSettings.connectionLoadingDetail")} /> : null}
        {connection.status === "error" ? <CcNotice tone="error" title={t("workspaceSettings.connectionError")} detail={connection.error || t("errors.request_failed")} live /> : null}
        <section className="roost-settings-panel roost-workspace-summary" aria-labelledby="workspace-summary-heading">
          <header>
            <CcIdentityMark className="roost-settings-panel-identity" name={workspaceName || activeWorkspace?.name} value={workspaceLogo} />
            <div><h2 id="workspace-summary-heading">{t("workspaceSettings.identityTitle")}</h2><p>{t("workspaceSettings.identityDescription")}</p></div>
          </header>
          <form className="roost-workspace-profile-form" onSubmit={saveWorkspaceIdentity}>
            <div className="roost-workspace-profile-logo">
              <CcField label={t("workspaceSettings.logo")} hint={t("workspaceSettings.logoHint")}>
                {() => <CcIdentityPicker labels={identityLabels(t)} onChange={setWorkspaceLogo} previewName={workspaceName} value={workspaceLogo} />}
              </CcField>
            </div>
            <CcField label={t("workspaceSettings.name")} required>
              {({ id }) => <input className="input input-bordered w-full" disabled={profile.status !== "ready"} id={id} maxLength={120} onChange={(event) => setWorkspaceName(event.target.value)} required value={workspaceName} />}
            </CcField>
            <CcField label={t("workspaceSettings.accentColor")} hint={t("workspaceSettings.accentColorHint")}>
              {({ id }) => (
                <div className="roost-accent-picker">
                  <input aria-label={t("workspaceSettings.customAccentColor")} id={id} onChange={(event) => setWorkspaceAccent(event.target.value.toUpperCase())} type="color" value={workspaceAccent} />
                  <span className="roost-accent-value">{workspaceAccent}</span>
                  <div className="roost-accent-presets" aria-label={t("workspaceSettings.accentPresets")}>
                    {workspaceAccentPresets.map((color) => <button aria-label={color} aria-pressed={workspaceAccent === color} key={color} onClick={() => setWorkspaceAccent(color)} style={{ backgroundColor: color }} type="button"></button>)}
                  </div>
                </div>
              )}
            </CcField>
            <div className="roost-workspace-profile-action"><CcButton disabled={profile.status !== "ready"} loading={saving} type="submit" variant="primary">{t("workspaceSettings.saveIdentity")}</CcButton></div>
          </form>
          <div className="roost-settings-facts">
            <SettingRow icon="ph-crown" label={t("account.role")} value={roleLabel(activeWorkspace?.role, t)} />
            <SettingRow icon="ph-shield-check" label={t("workspaceSettings.scopeMode")} value={connection.data?.scopeMode === "scoped" ? t("workspaceSettings.scope.scoped") : t("workspaceSettings.scope.broad")} />
          </div>
          <details className="roost-settings-technical">
            <summary>{t("account.technicalDetails")}</summary>
            <p>{t("account.technicalDescription")}</p>
            <dl><div><dt>{t("workspaceSettings.id")}</dt><dd>{activeWorkspace?.id || profile.data?.workspaceId || "—"}</dd></div><div><dt>{t("workspaceSettings.service")}</dt><dd>{connection.data?.service ? t("workspaceSettings.service.roost") : "—"}</dd></div></dl>
          </details>
        </section>
        <section className="roost-settings-panel" aria-labelledby="workspace-integrations-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-plugs-connected" aria-hidden="true"></i></span>
            <div><h2 id="workspace-integrations-heading">{t("workspaceSettings.integrations")}</h2><p>{t("workspaceSettings.integrationsDescription")}</p></div>
          </header>
          {configuredCount < 2 ? <div className="roost-settings-next-step"><i className="ph-bold ph-warning-circle" aria-hidden="true"></i><div><strong>{t("workspaceSettings.setupRequired")}</strong><span>{t("workspaceSettings.setupRequiredDetail", { count: 2 - configuredCount })}</span></div></div> : null}
          <div className="roost-integration-list">
          <IntegrationRow
            busy={saving}
            connectionStatus={clickUpConnectionStatus}
            icon="ph-kanban"
            onConfigure={() => { setActionError(null); setEditor("clickup"); }}
            onToggle={(active) => void toggleIntegration("clickup", active)}
            settingStatus={clickUpSetting}
            title={t("workspaceSettings.clickup")}
          />
          <IntegrationRow
            busy={saving}
            connectionStatus={googleDriveConnectionStatus}
            icon="ph-folder-open"
            onConfigure={() => { setActionError(null); setEditor("google_drive"); }}
            onToggle={(active) => void toggleIntegration("google_drive", active)}
            requiresRefreshToken
            settingStatus={googleDriveSetting}
            title={t("workspaceSettings.googleDrive")}
          />
          </div>
          <div className="roost-settings-actions">
          <CcButton href="/areas?area=09-technologia&view=integrations" iconLeft="ph-chart-line-up" variant="ghost">{t("workspaceSettings.integrationHealth")}</CcButton>
          </div>
        </section>
        {actionError ? <CcNotice detail={actionError} live title={t("workspaceSettings.saveError")} tone="error" /> : null}
      </div>
      {actionSuccess ? <CcToast detail={actionSuccess} dismissLabel={t("common.dismiss")} onDismiss={() => setActionSuccess(null)} title={t("workspaceSettings.saved")} tone="success" /> : null}
      {editor === "clickup" ? (
        <CcRecordEditorModal
          actions={<><CcButton onClick={() => setEditor(null)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton loading={saving} type="submit" variant="primary">{t("workspaceSettings.saveConnection")}</CcButton></>}
          description={t("workspaceSettings.clickupEditorDescription")}
          eyebrow={t("workspaceSettings.connectionSetup")}
          onClose={() => setEditor(null)}
          onSubmit={saveClickUp}
          title={t("workspaceSettings.clickupEditorTitle")}
          titleId="clickup-settings-title"
          maxWidthClassName="max-w-2xl"
        >
          {actionError ? <CcNotice detail={actionError} live title={t("workspaceSettings.saveError")} tone="error" /> : null}
          <CcRecordEditorSection description={t("workspaceSettings.secretHelp")} title={t("workspaceSettings.credentials")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control sm:col-span-2"><span className="label py-1"><span className="label-text font-bold">{t("workspaceSettings.clickupToken")}{clickUpSetting.data?.secretConfigured ? "" : " *"}</span></span><input autoComplete="new-password" className="input input-bordered w-full" data-1p-ignore="true" data-lpignore="true" name="clickupApiToken" placeholder={clickUpSetting.data?.secretConfigured ? t("workspaceSettings.secretKeepPlaceholder") : t("workspaceSettings.secretEnterPlaceholder")} required={!clickUpSetting.data?.secretConfigured} type="password" /></label>
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("workspaceSettings.clickupTeamId")}</span></span><input autoComplete="one-time-code" className="input input-bordered w-full" data-1p-ignore="true" data-lpignore="true" defaultValue={String(clickUpSetting.data?.config?.teamId || "")} name="clickupWorkspaceReference" /></label>
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("workspaceSettings.syncMode")}</span></span><select className="select select-bordered w-full" defaultValue={String(clickUpSetting.data?.config?.syncMode || "pull")} name="syncMode"><option value="pull">{t("workspaceSettings.syncPull")}</option><option value="two_way">{t("workspaceSettings.syncTwoWay")}</option></select></label>
              <label className="label cursor-pointer justify-start gap-3 sm:col-span-2"><input className="toggle toggle-primary" defaultChecked={clickUpSetting.data?.active ?? true} name="active" type="checkbox" /><span className="label-text font-bold">{t("workspaceSettings.connectionEnabled")}</span></label>
            </div>
          </CcRecordEditorSection>
        </CcRecordEditorModal>
      ) : null}
      {editor === "google_drive" ? (
        <CcRecordEditorModal
          actions={<><CcButton onClick={() => setEditor(null)} variant="ghost">{t("operations.cancel")}</CcButton><CcButton iconRight="ph-arrow-square-out" loading={saving} type="submit" variant="primary">{t("workspaceSettings.connectGoogle")}</CcButton></>}
          description={t("workspaceSettings.googleEditorDescription")}
          eyebrow={t("workspaceSettings.connectionSetup")}
          onClose={() => setEditor(null)}
          onSubmit={connectGoogleDrive}
          title={t("workspaceSettings.googleEditorTitle")}
          titleId="google-drive-settings-title"
          maxWidthClassName="max-w-2xl"
        >
          {actionError ? <CcNotice detail={actionError} live title={t("workspaceSettings.saveError")} tone="error" /> : null}
          <CcRecordEditorSection description={googleDriveSetting.data?.hasClientId && googleDriveSetting.data?.hasClientSecret ? t("workspaceSettings.googleStoredClient") : t("workspaceSettings.googleClientHelp")} title={t("workspaceSettings.googleOAuthClient")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("workspaceSettings.googleClientId")}{googleDriveSetting.data?.hasClientId && googleDriveSetting.data?.hasClientSecret ? "" : " *"}</span></span><input autoComplete="one-time-code" className="input input-bordered w-full" data-1p-ignore="true" data-lpignore="true" name="clientId" placeholder={googleDriveSetting.data?.hasClientId ? t("workspaceSettings.storedCredentialPlaceholder") : ""} required={!(googleDriveSetting.data?.hasClientId && googleDriveSetting.data?.hasClientSecret)} /></label>
              <label className="form-control"><span className="label py-1"><span className="label-text font-bold">{t("workspaceSettings.googleClientSecret")}{googleDriveSetting.data?.hasClientId && googleDriveSetting.data?.hasClientSecret ? "" : " *"}</span></span><input autoComplete="new-password" className="input input-bordered w-full" data-1p-ignore="true" data-lpignore="true" name="clientSecret" placeholder={googleDriveSetting.data?.hasClientSecret ? t("workspaceSettings.secretKeepPlaceholder") : ""} required={!(googleDriveSetting.data?.hasClientId && googleDriveSetting.data?.hasClientSecret)} type="password" /></label>
            </div>
          </CcRecordEditorSection>
          <CcNotice detail={t("workspaceSettings.googleRedirectDetail", { url: `${window.location.origin}/workspace/settings?provider=google_drive` })} title={t("workspaceSettings.googleRedirectTitle")} tone="info" />
        </CcRecordEditorModal>
      ) : null}
    </>
  );
}
