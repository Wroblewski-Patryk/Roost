import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { StrategyPacket } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function StrategyRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<StrategyPacket>("/v1/strategy/context", true, t);
  const rows = packet.data?.goals || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "goal",
      header: "Goal",
      sortable: true,
      searchValue: (row) => `${row.title} ${row.description || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.title}</strong>
          <span className="text-xs text-company-muted">{row.description || "No description"}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{row.status || "unknown"}</span>
    },
    {
      key: "targets",
      header: "Targets",
      sortValue: (row) => row.targets?.length || 0,
      cell: (row) => <span className="badge badge-ghost badge-sm">{row.targets?.length || 0}</span>
    },
    {
      key: "tasks",
      header: "Follow-up tasks",
      sortValue: (row) => row.tasks?.length || 0,
      cell: (row) => <span className="badge badge-ghost badge-sm">{row.tasks?.length || 0}</span>
    }
  ];

  return (
    <Shell activeArea="01-strategia">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">01 Strategy</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{packet.data?.department?.name || "Strategy Management System"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          {packet.data?.department?.purpose || "Align goals, targets, metrics, risk, and decisions into one strategic operating context."}
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Strategy context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Metrics</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.metrics || []).slice(0, 8).map((metric) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={metric.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{metric.name}</strong>
                  <span className="badge badge-outline">{metric.status || "active"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{metric.category || "General"} • {metric.currentValue ?? "-"} / {metric.targetValue ?? "-"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Strategic risks</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.risks || []).slice(0, 8).map((risk) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={risk.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{risk.name}</strong>
                  <span className="badge badge-outline">{risk.riskLevel || "medium"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{risk.category || "General"} • controls: {risk.controls?.length || 0}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No strategy goals"
        emptyDetail="Add strategic goals and targets to populate this board."
        error={packet.status === "error" ? packet.error || "Strategy context could not load." : null}
        getRowLabel={(row) => row.title}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      <section className="rounded-company border border-base-300 bg-base-100 p-4">
        <h2 className="text-lg font-black text-company-ink">Recent strategic tasks</h2>
        <div className="mt-3 grid gap-2">
          {(packet.data?.tasks || []).slice(0, 10).map((task) => (
            <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={task.id}>
              <div className="flex items-start justify-between gap-2">
                <strong>{task.title}</strong>
                <span className="badge badge-outline">{task.status || "todo"}</span>
              </div>
              <p className="mt-1 text-xs text-company-muted">{task.priority || "normal"} • due {formatDate(task.dueDate)}</p>
            </div>
          ))}
        </div>
      </section>

      <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} />
    </Shell>
  );
}
