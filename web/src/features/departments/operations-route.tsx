import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { OperationsPacket, OperationsWorkItem } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

export function OperationsRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<OperationsPacket>("/v1/operations/work-items?limit=50", true, t);
  const rows = packet.data?.workItems || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<OperationsWorkItem>> = [
    { key: "title", header: t("table.workItem"), cell: (row) => <strong>{row.title}</strong> },
    { key: "status", header: t("table.status"), cell: (row) => <span className="badge badge-outline">{row.status || t("state.backlog")}</span> },
    { key: "priority", header: t("table.priority"), cell: (row) => row.priority || t("state.medium") },
    { key: "readiness", header: t("table.readiness"), cell: (row) => row.readiness || t("state.needsReview") }
  ];

  return (
    <Shell activeArea="04-operacje">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("areas.04.label")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("operations.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("operations.description")}</p>
      </section>
      <SummaryGrid summary={packet.data?.summary} />
      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("operations.noItems")}
        emptyDetail={t("operations.noItems.detail")}
        error={packet.status === "error" ? packet.error || t("operations.packetError") : null}
        getRowLabel={(row) => row.title}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />
      <BlockedActions actions={packet.data?.blockedActions} />
    </Shell>
  );
}
