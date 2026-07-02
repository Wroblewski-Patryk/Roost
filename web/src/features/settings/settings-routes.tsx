import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { AuthMe, ConnectionPacket, IntegrationStatus, LoadState } from "../../types";

function SettingRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-company border border-base-300 bg-base-100 p-4">
      <p className="text-xs font-black uppercase text-company-muted">{label}</p>
      <strong className="mt-1 block break-words text-company-ink">{value || "—"}</strong>
    </div>
  );
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
  const updatedAt = status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : null;

  return (
    <article className="rounded-company border border-base-300 bg-base-100 p-4">
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
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("user.myAccount")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("account.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("account.description")}</p>
      </section>
      {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
      <section className="grid gap-3 md:grid-cols-2">
        <SettingRow label={t("account.userId")} value={profile.data?.userId} />
        <SettingRow label={t("account.authType")} value={profile.data?.authType} />
        <SettingRow label={t("workspace.label")} value={activeWorkspace?.name} />
        <SettingRow label={t("account.role")} value={activeWorkspace?.role} />
      </section>
    </Shell>
  );
}

export function WorkspaceSettingsRoute() {
  const { t } = useLanguage();
  const profile = useOwnerPacket<AuthMe>("/v1/auth/me", true, t);
  const connection = useOwnerPacket<ConnectionPacket>("/v1/connection", true, t);
  const clickUpSetting = useIntegrationSetting("clickup", true);
  const googleDriveSetting = useIntegrationSetting("google_drive", true);
  const activeWorkspace = profile.data?.workspaces?.find((workspace) => workspace.active);
  const connectionReady = connection.status === "ready" && connection.data?.status === "ok";
  const configuredCount = [
    clickUpSetting.data ?? connection.data?.integrations?.clickup,
    googleDriveSetting.data ?? connection.data?.integrations?.googleDrive
  ].filter((integration) => Boolean(integration?.active && (integration.secretConfigured ?? integration.configured))).length;

  return (
    <Shell>
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("workspace.settings")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("workspaceSettings.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("workspaceSettings.description")}</p>
      </section>
      {profile.status === "error" ? <CcNotice tone="error" title={profile.error || t("errors.request_failed")} live /> : null}
      {connection.status === "loading" ? <CcNotice tone="loading" title={t("workspaceSettings.connectionLoading")} detail={t("workspaceSettings.connectionLoadingDetail")} /> : null}
      {connection.status === "error" ? <CcNotice tone="error" title={t("workspaceSettings.connectionError")} detail={connection.error || t("errors.request_failed")} live /> : null}
      <section className="grid gap-3 md:grid-cols-2">
        <SettingRow label={t("workspaceSettings.name")} value={activeWorkspace?.name} />
        <SettingRow label={t("workspaceSettings.id")} value={activeWorkspace?.id || profile.data?.workspaceId} />
        <SettingRow label={t("account.role")} value={activeWorkspace?.role} />
        <SettingRow label={t("workspaceSettings.availableWorkspaces")} value={String(profile.data?.workspaces?.length || 0)} />
      </section>
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-company-ink">{t("workspaceSettings.integrations")}</h2>
            <p className="mt-2 max-w-3xl text-company-muted">{t("workspaceSettings.integrationsDescription")}</p>
          </div>
          <span className={`badge ${connectionReady ? "badge-success" : "badge-warning"} badge-outline font-black`}>
            {connectionReady ? t("workspaceSettings.connectionReady") : t("workspaceSettings.connectionNeedsAttention")}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SettingRow label={t("workspaceSettings.service")} value={connection.data?.service} />
          <SettingRow label={t("workspaceSettings.scopeMode")} value={connection.data?.scopeMode} />
          <SettingRow label={t("workspaceSettings.configuredProviders")} value={`${configuredCount}/2`} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <IntegrationCard
            connectionStatus={connection.data?.integrations?.clickup}
            icon="ph-kanban"
            settingStatus={clickUpSetting}
            title={t("workspaceSettings.clickup")}
          />
          <IntegrationCard
            connectionStatus={connection.data?.integrations?.googleDrive}
            icon="ph-folder-open"
            settingStatus={googleDriveSetting}
            title={t("workspaceSettings.googleDrive")}
          />
        </div>
        <div className="mt-4">
          <CcNotice
            detail={t("workspaceSettings.noSecretsDetail")}
            title={t("workspaceSettings.noSecretsTitle")}
            tone="info"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CcButton href="/areas?area=09-technologia&view=overview" iconLeft="ph-plugs-connected" variant="outline">{t("workspaceSettings.technologyBoard")}</CcButton>
          <CcButton href="/areas?area=08-zasoby&view=files" iconLeft="ph-folder-open" variant="outline">{t("workspaceSettings.assetFiles")}</CcButton>
        </div>
      </section>
    </Shell>
  );
}
