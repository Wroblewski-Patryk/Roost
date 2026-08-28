import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { Shell } from "../../layout/shell";
import { ProductApplication, ProductOffering } from "./product-engineering-types";

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProductDeliveryRoute() {
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

  const active = offerings.filter((offering) => offering.commercialStatus === "active").length;
  const launchPreparation = offerings.filter((offering) => offering.commercialStatus === "launch_preparation").length;
  const blocked = applications.filter((application) => (application.gapSummary?.blockers || 0) > 0).length;

  return (
    <Shell activeArea="02-produkt">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">02 Products & Services</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">Productization and delivery portfolio</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">Commercial offerings reference the same application records developed in Innovation. Productization never copies the application, capability map, evidence, or development history.</p>
          </div>
          <CcButton onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Close" : "New product / service"}</CcButton>
        </div>
      </section>

      {status === "loading" ? <CcNotice tone="loading" title="Loading products and services" /> : null}
      {status === "error" ? <CcNotice tone="error" title={error || "Products and Services could not load"} /> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Offerings", value: offerings.length }, { label: "Active", value: active }, { label: "Launch preparation", value: launchPreparation }, { label: "Applications with blockers", value: blocked }].map((item) => <article className="rounded-company border border-base-300 bg-base-100 p-4" key={item.label}><p className="text-2xl font-black">{item.value}</p><p className="text-xs font-bold text-company-muted">{item.label}</p></article>)}
      </section>

      {showCreate ? <section className="rounded-company border border-primary/30 bg-base-100 p-5"><h2 className="text-xl font-black">Define a commercial offering</h2><form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createOffering}><input className="input input-bordered" name="name" placeholder="Offering name" required /><input className="input input-bordered" name="key" placeholder="stable-key" required /><select className="select select-bordered" name="type"><option value="product">Product</option><option value="service">Service</option><option value="hybrid">Hybrid product + service</option></select><select className="select select-bordered" name="applicationId"><option value="">Service without application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.name}</option>)}</select><textarea className="textarea textarea-bordered" name="description" placeholder="Definition and scope"></textarea><textarea className="textarea textarea-bordered" name="valueProposition" placeholder="Value proposition"></textarea><input className="input input-bordered" name="customerSegment" placeholder="Customer segment" /><input className="input input-bordered" name="businessModel" placeholder="Business model" /><div className="md:col-span-2"><CcButton type="submit">Create offering</CcButton></div></form></section> : null}

      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-black">Products and services</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="table table-zebra">
            <thead><tr><th>Offering</th><th>Application</th><th>Lifecycle</th><th>Commercial status</th><th>Sales</th><th>Support</th></tr></thead>
            <tbody>{offerings.map((offering) => <tr key={offering.id}><td><strong>{offering.name}</strong><br /><span className="text-xs text-company-muted">{humanize(offering.type)}</span></td><td>{offering.application?.name || "No application"}</td><td>{humanize(offering.lifecycleStage)}</td><td><select className="select select-bordered select-sm" value={offering.commercialStatus} onChange={(event) => void updateOffering(offering.id, event.target.value)}><option value="draft">Draft</option><option value="validation">Validation</option><option value="launch_preparation">Launch preparation</option><option value="active">Active</option><option value="paused">Paused</option><option value="retired">Retired</option></select></td><td>{humanize(offering.salesReadiness)}</td><td>{humanize(offering.supportReadiness)}</td></tr>)}</tbody>
          </table>
        </div>
        {!offerings.length && status === "ready" ? <CcNotice tone="empty" title="No products or services defined" detail="Create an offering and optionally connect it to an application from Innovation." /> : null}
      </section>

      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-black">Application product readiness</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {applications.map((application) => <article className="rounded-company border border-base-300 p-4" key={application.id}><div className="flex items-start justify-between gap-3"><div><strong>{application.name}</strong><p className="text-xs text-company-muted">Innovation: {humanize(application.innovationStage)} · Product: {humanize(application.productStage)}</p></div><span className="badge badge-primary">{application.readiness?.overall || 0}%</span></div><div className="mt-3 flex gap-2"><span className={`badge ${application.gapSummary?.blockers ? "badge-error" : "badge-success"}`}>{application.gapSummary?.blockers || 0} blockers</span><span className="badge badge-outline">{application.gapSummary?.total || 0} gaps</span></div></article>)}
        </div>
      </section>
    </Shell>
  );
}
