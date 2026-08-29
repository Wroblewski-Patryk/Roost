import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { CcTextInput } from "../../components/cc-text-input";
import { formatBusinessValue } from "../../i18n/business-values";
import { useLanguage } from "../../i18n/i18n";
import { ProductApplication, ProductOffering } from "./product-engineering-types";

function humanize(value: string) {
  return formatBusinessValue(value);
}

export function ProductDeliveryRoute() {
  const { t } = useLanguage();
  const [offerings, setOfferings] = useState<ProductOffering[]>([]);
  const [applications, setApplications] = useState<ProductApplication[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [offeringResponse, portfolioResponse] = await Promise.all([
        api<{ data: ProductOffering[] }>("/v1/product-engineering/offerings"),
        api<{ data: { applications: ProductApplication[] } }>("/v1/product-engineering/portfolio")
      ]);
      setOfferings(offeringResponse.data);
      setApplications(portfolioResponse.data.applications);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "product_delivery_load_failed");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createOffering(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/v1/product-engineering/offerings", {
      method: "POST",
      body: JSON.stringify({
        applicationId: form.get("applicationId") || undefined,
        key: form.get("key"),
        name: form.get("name"),
        type: form.get("type"),
        description: form.get("description") || undefined,
        valueProposition: form.get("valueProposition") || undefined,
        customerSegment: form.get("customerSegment") || undefined,
        businessModel: form.get("businessModel") || undefined
      })
    });
    setShowCreate(false);
    await load();
  }

  async function updateOffering(id: string, commercialStatus: string) {
    await api(`/v1/product-engineering/offerings/${id}`, { method: "PATCH", body: JSON.stringify({ commercialStatus }) });
    await load();
  }

  const offeringColumns: Array<CcTableColumn<ProductOffering>> = [
    { key: "offering", header: t("products.offering"), required: true, sortable: true, searchValue: (offering) => `${offering.name} ${offering.type}`, cell: (offering) => <span className="grid"><strong>{offering.name}</strong><small className="text-company-muted">{humanize(offering.type)}</small></span> },
    { key: "application", header: t("products.application"), sortable: true, sortValue: (offering) => offering.application?.name || "", cell: (offering) => offering.application?.name || t("products.standalone") },
    { key: "lifecycle", header: t("products.lifecycle"), sortable: true, sortValue: (offering) => offering.lifecycleStage, cell: (offering) => humanize(offering.lifecycleStage) },
    { key: "commercialStatus", header: t("products.commercialStatus"), filterable: true, filterValue: (offering) => offering.commercialStatus, cell: (offering) => <CcSelect aria-label={`${t("products.commercialStatus")}: ${offering.name}`} className="select-sm min-w-40" value={offering.commercialStatus} onChange={(event) => void updateOffering(offering.id, event.target.value)}><option value="draft">{humanize("draft")}</option><option value="validation">{humanize("validation")}</option><option value="launch_preparation">{humanize("launch_preparation")}</option><option value="active">{humanize("active")}</option><option value="paused">{humanize("paused")}</option><option value="retired">{humanize("retired")}</option></CcSelect> },
    { key: "sales", header: t("products.sales"), sortable: true, sortValue: (offering) => offering.salesReadiness, cell: (offering) => humanize(offering.salesReadiness) },
    { key: "support", header: t("products.support"), sortable: true, sortValue: (offering) => offering.supportReadiness, cell: (offering) => humanize(offering.supportReadiness) }
  ];

  return (
    <>
      <CcPageHeader actions={!showCreate ? <CcButton iconLeft="ph-plus" onClick={() => setShowCreate(true)} size="sm" variant="primary">{t("products.new")}</CcButton> : null} description={t("products.description")} eyebrow={t("products.eyebrow")} title={t("products.title")} />

      {status === "loading" ? <CcNotice tone="loading" title="Loading products and services" /> : null}
      {status === "error" ? <CcNotice tone="error" title={error || "Products and Services could not load"} /> : null}

      {showCreate ? <CcRecordEditorModal
        actions={<><CcButton onClick={() => setShowCreate(false)} type="button" variant="ghost">Cancel</CcButton><CcButton iconLeft="ph-plus" type="submit" variant="primary">Create offering</CcButton></>}
        description="Define the commercial wrapper around an application or a standalone service without duplicating its source record."
        eyebrow="02 Products & Services"
        onClose={() => setShowCreate(false)}
        onSubmit={createOffering}
        title="New product or service"
        titleId="offering-editor-title"
      >
        <CcRecordEditorSection title="Identity" description="Use a clear customer-facing name and a stable internal key.">
          <div className="grid items-start gap-4 md:grid-cols-2">
            <CcField label="Offering name" required>{({ id }) => <CcTextInput autoFocus id={id} name="name" required />}</CcField>
            <CcField label="Stable key" hint="Lowercase letters, numbers, dots and hyphens.">{({ id, describedBy }) => <CcTextInput aria-describedby={describedBy} id={id} name="key" pattern="[a-z0-9._-]+" placeholder="managed-support" required />}</CcField>
            <CcField label="Offering type">{({ id }) => <CcSelect id={id} name="type"><option value="product">Product</option><option value="service">Service</option><option value="hybrid">Hybrid product + service</option></CcSelect>}</CcField>
            <CcField label="Source application" hint="Optional. Link instead of copying product evidence.">{({ id, describedBy }) => <CcSelect aria-describedby={describedBy} id={id} name="applicationId"><option value="">Standalone service</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.name}</option>)}</CcSelect>}</CcField>
          </div>
        </CcRecordEditorSection>
        <CcRecordEditorSection title="Market definition" description="Explain the scope, customer and commercial logic in language the team can reuse.">
          <div className="grid items-start gap-4 md:grid-cols-2">
            <CcField label="Description">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} name="description" />}</CcField>
            <CcField label="Value proposition">{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} name="valueProposition" />}</CcField>
            <CcField label="Customer segment">{({ id }) => <CcTextInput id={id} name="customerSegment" />}</CcField>
            <CcField label="Business model">{({ id }) => <CcTextInput id={id} name="businessModel" />}</CcField>
          </div>
        </CcRecordEditorSection>
      </CcRecordEditorModal> : null}

      <section className="grid gap-3"><div><h2 className="text-lg font-black text-company-ink">{t("products.list.title")}</h2><p className="text-sm text-company-muted">{t("products.list.detail")}</p></div><CcDataTable columns={offeringColumns} density="compact" emptyDetail={t("products.empty.detail")} emptyTitle={t("products.empty.title")} enableColumnVisibility={false} enablePagination={false} enableSelection={false} getRowLabel={(offering) => offering.name} loading={status === "loading"} mobileMode="cards" rows={offerings} searchPlaceholder={t("products.search")} tableMinWidthClassName="min-w-[900px]" /></section>

      {applications.length ? <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-black">Application product readiness</h2>
        <div className="roost-compact-list mt-4 grid gap-2">
          {applications.map((application) => <article className="rounded-company border border-base-300 p-4" key={application.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{application.name}</strong><p className="text-xs text-company-muted">Innovation: {humanize(application.innovationStage)} · Product: {humanize(application.productStage)}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-company-muted">Readiness {application.readiness?.overall || 0}%</span>{application.gapSummary?.blockers ? <span className="badge badge-error">{application.gapSummary.blockers} blockers</span> : null}</div></div></article>)}
        </div>
      </section> : null}
    </>
  );
}
