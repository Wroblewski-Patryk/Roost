import { useState } from "react";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { formatAppDate } from "../../i18n/date-format";
import { type Translate, useLanguage } from "../../i18n/i18n";
import type { Locale } from "../../i18n/locales";
import { OperatingGraphPacket } from "../../types";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";
import { GoalsWorkbench } from "./goals-workbench";

type TechnologyView = "overview" | "goals" | "integrations" | "automations";

type ProviderStatus = {
  provider: "clickup" | "google_drive";
  configuration: {
    state: "not_configured" | "disabled" | "configured";
    credentialState: "none" | "stored_unverified" | "refresh_token_unverified" | "incomplete";
    active: boolean;
    updatedAt: string | null;
    lastValidatedAt: string | null;
    reason: "no_setting" | "no_credential" | "incomplete_credential" | "inactive" | "stored_active";
  };
  synchronization: {
    state: "unknown" | "recent" | "stale" | "failed";
    latestEventType: string | null;
    latestEventAt: string | null;
    lastSuccessAt: string | null;
    reason: "no_observation" | "latest_success_recent" | "latest_success_stale" | "latest_success_before_configuration" | "latest_failed";
  };
  adapter: {
    present: boolean;
    connectionStatus: string | null;
    healthStatus: string | null;
    lastSyncAt: string | null;
    updatedAt: string | null;
    capabilitiesCount: number;
  };
  settingsHref: string;
};

type IntegrationStatusPacket = {
  observedAt: string;
  providers: ProviderStatus[];
};

type AutomationDefinition = {
  id: string;
  name: string;
  provider?: string | null;
  triggerType: string;
  enabled: boolean;
  lastRunAt?: string | null;
  lastError?: string | null;
  updatedAt: string;
};

function currentView(): TechnologyView {
  if (typeof window === "undefined") return "overview";
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "goals" || view === "integrations" || view === "automations" ? view : "overview";
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string | null | undefined, t: Translate) {
  return value ? formatAppDate(value, { dateStyle: "medium", timeStyle: "short" }) : t("workbench.never");
}

function stateTone(value: string) {
  if (["connected", "configured", "healthy", "active"].includes(value)) return "badge-success";
  if (["degraded", "unknown", "disabled"].includes(value)) return "badge-warning";
  return "badge-error";
}

function Status({ value, locale }: { value: string; locale: Locale }) {
  return <span className={`badge badge-sm ${stateTone(value)}`}>{humanizeBusinessValue(value, "Unknown", locale)}</span>;
}

function TechnologyHeader({ view, areaName }: { view: TechnologyView; areaName?: string }) {
  const { t } = useLanguage();
  const content = view === "integrations"
    ? { title: t("views.09.integrations"), detail: t("technology.integrationsDescription") }
    : view === "automations"
      ? { title: t("views.09.automations"), detail: t("technology.automationsDescription") }
      : { title: t("views.09.overview"), detail: areaName ? `${areaName}. ${t("technology.overviewDescription")}` : t("technology.overviewDescription") };
  const actions = view === "overview" ? <>
    <CcButton href="/areas?area=09-technologia&view=integrations" iconLeft="ph-plugs-connected" size="sm" variant="outline">{t("views.09.integrations")}</CcButton>
    <CcButton href="/areas?area=09-technologia&view=automations" iconLeft="ph-lightning" size="sm" variant="outline">{t("views.09.automations")}</CcButton>
  </> : <CcButton href="/areas?area=09-technologia&view=overview" iconLeft="ph-arrow-left" size="sm" variant="ghost">{t("workbench.overview")}</CcButton>;
  return <CcPageHeader actions={actions} description={content.detail} eyebrow={t("technology.eyebrow")} title={content.title} />;
}

function OverviewView() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<OperatingGraphPacket>("/v1/operating-graph/areas/09-technologia?limit=80", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data?.nodes || [];
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "node",
      header: t("workbench.node"),
      sortable: true,
      searchValue: (row) => `${row.label} ${row.summary || ""} ${row.type}`,
      cell: (row) => <div className="grid"><strong>{row.label}</strong><span className="text-xs text-company-muted">{humanize(row.type)}</span></div>
    },
    { key: "summary", header: t("workbench.summary"), cell: (row) => <span className="text-sm text-company-muted">{row.summary || t("workbench.noSummary")}</span> }
  ];
  return <>
    <TechnologyHeader areaName={packet.data?.area?.name} view="overview" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("technology.loadError")} live /> : null}
    <CcDataTable columns={columns} rows={rows} emptyTitle={t("technology.emptyOverview")} emptyDetail={t("technology.emptyOverviewDetail")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || t("technology.loadError") : null} getRowLabel={(row) => row.label} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" />
  </>;
}

function IntegrationProviderCard({ row, locale }: { row: ProviderStatus; locale: Locale }) {
  const copy = (pl: string, en: string) => locale === "pl" ? pl : en;
  const name = row.provider === "clickup" ? "ClickUp" : "Google Drive";
  const configuration = row.configuration;
  const synchronization = row.synchronization;
  const adapter = row.adapter;
  const expectedHref = row.provider === "clickup"
    ? "/workspace/settings#workspace-integrations-clickup"
    : "/workspace/settings#workspace-integrations-google-drive";
  const settingsHref = row.settingsHref === expectedHref ? row.settingsHref : expectedHref;
  const configurationLabel = configuration.state === "configured"
    ? copy("Skonfigurowano i włączono w Roost", "Configured and enabled in Roost")
    : configuration.state === "disabled"
      ? copy("Wyłączono w Roost", "Disabled in Roost")
      : copy("Nie skonfigurowano w Roost", "Not configured in Roost");
  const credentialLabel = configuration.credentialState === "stored_unverified"
    ? copy("Dane dostępowe zapisane; autoryzacja niepotwierdzona", "Credentials stored; authorization unverified")
    : configuration.credentialState === "refresh_token_unverified"
      ? copy("Token odświeżania zapisany; autoryzacja niepotwierdzona", "Refresh token stored; authorization unverified")
      : configuration.credentialState === "incomplete"
        ? copy("Dane dostępowe niekompletne", "Credentials incomplete")
        : copy("Brak zapisanych danych dostępowych", "No credentials stored");
  const configurationReason = {
    no_setting: copy("Brak ustawienia dostawcy.", "No provider setting."),
    no_credential: copy("Brak wymaganych danych dostępowych.", "Required credentials are missing."),
    incomplete_credential: copy("Zapisane dane dostępowe są niekompletne. Sprawdź konfigurację dostawcy.", "Stored credentials are incomplete. Review provider settings."),
    inactive: copy("Połączenie wyłączono w ustawieniach.", "Connection is disabled in settings."),
    stored_active: copy("Ustawienie jest aktywne i ma zapisane dane dostępowe; bieżąca autoryzacja nie została sprawdzona.", "The setting is active and credentials are stored; current authorization has not been checked.")
  }[configuration.reason];
  const syncLabel = {
    unknown: copy("Brak obserwacji synchronizacji", "No synchronization observation"),
    recent: copy("Zapisany niedawny sukces", "Recent recorded success"),
    stale: copy("Dowód synchronizacji jest nieaktualny", "Synchronization evidence is stale"),
    failed: copy("Ostatnia próba nie powiodła się", "Latest attempt failed")
  }[synchronization.state];
  const syncReason = {
    no_observation: copy("Brak zapisanego zdarzenia; stan dostawcy jest nieznany.", "No recorded event; provider state is unknown."),
    latest_success_recent: copy("Ostatnie zapisane zdarzenie zakończyło się sukcesem. To nie jest bieżący test dostawcy.", "The latest recorded event succeeded. This is not a live provider check."),
    latest_success_stale: copy("Ostatni zapisany sukces jest stary. Sprawdź ustawienia dostawcy przed użyciem.", "The last recorded success is old. Check provider settings before use."),
    latest_success_before_configuration: copy("Ostatni zapisany sukces poprzedza zmianę konfiguracji. Nie potwierdza synchronizacji obecnych ustawień.", "The last recorded success predates the configuration change. It does not confirm synchronization with the current settings."),
    latest_failed: copy("Ostatnie zapisane zdarzenie zakończyło się błędem. Sprawdź ustawienia dostawcy.", "The latest recorded event failed. Check provider settings.")
  }[synchronization.reason];
  const adapterDetail = adapter.present
    ? copy(
      `W katalogu: połączenie ${humanize(adapter.connectionStatus)?.toLowerCase() || "nieznane"}, zdrowie ${humanize(adapter.healthStatus)?.toLowerCase() || "nieznane"}, możliwości ${adapter.capabilitiesCount}.`,
      `Catalog: connection ${humanize(adapter.connectionStatus)?.toLowerCase() || "unknown"}, health ${humanize(adapter.healthStatus)?.toLowerCase() || "unknown"}, capabilities ${adapter.capabilitiesCount}.`
    )
    : copy("Brak wpisu w katalogu adapterów. Nie oznacza to rozłączenia dostawcy.", "No adapter catalog entry. This does not mean the provider is disconnected.");
  const tone = synchronization.state === "failed" || synchronization.state === "stale"
    ? "badge-warning"
    : synchronization.state === "unknown" ? "badge-ghost" : "badge-info";
  return (
    <section aria-labelledby={`integration-${row.provider}-heading`} className="roost-work-panel min-w-0 rounded-company border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-black" id={`integration-${row.provider}-heading`}>{name}</h2>
        <CcButton href={settingsHref} iconRight="ph-arrow-up-right" size="sm" variant="outline">
          {copy(`Ustawienia ${name}`, `${name} settings`)}
        </CcButton>
      </div>
      <dl className="mt-4 grid min-w-0 gap-4 text-sm">
        <div>
          <dt className="font-bold">{copy("Konfiguracja w Roost", "Roost configuration")}</dt>
          <dd className="mt-1"><span className={`badge badge-sm ${configuration.state === "configured" ? "badge-success" : "badge-warning"}`}>{configurationLabel}</span></dd>
          <dd className="mt-1 text-company-muted">{credentialLabel}</dd>
          <dd className="mt-1 text-company-muted">{configurationReason}</dd>
          <dd className="mt-1 text-xs text-company-muted">{copy("Zmieniono", "Updated")}: {configuration.updatedAt ? formatAppDate(configuration.updatedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
          <dd className="mt-1 text-xs text-company-muted">{copy("Ostatnia zapisana walidacja", "Last recorded validation")}: {configuration.lastValidatedAt ? formatAppDate(configuration.lastValidatedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
        </div>
        <div className="border-t border-base-300 pt-3">
          <dt className="font-bold">{copy("Synchronizacja: zapisane zdarzenia", "Synchronization: recorded events")}</dt>
          <dd className="mt-1"><span className={`badge badge-sm ${tone}`}>{syncLabel}</span></dd>
          <dd className="mt-1 text-company-muted">{syncReason}</dd>
          <dd className="mt-1 text-xs text-company-muted">{copy("Typ ostatniego zdarzenia", "Latest event type")}: {synchronization.latestEventType ? <code>{synchronization.latestEventType}</code> : "—"} · {synchronization.latestEventAt ? formatAppDate(synchronization.latestEventAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
          <dd className="mt-1 text-xs text-company-muted">{copy("Ostatni sukces", "Last success")}: {synchronization.lastSuccessAt ? formatAppDate(synchronization.lastSuccessAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
        </div>
        <div className="border-t border-base-300 pt-3">
          <dt className="font-bold">{copy("Katalog adapterów", "Adapter catalog")}</dt>
          <dd className="mt-1 text-company-muted">{adapterDetail}</dd>
          {adapter.present ? <dd className="mt-1 text-xs text-company-muted">{copy("Wpis zaktualizowano", "Entry updated")}: {adapter.updatedAt ? formatAppDate(adapter.updatedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"} · {copy("Ostatnia synchronizacja adaptera", "Adapter last sync")}: {adapter.lastSyncAt ? formatAppDate(adapter.lastSyncAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd> : null}
          <dd className="mt-1 text-xs text-company-muted">{copy("Stan katalogu nie potwierdza autoryzacji dostawcy.", "Catalog state does not confirm provider authorization.")}</dd>
        </div>
      </dl>
    </section>
  );
}

function IntegrationsView() {
  const { locale, t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const packet = useOwnerPacket<IntegrationStatusPacket>("/v1/connection/integration-status", true, t, refreshKey);
  const copy = (pl: string, en: string) => locale === "pl" ? pl : en;
  return <>
    <TechnologyHeader view="integrations" />
    {packet.status === "loading" ? <CcNotice live tone="loading" title={copy("Wczytywanie stanu integracji", "Loading integration status")} /> : null}
    {packet.status === "error" ? <CcNotice action={<CcButton onClick={() => setRefreshKey((value) => value + 1)} size="sm" variant="outline">{copy("Ponów", "Retry")}</CcButton>} detail={packet.error || t("technology.integrationsLoadError")} live tone="error" title={copy("Nie można odczytać stanu integracji", "Could not read integration status")} /> : null}
    {packet.status === "ready" && packet.data ? <>
      <p className="text-sm text-company-muted">{copy("Stan odczytano", "Status observed")}: {formatAppDate(packet.data.observedAt, { dateStyle: "medium", timeStyle: "short" })}. {copy("To zapisany odczyt, bez bieżącego testu autoryzacji u dostawcy.", "This is a recorded read, without a live provider authorization check.")}</p>
      {packet.data.providers.length !== 2 || !["clickup", "google_drive"].every((provider) => packet.data?.providers.some((row) => row.provider === provider))
        ? <CcNotice live tone="warning" title={copy("Odczyt dostawców jest niepełny", "Provider status is incomplete")} detail={copy("Odśwież widok lub sprawdź ustawienia integracji.", "Refresh the view or check integration settings.")} /> : null}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {(["clickup", "google_drive"] as const).map((provider) => {
          const row = packet.data?.providers.find((item) => item.provider === provider);
          return row ? <IntegrationProviderCard key={provider} locale={locale} row={row} /> : null;
        })}
      </div>
    </> : null}
  </>;
}

function AutomationsView() {
  const { locale, t } = useLanguage();
  const packet = useOwnerPacket<AutomationDefinition[]>("/v1/operating-model/automation-definitions", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data || [];
  const columns: Array<CcTableColumn<AutomationDefinition>> = [
    { key: "automation", header: t("technology.automation"), sortable: true, searchValue: (row) => `${row.name} ${row.provider || ""} ${row.triggerType}`, cell: (row) => <div className="grid"><strong>{row.name}</strong><span className="text-xs text-company-muted">{row.provider ? humanize(row.provider) : "Roost"}</span></div> },
    { key: "trigger", header: t("technology.trigger"), sortable: true, sortValue: (row) => row.triggerType, cell: (row) => <span className="text-sm text-company-ink">{humanize(row.triggerType)}</span> },
    { key: "state", header: t("technology.state"), sortable: true, sortValue: (row) => row.lastError ? "error" : row.enabled ? "active" : "disabled", cell: (row) => <Status locale={locale} value={row.lastError ? "failed" : row.enabled ? "active" : "disabled"} /> },
    { key: "lastRun", header: t("technology.lastRun"), sortable: true, sortValue: (row) => row.lastRunAt || "", cell: (row) => <div className="grid"><span className="text-sm text-company-muted">{dateLabel(row.lastRunAt, t)}</span>{row.lastError ? <span className="max-w-md truncate text-xs text-error" title={row.lastError}>{row.lastError}</span> : null}</div> }
  ];
  return <>
    <TechnologyHeader view="automations" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("technology.automationsLoadError")} live /> : null}
    <CcDataTable columns={columns} rows={rows} density="compact" emptyTitle={t("technology.emptyAutomations")} emptyDetail={t("technology.emptyAutomationsDetail")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || t("technology.automationsLoadError") : null} getRowLabel={(row) => row.name} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" tableMinWidthClassName="min-w-[760px]" />
  </>;
}

export function TechnologyRoute() {
  const view = currentView();
  if (view === "goals") return <GoalsWorkbench departmentKey="09-technologia" />;
  return (
    <>
      <section className="grid gap-5">
        {view === "integrations" ? <IntegrationsView /> : view === "automations" ? <AutomationsView /> : <OverviewView />}
      </section>
    </>
  );
}
