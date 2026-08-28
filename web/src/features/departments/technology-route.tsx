import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { formatAppDate } from "../../i18n/date-format";
import { useLanguage } from "../../i18n/i18n";
import { OperatingGraphPacket } from "../../types";
import { useTranslatedTableLabels } from "./shared";

type TechnologyView = "overview" | "integrations" | "automations";

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
  return view === "integrations" || view === "automations" ? view : "overview";
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value?: string | null) {
  return value ? formatAppDate(value, { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

function stateTone(value: string) {
  if (["connected", "configured", "healthy", "active"].includes(value)) return "badge-success";
  if (["degraded", "unknown", "disabled"].includes(value)) return "badge-warning";
  return "badge-error";
}

function Status({ value }: { value: string }) {
  return <span className={`badge badge-sm ${stateTone(value)}`}>{humanize(value)}</span>;
}

function TechnologyHeader({ view, areaName }: { view: TechnologyView; areaName?: string }) {
  const content = view === "integrations"
    ? { title: "Integrations", detail: "External providers, connection health, and the capabilities they expose to Roost." }
    : view === "automations"
      ? { title: "Automations", detail: "Event-driven and scheduled execution definitions, their triggers, and last known run state." }
      : { title: "Technology overview", detail: areaName ? `${areaName}. Technical dependencies and operating-graph context across systems, integrations, and execution.` : "Technical dependencies and operating-graph context across systems, integrations, and execution." };
  const actions = view === "overview" ? <>
    <CcButton href="/areas?area=09-technologia&view=integrations" iconLeft="ph-plugs-connected" size="sm" variant="outline">Integrations</CcButton>
    <CcButton href="/areas?area=09-technologia&view=automations" iconLeft="ph-lightning" size="sm" variant="outline">Automations</CcButton>
  </> : <CcButton href="/areas?area=09-technologia&view=overview" iconLeft="ph-arrow-left" size="sm" variant="ghost">Overview</CcButton>;
  return <CcPageHeader actions={actions} description={content.detail} eyebrow="09 Technology" title={content.title} />;
}

function OverviewView() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<OperatingGraphPacket>("/v1/operating-graph/areas/09-technologia?limit=80", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data?.nodes || [];
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "node",
      header: "Node",
      sortable: true,
      searchValue: (row) => `${row.label} ${row.summary || ""} ${row.type}`,
      cell: (row) => <div className="grid"><strong>{row.label}</strong><span className="text-xs text-company-muted">{humanize(row.type)}</span></div>
    },
    { key: "summary", header: "Summary", cell: (row) => <span className="text-sm text-company-muted">{row.summary || "No summary"}</span> }
  ];
  return <>
    <TechnologyHeader areaName={packet.data?.area?.name} view="overview" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Technology context could not load."} live /> : null}
    <CcDataTable columns={columns} rows={rows} emptyTitle="No technology graph nodes" emptyDetail="Add scoped technical records and mappings to populate this overview." enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || "Technology context could not load." : null} getRowLabel={(row) => row.label} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" />
  </>;
}

function IntegrationsView() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<ToolAdapter[]>("/v1/company-os/tool-adapters?limit=100", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data || [];
  const columns: Array<CcTableColumn<ToolAdapter>> = [
    { key: "integration", header: "Integration", sortable: true, searchValue: (row) => `${row.name} ${row.provider}`, cell: (row) => <div className="grid"><strong>{row.name}</strong><span className="text-xs text-company-muted">{humanize(row.provider)}</span></div> },
    { key: "connection", header: "Connection", sortable: true, sortValue: (row) => row.connectionStatus, cell: (row) => <Status value={row.connectionStatus} /> },
    { key: "health", header: "Health", sortable: true, sortValue: (row) => row.healthStatus, cell: (row) => <Status value={row.healthStatus} /> },
    { key: "capabilities", header: "Capabilities", sortValue: (row) => row.capabilities?.length || 0, cell: (row) => <span className="text-sm text-company-ink">{row.capabilities?.length ? row.capabilities.map((item) => humanize(item.capabilityKey)).join(", ") : "No exposed capabilities"}</span> },
    { key: "sync", header: "Last sync", sortable: true, sortValue: (row) => row.lastSyncAt || "", cell: (row) => <span className="text-sm text-company-muted">{dateLabel(row.lastSyncAt)}</span> }
  ];
  return <>
    <TechnologyHeader view="integrations" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Integrations could not load."} live /> : null}
    <CcDataTable columns={columns} rows={rows} density="compact" emptyTitle="No integrations" emptyDetail="Register a workspace tool adapter to expose provider capabilities here." enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || "Integrations could not load." : null} getRowLabel={(row) => row.name} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" tableMinWidthClassName="min-w-[900px]" />
  </>;
}

function AutomationsView() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<AutomationDefinition[]>("/v1/operating-model/automation-definitions", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data || [];
  const columns: Array<CcTableColumn<AutomationDefinition>> = [
    { key: "automation", header: "Automation", sortable: true, searchValue: (row) => `${row.name} ${row.provider || ""} ${row.triggerType}`, cell: (row) => <div className="grid"><strong>{row.name}</strong><span className="text-xs text-company-muted">{row.provider ? humanize(row.provider) : "Roost"}</span></div> },
    { key: "trigger", header: "Trigger", sortable: true, sortValue: (row) => row.triggerType, cell: (row) => <span className="text-sm text-company-ink">{humanize(row.triggerType)}</span> },
    { key: "state", header: "State", sortable: true, sortValue: (row) => row.lastError ? "error" : row.enabled ? "active" : "disabled", cell: (row) => <Status value={row.lastError ? "failed" : row.enabled ? "active" : "disabled"} /> },
    { key: "lastRun", header: "Last run", sortable: true, sortValue: (row) => row.lastRunAt || "", cell: (row) => <div className="grid"><span className="text-sm text-company-muted">{dateLabel(row.lastRunAt)}</span>{row.lastError ? <span className="max-w-md truncate text-xs text-error" title={row.lastError}>{row.lastError}</span> : null}</div> }
  ];
  return <>
    <TechnologyHeader view="automations" />
    {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Automations could not load."} live /> : null}
    <CcDataTable columns={columns} rows={rows} density="compact" emptyTitle="No automations" emptyDetail="Scheduled and event-driven work will appear here after an automation definition is configured." enableColumnVisibility={false} enablePagination={false} enableSelection={false} error={packet.status === "error" ? packet.error || "Automations could not load." : null} getRowLabel={(row) => row.name} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" tableMinWidthClassName="min-w-[760px]" />
  </>;
}

export function TechnologyRoute() {
  const view = currentView();
  return (
    <>
      <section className="grid gap-5">
        {view === "integrations" ? <IntegrationsView /> : view === "automations" ? <AutomationsView /> : <OverviewView />}
      </section>
    </>
  );
}
