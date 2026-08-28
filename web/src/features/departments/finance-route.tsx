import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { FinancePacket } from "../../types";
import { BlockedActions, humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

export function FinanceRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<FinancePacket>("/v1/finance/context?limit=80", true, t);
  const rows = packet.data?.pricingModels || [];
  const invoiceReadiness = packet.data?.invoiceReadiness || [];
  const commercialExceptions = packet.data?.commercialExceptions || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "model",
      header: "Pricing model",
      sortable: true,
      searchValue: (row) => `${row.name} ${row.market || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.name}</strong>
          <span className="text-xs text-company-muted">{row.market || "Market n/a"} • {row.currency || "-"}</span>
        </div>
      )
    },
    {
      key: "pricing",
      header: "Pricing",
      cell: (row) => (
        <span className="text-sm">
          {row.setupFee != null ? `setup ${row.setupFee} ${row.currency || ""}, ` : ""}
          {row.recurringFee != null ? `recurring ${row.recurringFee} ${row.currency || ""}` : "n/a"}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span>
    },
    {
      key: "decision",
      header: "Owner decision",
      cell: (row) => row.ownerDecisionNeeded ? <span className="badge badge-sm badge-warning">Required</span> : <span className="text-company-muted">-</span>
    }
  ];

  return (
    <>
      <CcPageHeader eyebrow="07 Finance" title="Finance and Billing Management" description="Review pricing models, valuation readiness, invoice blockers, payment context, and owner-required finance decisions." />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Finance context could not load."} live /> : null}

      {invoiceReadiness.length || commercialExceptions.length ? <section className="grid gap-4 lg:grid-cols-2">
        {invoiceReadiness.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Invoice readiness</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {invoiceReadiness.slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.dealId ? `Deal ${item.dealId.slice(0, 8)}` : "Exception context"}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(item.readinessStatus, "Blocked")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">Missing: {(item.missingEvidence || []).slice(0, 3).join(", ") || "none"}</p>
              </div>
            ))}
          </div>
        </article> : null}

        {commercialExceptions.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Commercial exceptions</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {commercialExceptions.slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.clientName || "Client n/a"}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(item.status, "Needs owner decision")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">risk: {item.risk || "n/a"} • discount: {item.discountPercent ?? "-"}%</p>
              </div>
            ))}
          </div>
        </article> : null}
      </section> : null}

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No finance pricing models"
        emptyDetail="Add or import pricing source records to populate finance management."
        error={packet.status === "error" ? packet.error || "Finance context could not load." : null}
        getRowLabel={(row) => row.name}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} />
    </>
  );
}
