import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { OperatingGraphPacket } from "../../types";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

export function LegalRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<OperatingGraphPacket>("/v1/operating-graph/areas/10-prawo?limit=80", true, t);
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
          <span className="text-xs text-company-muted">{humanizeBusinessValue(row.type, "Record")}</span>
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
    <>
      <CcPageHeader eyebrow="10 Legal" title="Legal and standards" description={packet.data?.area?.name ? `${packet.data.area.name}. Read-only operating graph for compliance context, policy dependencies, governance workflows, and legal evidence.` : "Read-only operating graph for compliance context, policy dependencies, governance workflows, and legal evidence."} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Legal context could not load."} live /> : null}

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No legal graph nodes"
        emptyDetail="Add scoped compliance and governance records to populate this management system."
        error={packet.status === "error" ? packet.error || "Legal context could not load." : null}
        getRowLabel={(row) => row.label}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />
    </>
  );
}
