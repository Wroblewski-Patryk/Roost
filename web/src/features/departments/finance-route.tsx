import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { FinancePacket } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

export function FinanceRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<FinancePacket>("/v1/finance/context?limit=80", true, t);
  const rows = packet.data?.pricingModels || [];
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
      cell: (row) => <span className="badge badge-outline">{row.status || "unknown"}</span>
    },
    {
      key: "decision",
      header: "Owner decision",
      cell: (row) => <span className={`badge badge-sm ${row.ownerDecisionNeeded ? "badge-warning" : "badge-ghost"}`}>{row.ownerDecisionNeeded ? "required" : "not required"}</span>
    }
  ];

  return (
    <Shell activeArea="07-finanse">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">07 Finance</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">Finance and Billing Management</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          Review pricing models, valuation readiness, invoice blockers, payment context, and owner-required finance decisions.
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Finance context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Invoice readiness</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.invoiceReadiness || []).slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.dealId ? `Deal ${item.dealId.slice(0, 8)}` : "Exception context"}</strong>
                  <span className="badge badge-outline">{item.readinessStatus || "blocked"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">Missing: {(item.missingEvidence || []).slice(0, 3).join(", ") || "none"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Commercial exceptions</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.commercialExceptions || []).slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.clientName || "Client n/a"}</strong>
                  <span className="badge badge-outline">{item.status || "needs_owner_decision"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">risk: {item.risk || "n/a"} • discount: {item.discountPercent ?? "-"}%</p>
              </div>
            ))}
          </div>
        </article>
      </section>

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
    </Shell>
  );
}
