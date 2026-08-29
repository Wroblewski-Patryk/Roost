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

type IntegrationCapability = {
  id: string;
  capabilityKey: string;
  riskLevel?: string;
  requiresApproval?: boolean;
};

type ToolAdapter = {
  id: string;
  provider: string;
  name: string;
  connectionStatus: string;
  healthStatus: string;
  lastSyncAt?: string | null;
  capabilities?: IntegrationCapability[];
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

function IntegrationsView() {
  const { locale, t } = useLanguage();
  const packet = useOwnerPacket<ToolAdapter[]>("/v1/company-os/tool-adapters?limit=100", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data || [];
  const columns: Array<CcTableColumn<ToolAdapter>> = [
    { key: "integration", header: t("technology.integration"), sortable: true, searchValue: (row) => `${row.name} ${row.provider}`, cell: (row) => <div className="grid"><strong>{row.name}</strong><span className="text-xs text-company-muted">{humanize(row.provider)}</span></div> },
    { key: "connection", header: t("technology.connection"), sortable: true, sortValue: (row) => row.connectionStatus, cell: (row) => <Status locale={locale} value={row.connectionStatus} /> },
    { key: "health", header: t("technology.health"), sortable: true, sortValue: (row) => row.healthStatus, cell: (row) => <Status locale={locale} value={row.healthStatus} /> },
    { key: "capabilities", header: t("technology.capabilities"), sortValue: (row) => row.capabilities?.length || 0, cell: (row) => <span className="text-sm text-company-ink">{row.capabilities?.length ? row.capabilities.map((item) => humanize(item.capabilityKey)).join(", ") : t("technology.noCapabilities")}</span> },
    { key: "sync", header: t("technology.lastSync"), sortable: true, sortValue: (row) => row.lastSyncAt || "", cell: (row) => <span className="text-sm text-company-muted">{dateLabel(row.lastSyncAt, t)}</span> }
  ];
  return <>
    <TechnologyHeader view="integrations" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("technology.integrationsLoadError")} live /> : null}
    <CcDataTable columns={columns} rows={rows} density="compact" emptyTitle={t("technology.emptyIntegrations")} emptyDetail={t("technology.emptyIntegrationsDetail")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || t("technology.integrationsLoadError") : null} getRowLabel={(row) => row.name} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" tableMinWidthClassName="min-w-[900px]" />
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
