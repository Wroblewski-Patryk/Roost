import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { formatAppDate } from "../../i18n/date-format";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { AuthMe, ConnectionPacket, IntegrationStatus, LoadState } from "../../types";

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

function safeConfigKeys(config?: Record<string, unknown>) {
  return Object.entries(config ?? {})
    .filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== "";
    })
    .map(([key]) => key);
}

function useIntegrationSetting(provider: "clickup" | "google_drive", enabled: boolean): LoadState<IntegrationStatus | null> {
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
  }, [enabled, provider]);

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

function IntegrationCard({
  title,
  icon,
  connectionStatus,
  settingStatus
}: {
  title: string;
  icon: string;
  connectionStatus?: IntegrationStatus;
  settingStatus: LoadState<IntegrationStatus | null>;
}) {
  const { t } = useLanguage();
  const setting = settingStatus.data ?? undefined;
  const status = setting ?? connectionStatus;
  const configured = Boolean(status?.secretConfigured ?? status?.configured);
  const active = Boolean(status?.active);
  const configKeys = safeConfigKeys(status?.config);
  const updatedAt = status?.updatedAt ? formatAppDate(status.updatedAt, { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <article className="roost-integration-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-company bg-primary/10 text-primary">
            <i className={`ph-bold ${icon} text-xl`} aria-hidden="true"></i>
          </span>
          <div className="min-w-0">
            <h3 className="font-black text-company-ink">{title}</h3>
            <p className="text-sm text-company-muted">{t("workspaceSettings.redactedStatus")}</p>
          </div>
        </div>
        <StatusBadge ready={configured && active} />
      </div>

      {settingStatus.status === "loading" ? (
        <p className="mt-4 text-sm text-company-muted">{t("workspaceSettings.loadingProvider")}</p>
      ) : null}
      {settingStatus.status === "error" ? (
        <CcNotice tone="warning" title={t("workspaceSettings.providerError")} detail={t("workspaceSettings.providerErrorDetail")} live />
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-black uppercase text-company-muted">{t("workspaceSettings.secretStatus")}</dt>
          <dd className="mt-1 text-company-ink">{configured ? t("workspaceSettings.secretConfigured") : t("workspaceSettings.secretMissing")}</dd>
        </div>
        <div>
          <dt className="font-black uppercase text-company-muted">{t("workspaceSettings.providerActive")}</dt>
          <dd className="mt-1 text-company-ink">{active ? t("state.ready") : t("state.blocked")}</dd>
        </div>
        <div>
          <dt className="font-black uppercase text-company-muted">{t("workspaceSettings.configFields")}</dt>
          <dd className="mt-1 break-words text-company-ink">{configKeys.length ? configKeys.join(", ") : t("workspaceSettings.noConfigFields")}</dd>
        </div>
        <div>
          <dt className="font-black uppercase text-company-muted">{t("workspaceSettings.lastUpdated")}</dt>
          <dd className="mt-1 text-company-ink">{updatedAt || t("workspaceSettings.neverUpdated")}</dd>
        </div>
      </dl>
    </article>
  );
}

export function AccountSettingsRoute() {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const activeWorkspace = profile.data?.workspaces?.find((workspace) => workspace.active);

  return (
    <Shell>
      <div className="roost-settings-page">
        <header className="roost-settings-header">
          <span>{t("user.myAccount")}</span>
          <h1>{t("account.title")}</h1>
          <p>{t("account.description")}</p>
        </header>
        {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
        <section className="roost-settings-panel" aria-labelledby="account-session-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-user-circle" aria-hidden="true"></i></span>
            <div><h2 id="account-session-heading">{t("account.session")}</h2><p>{t("account.sessionDescription")}</p></div>
            <span className="roost-settings-status is-ready"><i aria-hidden="true"></i>{t("state.ready")}</span>
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
      </div>
    </Shell>
  );
}

export function WorkspaceSettingsRoute() {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const connection = useOwnerPacket<ConnectionPacket>("/v1/connection", true, t);
  const clickUpConnectionStatus = connection.data?.integrations?.clickup;
  const googleDriveConnectionStatus = connection.data?.integrations?.googleDrive;
  const clickUpSetting = useIntegrationSetting("clickup", connection.status === "ready" && Boolean(clickUpConnectionStatus?.configured || clickUpConnectionStatus?.secretConfigured));
  const googleDriveSetting = useIntegrationSetting("google_drive", connection.status === "ready" && Boolean(googleDriveConnectionStatus?.configured || googleDriveConnectionStatus?.secretConfigured));
  const activeWorkspace = profile.data?.workspaces?.find((workspace) => workspace.active);
  const configuredCount = [
    clickUpSetting.data ?? clickUpConnectionStatus,
    googleDriveSetting.data ?? googleDriveConnectionStatus
  ].filter((integration) => Boolean(integration?.active && (integration.secretConfigured ?? integration.configured))).length;

  return (
    <Shell>
      <div className="roost-settings-page">
        <header className="roost-settings-header">
          <span>{t("workspace.settings")}</span>
          <h1>{t("workspaceSettings.title")}</h1>
          <p>{t("workspaceSettings.description")}</p>
        </header>
        {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
        {connection.status === "loading" ? <CcNotice tone="loading" title={t("workspaceSettings.connectionLoading")} detail={t("workspaceSettings.connectionLoadingDetail")} /> : null}
        {connection.status === "error" ? <CcNotice tone="error" title={t("workspaceSettings.connectionError")} detail={connection.error || t("errors.request_failed")} live /> : null}
        <section className="roost-settings-panel" aria-labelledby="workspace-summary-heading">
          <header>
            <span className="roost-settings-panel-icon"><i className="ph-bold ph-buildings" aria-hidden="true"></i></span>
            <div><h2 id="workspace-summary-heading">{activeWorkspace?.name || t("workspace.current")}</h2><p>{t("shell.workspaceSafe")}</p></div>
            <span className="roost-settings-status is-ready"><i aria-hidden="true"></i>{t("state.ready")}</span>
          </header>
          <div className="roost-settings-facts">
            <SettingRow icon="ph-buildings" label={t("workspaceSettings.name")} value={activeWorkspace?.name} />
            <SettingRow icon="ph-crown" label={t("account.role")} value={roleLabel(activeWorkspace?.role, t)} />
            <SettingRow icon="ph-stack" label={t("workspaceSettings.availableWorkspaces")} value={String(profile.data?.workspaces?.length || 0)} />
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
            <span className={`roost-settings-status${configuredCount === 2 ? " is-ready" : " is-warning"}`}><i aria-hidden="true"></i>{t("workspaceSettings.integrationsStatus", { count: configuredCount, total: 2 })}</span>
          </header>
          <div className="roost-integration-grid">
          <IntegrationCard
            connectionStatus={clickUpConnectionStatus}
            icon="ph-kanban"
            settingStatus={clickUpSetting}
            title={t("workspaceSettings.clickup")}
          />
          <IntegrationCard
            connectionStatus={googleDriveConnectionStatus}
            icon="ph-folder-open"
            settingStatus={googleDriveSetting}
            title={t("workspaceSettings.googleDrive")}
          />
          </div>
          <div className="roost-settings-notice">
          <CcNotice
            detail={t("workspaceSettings.noSecretsDetail")}
            title={t("workspaceSettings.noSecretsTitle")}
            tone="info"
          />
          </div>
          <div className="roost-settings-actions">
          <CcButton href="/areas?area=09-technologia&view=overview" iconLeft="ph-plugs-connected" variant="outline">{t("workspaceSettings.technologyBoard")}</CcButton>
          <CcButton href="/areas?area=08-zasoby&view=files" iconLeft="ph-folder-open" variant="outline">{t("workspaceSettings.assetFiles")}</CcButton>
          </div>
        </section>
      </div>
    </Shell>
  );
}
