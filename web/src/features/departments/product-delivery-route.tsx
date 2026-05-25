import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { OperatingGraphPacket } from "../../types";
import { SummaryGrid, useTranslatedTableLabels } from "./shared";

export function ProductDeliveryRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<OperatingGraphPacket>("/v1/operating-graph/areas/02-produkt?limit=80", true, t);
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
    <Shell activeArea="02-produkt">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">02 Product & Delivery</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{packet.data?.area?.name || "Product and Delivery Management"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          Read-only operating graph for goals, workflows, task execution, knowledge evidence, and source mappings in Product & Delivery.
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Product and Delivery context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Review queue</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.reviewItems || []).slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.title}</strong>
                  <span className="badge badge-outline">{item.severity}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Known unsupported families</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.unsupportedFamilies || []).slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.family}>
                <strong>{item.family}</strong>
                <p className="mt-1 text-xs text-company-muted">{item.reason}</p>
                <p className="mt-1 text-xs text-company-muted">Next: {item.nextAction}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No Product & Delivery graph nodes"
        emptyDetail="Add scoped tables, goals, workflows, and delivery records to populate this management system."
        error={packet.status === "error" ? packet.error || "Product and Delivery context could not load." : null}
        getRowLabel={(row) => row.label}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />
    </Shell>
  );
}
