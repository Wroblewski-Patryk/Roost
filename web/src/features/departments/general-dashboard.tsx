import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { DashboardCommandPacket, DashboardPriorityItem, RouteProposal } from "../../types";
import { coreAreas, plannedDepartments } from "./core-area-data";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

function healthTone(health?: string) {
  if (health === "blocked") return "badge-error";
  if (health === "watch") return "badge-warning";
  return "badge-success";
}

function itemMeta(item: DashboardPriorityItem) {
  const details = [item.source, item.status, item.severity].filter(Boolean);
  return details.join(" / ");
}

export function GeneralDashboard() {
  const { t } = useLanguage();
  const command = useOwnerPacket<DashboardCommandPacket>("/v1/dashboard/command", true, t);
  const rows = command.data?.latestRouteProposals || [];
  const priorityItems = command.data?.priorityItems || [];
  const nextActions = command.data?.nextActions || [];
  const commandReady = command.status === "ready";
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<RouteProposal>> = [
    { key: "title", header: t("table.proposal"), cell: (row) => <strong>{row.title || row.id}</strong> },
    { key: "target", header: t("table.target"), cell: (row) => row.targetDepartmentKey || t("state.unassigned") },
    { key: "status", header: t("table.status"), cell: (row) => <span className="badge badge-outline">{row.status || t("state.review")}</span> },
    { key: "risk", header: t("table.risk"), cell: (row) => row.riskLevel || t("state.normal") }
  ];

  return (
    <Shell activeArea="00-ogolny">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">{t("areas.00.label")}</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">{t("general.title")}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("general.description")}</p>
          </div>
          <div className="rounded-company border border-base-300 bg-base-200/60 px-4 py-3 text-sm">
            <span className="block font-black text-company-ink">Command packet</span>
            <span className="text-company-muted">{command.data?.generatedAt ? new Date(command.data.generatedAt).toLocaleString() : t("state.loading")}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-company border border-base-300 bg-base-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-company-ink">What needs attention now</h2>
              <p className="mt-1 text-sm text-company-muted">Live signals from intake, operations, workforce, assets, approvals, and risks.</p>
            </div>
            <span className="badge badge-primary">{priorityItems.length} signals</span>
          </div>
          <div className="mt-4 grid gap-3">
            {command.status === "loading" ? (
              <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} />
            ) : command.status === "error" ? (
              <CcNotice tone="error" title={command.error || t("general.packetError")} live />
            ) : priorityItems.length ? priorityItems.slice(0, 6).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/50 p-3" key={`${item.source}-${item.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="text-company-ink">{item.title}</strong>
                  <span className="badge badge-outline">{itemMeta(item)}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}</p>
              </div>
            )) : (
              <div className="rounded-company border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-company-muted">
                No urgent cross-department signals in the command packet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-xl font-black text-company-ink">Next actions</h2>
          <div className="mt-4 grid gap-3">
            {command.status === "loading" ? (
              <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} />
            ) : command.status === "error" ? (
              <CcNotice tone="error" title={command.error || t("general.packetError")} live />
            ) : nextActions.length ? nextActions.map((action) => (
              <a className="rounded-company border border-base-300 bg-base-200/50 p-3 no-underline transition hover:border-primary hover:bg-primary/5" href={action.target || "#"} key={action.key}>
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-company-ink">{action.label}</strong>
                  <span className="badge badge-outline">{action.count ?? 0}</span>
                </div>
                <p className="mt-1 text-xs uppercase text-company-muted">{action.priority || "normal"}</p>
              </a>
            )) : (
              <div className="rounded-company border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-company-muted">
                No immediate owner actions detected.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {commandReady ? (command.data?.departmentSignals || []).map((signal) => (
          <a className="rounded-company border border-base-300 bg-base-100 p-4 no-underline transition hover:border-primary hover:bg-primary/5" href={signal.href} key={signal.key}>
            <div className="flex items-start justify-between gap-3">
              <strong className="text-company-ink">{signal.label}</strong>
              <span className={`badge ${healthTone(signal.health)}`}>{signal.health}</span>
            </div>
            <p className="mt-2 text-sm text-company-muted">{signal.count} open signal{signal.count === 1 ? "" : "s"}</p>
          </a>
        )) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {coreAreas.map((area) => {
          const content = (
            <>
              <i className={`ph-bold ${area.icon} text-2xl ${area.enabled ? "text-primary" : "text-company-muted"}`} aria-hidden="true"></i>
              <p className="mt-4 text-xs font-black uppercase text-company-muted">{t(area.eyebrowKey)}</p>
              <h2 className="text-xl font-black text-company-ink">{t(area.labelKey)}</h2>
              <p className="mt-2 text-sm leading-6 text-company-muted">{t(area.descriptionKey)}</p>
            </>
          );
          return area.enabled && area.href ? (
            <a className="rounded-company border border-base-300 bg-base-100 p-5 no-underline transition hover:border-primary hover:bg-primary/5" href={area.href} key={area.key}>
              {content}
            </a>
          ) : (
            <div className="rounded-company border border-dashed border-base-300 bg-base-100/70 p-5" key={area.key}>
              {content}
              <span className="mt-4 inline-flex rounded-full border border-base-300 px-3 py-1 text-xs font-black uppercase text-company-muted">{t("general.plannedManagementSystem")}</span>
            </div>
          );
        })}
      </section>

      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{t("general.departmentMap")}</h2>
            <p className="mt-1 text-sm text-company-muted">{t("general.departmentMap.description")}</p>
          </div>
          <span className="badge badge-primary">{t("general.routesActiveWork")}</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {plannedDepartments.map((departmentKey) => (
            <div className="rounded-company border border-dashed border-base-300 bg-base-200/60 p-3 text-sm text-company-muted" key={departmentKey}>
              <strong className="block text-company-ink">{t(departmentKey)}</strong>
              {t("general.plannedManagementSystem")}
            </div>
          ))}
        </div>
      </section>

      <SummaryGrid summary={command.data?.summary} />
      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("general.noProposals")}
        emptyDetail={t("general.noProposals.detail")}
        error={command.status === "error" ? command.error || t("general.packetError") : null}
        getRowLabel={(row) => row.title || row.id}
        labels={tableLabels}
        loading={command.status === "loading"}
        mobileMode="cards"
      />
      <BlockedActions actions={command.data?.blockedActions || command.data?.agentPacket?.blockedActions} />
    </Shell>
  );
}
