import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { OperatingGraphPacket } from "../../types";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

export function LegalRoute() {
  const { locale, t } = useLanguage();
  const packet = useOwnerPacket<OperatingGraphPacket>("/v1/operating-graph/areas/10-prawo?limit=80", true, t);
  const tableLabels = useTranslatedTableLabels();
  const rows = packet.data?.nodes || [];
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "node",
      header: t("workbench.node"),
      sortable: true,
      searchValue: (row) => `${row.label} ${row.summary || ""} ${row.type}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.label}</strong>
          <span className="text-xs text-company-muted">{humanizeBusinessValue(row.type, "Unknown", locale)}</span>
        </div>
      )
    },
    {
      key: "summary",
      header: t("workbench.summary"),
      cell: (row) => <span className="text-sm text-company-muted">{row.summary || t("workbench.noSummary")}</span>
    }
  ];

  return (
    <>
      <CcPageHeader eyebrow={t("legal.eyebrow")} title={t("legal.title")} description={packet.data?.area?.name ? `${packet.data.area.name}. ${t("legal.description")}` : t("legal.description")} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("legal.loadError")} live /> : null}

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("legal.empty")}
        emptyDetail={t("legal.emptyDetail")}
        error={packet.status === "error" ? packet.error || t("legal.loadError") : null}
        getRowLabel={(row) => row.label}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />
    </>
  );
}
