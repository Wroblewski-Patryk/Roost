import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { AssetResource, AssetsPacket } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

export function AssetsRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<AssetsPacket>("/v1/assets/context?limit=50", true, t);
  const rows = packet.data?.resources || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<AssetResource>> = [
    { key: "name", header: t("table.resource"), cell: (row) => <strong>{row.name}</strong> },
    { key: "type", header: t("table.type"), cell: (row) => row.type || t("state.resource") },
    { key: "status", header: t("table.status"), cell: (row) => <span className="badge badge-outline">{row.status || t("state.indexed")}</span> },
    { key: "ai", header: t("table.aiReady"), cell: (row) => row.aiContextReady ? t("state.ready") : t("state.needsContext") }
  ];

  return (
    <Shell activeArea="08-zasoby">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("areas.08.label")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("assets.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("assets.description")}</p>
      </section>
      <SummaryGrid summary={packet.data?.summary} />
      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("assets.noItems")}
        emptyDetail={t("assets.noItems.detail")}
        error={packet.status === "error" ? packet.error || t("assets.packetError") : null}
        getRowLabel={(row) => row.name}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
        rowActions={(row) => row.webViewLink ? (
          <CcButton href={row.webViewLink} size="xs" target="_blank" rel="noreferrer" variant="ghost">{t("assets.open")}</CcButton>
        ) : null}
      />
      <BlockedActions actions={packet.data?.blockedActions} />
    </Shell>
  );
}
