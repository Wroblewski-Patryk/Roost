import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";
import { StrategyPacket } from "../../types";
import { BlockedActions, humanizeBusinessValue, useTranslatedTableLabels } from "./shared";
import { GoalsWorkbench } from "./goals-workbench";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return formatAppDate(value, { month: "short", day: "numeric" });
}

export function StrategyRoute() {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "goals") {
    return <GoalsWorkbench canonical />;
  }
  const { t } = useLanguage();
  const packet = useOwnerPacket<StrategyPacket>("/v1/strategy/context", true, t);
  const rows = packet.data?.goals || [];
  const metrics = packet.data?.metrics || [];
  const risks = packet.data?.risks || [];
  const recentTasks = packet.data?.tasks || [];
  const tableLabels = useTranslatedTableLabels();
  const header = <CcPageHeader eyebrow={t("strategy.eyebrow")} title={t("strategy.title")} description={t("strategy.description")} />;
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "goal",
      header: t("strategy.goal"),
      sortable: true,
      searchValue: (row) => `${row.title} ${row.description || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.title}</strong>
          <span className="text-xs text-company-muted">{row.description || t("common.noDescription")}</span>
        </div>
      )
    },
    {
      key: "status",
      header: t("table.status"),
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span>
    },
    {
      key: "targets",
      header: t("strategy.targets"),
      sortValue: (row) => row.targets?.length || 0,
      cell: (row) => <span className="text-sm text-company-muted">{row.targets?.length || "-"}</span>
    },
    {
      key: "tasks",
      header: t("strategy.followUpTasks"),
      sortValue: (row) => row.tasks?.length || 0,
      cell: (row) => <span className="text-sm text-company-muted">{row.tasks?.length || "-"}</span>
    }
  ];

  if (packet.status === "ready" && !rows.length) {
    return <>{header}<CcNotice tone="empty" title={t("strategy.empty.title")} detail={t("strategy.empty.detail")} /></>;
  }

  return (
    <>
      {header}

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Strategy context could not load."} live /> : null}

      {metrics.length || risks.length ? <section className={`grid gap-4 ${metrics.length && risks.length ? "lg:grid-cols-2" : ""}`}>
        {metrics.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("strategy.metrics")}</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {metrics.slice(0, 8).map((metric) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={metric.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{metric.name}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(metric.status, "Active")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{metric.category || "General"} • {metric.currentValue ?? "-"} / {metric.targetValue ?? "-"}</p>
              </div>
            ))}
          </div>
        </article> : null}

        {risks.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("strategy.risks")}</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {risks.slice(0, 8).map((risk) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={risk.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{risk.name}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(risk.riskLevel, "Medium")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{risk.category || "General"} • controls: {risk.controls?.length || 0}</p>
              </div>
            ))}
          </div>
        </article> : null}
      </section> : null}

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("strategy.empty.title")}
        emptyDetail={t("strategy.empty.detail")}
        error={packet.status === "error" ? packet.error || "Strategy context could not load." : null}
        getRowLabel={(row) => row.title}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      {recentTasks.length ? <section className="rounded-company border border-base-300 bg-base-100 p-4">
        <h2 className="text-lg font-black text-company-ink">{t("strategy.recentTasks")}</h2>
        <div className="roost-compact-list mt-3 grid gap-2">
          {recentTasks.slice(0, 10).map((task) => (
            <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={task.id}>
              <div className="flex items-start justify-between gap-2">
                <strong>{task.title}</strong>
                <span className="badge badge-outline">{humanizeBusinessValue(task.status, "To do")}</span>
              </div>
              <p className="mt-1 text-xs text-company-muted">{task.priority || "normal"} • due {formatDate(task.dueDate)}</p>
            </div>
          ))}
        </div>
      </section> : null}

      <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} />
    </>
  );
}
