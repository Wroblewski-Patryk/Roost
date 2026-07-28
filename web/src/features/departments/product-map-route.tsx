import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { itemTone, projectionMessage, projectionTone, type ProductMapReadResponse, type ProductMapProjection } from "./product-map-projection";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; response: ProductMapReadResponse };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
}

function ProjectionSummary({ packet }: { packet: ProductMapProjection }) {
  return (
    <aside className="grid gap-3 rounded-company border border-base-300 bg-base-200/55 p-4">
      <div>
        <p className="text-xs font-black uppercase text-company-muted">Projection snapshot</p>
        <p className="mt-1 text-sm text-company-muted">Observed {formatDate(packet.observedAt)}. This read model never grants control-plane authority.</p>
      </div>
      <div className="rounded-company border border-base-300 bg-base-100 p-3">
        <p className="text-xs font-black uppercase text-company-muted">Source state</p>
        <p className="mt-1 font-bold text-company-ink">{packet.sourceState}</p>
      </div>
      <div className="rounded-company border border-base-300 bg-base-100 p-3">
        <p className="text-xs font-black uppercase text-company-muted">Conflict status</p>
        <p className="mt-1 font-bold text-company-ink">{packet.conflictState}</p>
      </div>
    </aside>
  );
}

export function ProductMapRoute() {
  const { t } = useLanguage();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api<ProductMapReadResponse>("/v1/product-map/projection")
      .then((response) => { if (!cancelled) setState({ status: "ready", response }); })
      .catch((error: unknown) => { if (!cancelled) setState({ status: "error", message: userErrorMessage(error, t) }); });
    return () => { cancelled = true; };
  }, [t]);

  const result = state.status === "ready" ? state.response.data : null;
  const packet = result?.packet ?? null;
  const message = result ? projectionMessage(result.status, packet) : null;

  return (
    <Shell activeArea="00-ogolny">
      <section className="grid gap-5 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">00 General</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">Roost Product Map</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">Read the accepted Roost projection of lifecycle, evidence, and release gates. Source, deployed, and freshness facts remain separate.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-arrow-left" variant="outline">Back to 00 General</CcButton>
            <CcButton href="/dashboard" iconLeft="ph-house" variant="ghost">Open dashboard</CcButton>
          </div>
        </div>
        {packet ? <ProjectionSummary packet={packet} /> : <aside className="rounded-company border border-base-300 bg-base-200/55 p-4 text-sm text-company-muted">The projection summary becomes available after a successful workspace read.</aside>}
      </section>

      {state.status === "loading" ? <CcNotice tone="loading" live title="Loading Product Map" detail="Reading the authenticated Roost projection." /> : null}
      {state.status === "error" ? <CcNotice tone="error" live title="Product Map could not be loaded" detail={state.message} /> : null}
      {result && message ? <CcNotice tone={projectionTone(result.status, packet)} live={result.status !== "current"} title={message.title} detail={message.detail} /> : null}

      {packet && result?.status !== "empty" && result?.status !== "unavailable" ? (
        <section aria-label="Product Map offerings" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packet.items.map((item) => (
            <article className="rounded-company border border-base-300 bg-base-100 p-4" key={item.offeringId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-lg font-black text-company-ink">{item.paperclipProjectName}</h2><p className="mt-1 text-sm text-company-muted">Lifecycle: {item.lifecycleStage}</p></div>
                <span className={`badge ${itemTone(item)} badge-outline font-black`}>{item.readiness.status}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs font-black uppercase text-company-muted">Source SHA</dt><dd className="mt-1 break-all font-mono font-bold text-company-ink">{item.sourceControl.sourceSha ?? "Unknown"}</dd></div><div><dt className="text-xs font-black uppercase text-company-muted">Deployed SHA</dt><dd className="mt-1 break-all font-mono font-bold text-company-ink">{item.sourceControl.deployedSha ?? "Unknown"}</dd></div></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Alignment / conflict</dt><dd className="mt-1 text-company-ink">{item.sourceControl.versionAlignment} / {item.conflictState}</dd></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Mapped owner surface</dt><dd className="mt-1 text-company-ink">{item.paperclipProjectName}</dd></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Evidence / open blockers</dt><dd className="mt-1 text-company-ink">{item.readiness.evidenceState} / {item.aggregates.issues.byStatus.blocked ?? 0}</dd></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Next evidence</dt><dd className="mt-1 leading-6 text-company-ink">{item.readiness.nextGate ?? "No next gate was provided."}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      ) : null}
    </Shell>
  );
}
