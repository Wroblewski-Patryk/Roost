import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { RouteProposal, RouteProposalPacket } from "../../types";
import { coreAreas, plannedDepartments } from "./core-area-data";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

export function GeneralDashboard() {
  const { t } = useLanguage();
  const proposals = useOwnerPacket<RouteProposalPacket>("/v1/intake/route-proposals?limit=20", true, t);
  const rows = proposals.data?.proposals || [];
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
        <p className="text-sm font-black uppercase text-primary">{t("areas.00.label")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("general.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("general.description")}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {coreAreas.map((area) => (
          <a className="rounded-company border border-base-300 bg-base-100 p-5 no-underline transition hover:border-primary hover:bg-primary/5" href={area.href} key={area.key}>
            <i className={`ph-bold ${area.icon} text-2xl text-primary`} aria-hidden="true"></i>
            <p className="mt-4 text-xs font-black uppercase text-company-muted">{t(area.eyebrowKey)}</p>
            <h2 className="text-xl font-black text-company-ink">{t(area.labelKey)}</h2>
            <p className="mt-2 text-sm leading-6 text-company-muted">{t(area.descriptionKey)}</p>
          </a>
        ))}
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
          {plannedDepartments.map((department) => (
            <div className="rounded-company border border-dashed border-base-300 bg-base-200/60 p-3 text-sm text-company-muted" key={department}>
              <strong className="block text-company-ink">{department}</strong>
              {t("general.plannedManagementSystem")}
            </div>
          ))}
        </div>
      </section>

      <SummaryGrid summary={proposals.data?.summary} />
      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("general.noProposals")}
        emptyDetail={t("general.noProposals.detail")}
        error={proposals.status === "error" ? proposals.error || t("general.packetError") : null}
        getRowLabel={(row) => row.title || row.id}
        labels={tableLabels}
        loading={proposals.status === "loading"}
        mobileMode="cards"
      />
      <BlockedActions actions={proposals.data?.blockedActions} />
    </Shell>
  );
}
