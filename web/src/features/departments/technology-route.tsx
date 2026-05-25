import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { OperatingGraphPacket } from "../../types";
import { SummaryGrid, useTranslatedTableLabels } from "./shared";

export function TechnologyRoute() {
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
      cell: (row) => (
        <div className="grid">
          <strong>{row.label}</strong>
          <span className="text-xs text-company-muted">{row.type}</span>
        </div>
      )
    },
    {
      key: "summary",
      header: "Summary",
      cell: (row) => <span className="text-sm text-company-muted">{row.summary || "No summary"}</span>
    }
  ];

  return (
    <Shell activeArea="09-technologia">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">09 Technology</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{packet.data?.area?.name || "Technology and Integrations Management"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          Read-only operating graph for automation, integrations, system dependencies, and technical execution flow.
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Technology context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No technology graph nodes"
        emptyDetail="Add scoped technical records and mappings to populate this management system."
        error={packet.status === "error" ? packet.error || "Technology context could not load." : null}
        getRowLabel={(row) => row.label}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />
    </Shell>
  );
}
