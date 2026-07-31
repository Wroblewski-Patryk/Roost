import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import {
  gateTone,
  itemTone,
  parseProductMapReadResponse,
  projectionMessage,
  projectionTone,
  type LifecycleProcedureReadModel,
  type ProductMapProjection,
  type ProductMapReadResponse
} from "./product-map-projection";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; response: ProductMapReadResponse };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
}

function ProjectionSummary({ packet }: { packet: ProductMapProjection }) {
  return (
    <aside className="grid min-w-0 gap-3 rounded-company border border-base-300 bg-base-200/55 p-4">
      <div>
        <p className="text-xs font-black uppercase text-company-muted">Execution snapshot</p>
        <p className="mt-1 text-sm leading-6 text-company-muted">
          Schema {packet.schemaVersion}; observed {formatDate(packet.observedAt)}.
        </p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-company border border-base-300 bg-base-100 p-3">
          <dt className="text-xs font-black uppercase text-company-muted">Source</dt>
          <dd className="mt-1 font-bold text-company-ink">{packet.sourceState}</dd>
        </div>
        <div className="rounded-company border border-base-300 bg-base-100 p-3">
          <dt className="text-xs font-black uppercase text-company-muted">Conflict</dt>
          <dd className="mt-1 break-words font-bold text-company-ink">{packet.conflictState}</dd>
        </div>
      </dl>
    </aside>
  );
}

function ProcedureOverview({ procedure }: { procedure: LifecycleProcedureReadModel }) {
  return (
    <section aria-labelledby="lifecycle-procedure-title" className="grid min-w-0 gap-5 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-primary">Published procedure</p>
          <h2 className="mt-2 text-2xl font-black text-company-ink" id="lifecycle-procedure-title">{procedure.identity.title}</h2>
          <p className="mt-2 break-all font-mono text-sm font-bold text-company-muted">
            {procedure.identity.procedureId} · v{procedure.identity.procedureVersion}
          </p>
          <p className="mt-4 leading-7 text-company-muted">{procedure.definition.purpose}</p>
        </div>
        <dl className="grid gap-3 rounded-company border border-base-300 bg-base-200/45 p-4 text-sm">
          <div><dt className="text-xs font-black uppercase text-company-muted">Lifecycle status</dt><dd className="mt-1 font-bold text-company-ink">{procedure.identity.lifecycleStatus}</dd></div>
          <div><dt className="text-xs font-black uppercase text-company-muted">Accountable owner</dt><dd className="mt-1 font-bold text-company-ink">{procedure.definition.accountableOwner.roleName}</dd></div>
          <div><dt className="text-xs font-black uppercase text-company-muted">Evidence freshness</dt><dd className="mt-1 font-bold text-company-ink">{procedure.provenance.freshness}</dd></div>
        </dl>
      </div>

      <dl className="grid gap-4 text-sm md:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs font-black uppercase text-company-muted">Scope</dt><dd className="mt-1 leading-6 text-company-ink">{procedure.definition.scope}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-black uppercase text-company-muted">Trigger</dt><dd className="mt-1 leading-6 text-company-ink">{procedure.definition.trigger}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-black uppercase text-company-muted">Primary output</dt><dd className="mt-1 leading-6 text-company-ink">{procedure.definition.primaryOutput}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-black uppercase text-company-muted">Participating roles</dt><dd className="mt-1 leading-6 text-company-ink">{procedure.definition.participatingRoles.join(", ")}</dd></div>
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-black text-company-ink">Entry criteria</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-company-muted">
            {procedure.definition.entryCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-black text-company-ink">Exit criteria</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-company-muted">
            {procedure.definition.exitCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ProcedureAuthority({ procedure }: { procedure: LifecycleProcedureReadModel }) {
  return (
    <section aria-labelledby="lifecycle-authority-title" className="grid min-w-0 gap-4 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase text-primary">Authority and provenance</p>
        <h2 className="mt-1 text-xl font-black text-company-ink" id="lifecycle-authority-title">Read-only by design</h2>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="text-xs font-black uppercase text-company-muted">Definition</dt><dd className="mt-1 font-bold text-company-ink">Roost</dd></div>
        <div><dt className="text-xs font-black uppercase text-company-muted">Execution and evidence</dt><dd className="mt-1 font-bold text-company-ink">Paperclip</dd></div>
        <div><dt className="text-xs font-black uppercase text-company-muted">Can mutate Paperclip</dt><dd className="mt-1 font-bold text-company-ink">{procedure.authority.canMutatePaperclip ? "Yes" : "No"}</dd></div>
        <div><dt className="text-xs font-black uppercase text-company-muted">Can promote readiness</dt><dd className="mt-1 font-bold text-company-ink">{procedure.authority.canPromoteReadiness ? "Yes" : "No"}</dd></div>
      </dl>
      <dl className="grid min-w-0 gap-4 text-sm md:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-black uppercase text-company-muted">Roost definition source</dt>
          <dd className="mt-1 break-all font-mono leading-6 text-company-ink">{procedure.provenance.roostSource.path}</dd>
          <dd className="break-all font-mono text-company-muted">{procedure.provenance.roostSource.sourceSha}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-black uppercase text-company-muted">Operating contract source</dt>
          <dd className="mt-1 break-all font-mono leading-6 text-company-ink">{procedure.provenance.operatingContractSource.path}</dd>
          <dd className="break-all font-mono text-company-muted">{procedure.provenance.operatingContractSource.commitSha}</dd>
        </div>
      </dl>
      <p className="text-sm text-company-muted">
        Observed {formatDate(procedure.provenance.observedAt)} · verified {formatDate(procedure.provenance.verifiedAt)}
      </p>
      {procedure.audit ? (
        <details className="rounded-company border border-base-300 bg-base-200/45 p-3">
          <summary className="cursor-pointer rounded font-bold text-company-ink outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Inspect audit correlation
          </summary>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-company-muted">Correlation ID</dt><dd className="break-all font-mono">{procedure.audit.correlationId}</dd></div>
            <div><dt className="text-company-muted">Snapshot</dt><dd className="break-all font-mono">{procedure.audit.sourceSnapshotId}</dd></div>
            <div><dt className="text-company-muted">Digest prefix</dt><dd className="font-mono">{procedure.audit.packetDigestPrefix}</dd></div>
            <div><dt className="text-company-muted">Received</dt><dd>{formatDate(procedure.audit.receivedAt)}</dd></div>
          </dl>
        </details>
      ) : null}
    </section>
  );
}

function ProcedureStages({ procedure }: { procedure: LifecycleProcedureReadModel }) {
  const gates = new Map(procedure.gates.map((gate) => [gate.stageKey, gate]));
  return (
    <section aria-labelledby="lifecycle-stages-title" className="grid gap-4">
      <div>
        <p className="text-xs font-black uppercase text-primary">Governed sequence</p>
        <h2 className="mt-1 text-2xl font-black text-company-ink" id="lifecycle-stages-title">18 lifecycle stages</h2>
        <p className="mt-2 text-sm leading-6 text-company-muted">Open a stage to inspect its required output, exit gate, recovery path, and live evidence state.</p>
      </div>
      <ol className="grid gap-3">
        {procedure.definition.stages.map((stage) => {
          const gate = gates.get(stage.stageKey);
          return (
            <li key={stage.stageKey}>
              <details className="group rounded-company border border-base-300 bg-base-100 p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <span className="min-w-0">
                    <span className="text-xs font-black uppercase text-company-muted">Stage {stage.order}</span>
                    <span className="mt-1 block text-lg font-black text-company-ink">{stage.title}</span>
                  </span>
                  <span className={`badge badge-outline shrink-0 font-black ${gate ? gateTone(gate.status) : "badge-warning"}`}>
                    {gate?.status ?? "no live evidence"}
                  </span>
                </summary>
                <div className="mt-4 grid gap-4 border-t border-base-300 pt-4 text-sm md:grid-cols-2">
                  <div><h3 className="font-black text-company-ink">Accountable source owner</h3><p className="mt-1 leading-6 text-company-muted">{stage.accountableSourceOwner}</p></div>
                  <div><h3 className="font-black text-company-ink">Required output</h3><p className="mt-1 leading-6 text-company-muted">{stage.requiredOutput}</p></div>
                  <div><h3 className="font-black text-company-ink">Exit gate</h3><p className="mt-1 leading-6 text-company-muted">{stage.exitGate}</p></div>
                  <div><h3 className="font-black text-company-ink">Recovery</h3><p className="mt-1 leading-6 text-company-muted">{stage.rollbackInstruction ?? "No recovery instruction recorded."}</p></div>
                </div>
                <div className="mt-4 rounded-company border border-base-300 bg-base-200/45 p-3 text-sm">
                  {gate ? (
                    <>
                      <p className="font-black text-company-ink">{gate.ownerRole} · {gate.status}</p>
                      <p className="mt-1 leading-6 text-company-muted">{gate.summary}</p>
                      <p className="mt-1 text-company-muted">Verified {formatDate(gate.verifiedAt)} · {gate.evidenceRefs.length} evidence reference(s)</p>
                    </>
                  ) : <p className="font-bold text-company-muted">No live Paperclip execution evidence is available for this stage.</p>}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ProcedureRelations({ procedure }: { procedure: LifecycleProcedureReadModel }) {
  return (
    <section aria-labelledby="lifecycle-relations-title" className="grid gap-4">
      <div>
        <p className="text-xs font-black uppercase text-primary">Linked owner context</p>
        <h2 className="mt-1 text-2xl font-black text-company-ink" id="lifecycle-relations-title">Offerings, decisions, KPIs, and evidence</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black text-company-ink">Offerings and releases</h3>
          {procedure.relations.offerings.length ? (
            <ul className="mt-3 grid gap-3">
              {procedure.relations.offerings.map((offering) => {
                const release = procedure.relations.releases.find((candidate) => candidate.offeringId === offering.offeringId);
                return (
                  <li className="rounded-company border border-base-300 bg-base-200/45 p-3" key={offering.offeringId}>
                    <p className="font-black text-company-ink">{offering.name}</p>
                    <p className="mt-1 text-sm text-company-muted">{offering.lifecycleStage} · {offering.readiness}</p>
                    {release ? <p className="mt-1 break-all font-mono text-xs text-company-muted">{release.sourceSha ?? "source unknown"} → {release.deployedSha ?? "deployed unknown"}</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-sm text-company-muted">No linked offering or release evidence is available.</p>}
        </article>
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black text-company-ink">Decisions and KPIs</h3>
          <p className="mt-2 text-sm text-company-muted">{procedure.relations.decisions.length} decision(s) · {procedure.relations.kpis.length} KPI(s)</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {procedure.relations.decisions.slice(0, 5).map((decision) => <li className="rounded-company border border-base-300 p-3" key={decision.id}><strong>{decision.chosenOption}</strong><p className="mt-1 text-company-muted">{decision.context}</p></li>)}
            {procedure.relations.kpis.slice(0, 5).map((kpi) => <li className="rounded-company border border-base-300 p-3" key={kpi.id}><strong>{kpi.name}</strong><p className="mt-1 text-company-muted">{kpi.status} · {kpi.currentValue ?? "not measured"} {kpi.unit ?? ""}</p></li>)}
          </ul>
        </article>
      </div>
      <div className="rounded-company border border-base-300 bg-base-100 p-4">
        <h3 className="font-black text-company-ink">Safe Paperclip evidence links</h3>
        {procedure.relations.evidence.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {procedure.relations.evidence.map((evidence) => (
              <li key={`${evidence.kind}:${evidence.href}`}>
                <CcButton href={evidence.href} variant="outline" iconRight="ph-arrow-square-out">
                  {evidence.label}
                </CcButton>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-company-muted">No allowlisted Paperclip evidence link is available.</p>}
      </div>
    </section>
  );
}

export function ProductMapRoute() {
  const { t } = useLanguage();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api<unknown>("/v1/product-map/projection")
      .then((response) => parseProductMapReadResponse(response))
      .then((response) => { if (!cancelled) setState({ status: "ready", response }); })
      .catch((error: unknown) => { if (!cancelled) setState({ status: "error", message: userErrorMessage(error, t) }); });
    return () => { cancelled = true; };
  }, [reloadToken, t]);

  const result = state.status === "ready" ? state.response.data : null;
  const packet = result?.packet ?? null;
  const procedure = result?.procedure ?? null;
  const message = result ? projectionMessage(result.status, packet) : null;

  return (
    <Shell activeArea="00-ogolny">
      <section className="grid gap-5 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">00 General</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">Roost Product Map</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">
              Inspect the governed application lifecycle, its live evidence, authority boundary, and release relations without granting Roost control-plane authority.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-arrow-left" variant="outline">Back to 00 General</CcButton>
            <CcButton href="/dashboard" iconLeft="ph-house" variant="ghost">Open dashboard</CcButton>
          </div>
        </div>
        {packet ? <ProjectionSummary packet={packet} /> : (
          <aside className="rounded-company border border-base-300 bg-base-200/55 p-4 text-sm leading-6 text-company-muted">
            The procedure can remain available without a live execution snapshot. Readiness stays unpromoted until current evidence arrives.
          </aside>
        )}
      </section>

      {state.status === "loading" ? <CcNotice tone="loading" live title="Loading lifecycle procedure" detail="Reading the authenticated Roost definition and Paperclip execution evidence." /> : null}
      {state.status === "error" ? (
        <CcNotice
          action={<CcButton onClick={() => setReloadToken((value) => value + 1)} variant="outline">Retry</CcButton>}
          detail={state.message}
          live
          title="Lifecycle publication could not be loaded"
          tone="error"
        />
      ) : null}
      {result && message ? <CcNotice tone={projectionTone(result.status, packet)} live={result.status !== "current"} title={message.title} detail={message.detail} /> : null}

      {procedure?.conflicts.length ? (
        <section aria-labelledby="lifecycle-conflicts-title" className="rounded-company border border-error/35 bg-error/10 p-4">
          <h2 className="font-black text-company-ink" id="lifecycle-conflicts-title">Conflicts requiring review</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {procedure.conflicts.map((entry) => <li key={`${entry.code}:${entry.summary}`}><strong>{entry.code}</strong>: {entry.summary}</li>)}
          </ul>
        </section>
      ) : null}

      {procedure ? (
        <>
          <ProcedureOverview procedure={procedure} />
          <ProcedureAuthority procedure={procedure} />
          <ProcedureStages procedure={procedure} />
          <ProcedureRelations procedure={procedure} />
        </>
      ) : result ? (
        <CcNotice
          action={<CcButton onClick={() => setReloadToken((value) => value + 1)} variant="outline">Retry definition read</CcButton>}
          detail="Roost cannot safely publish lifecycle identity, stages, or evidence until the local definition is restored."
          title="Lifecycle definition unavailable"
          tone="error"
        />
      ) : null}

      {packet && result ? (
        <section aria-label="Product Map offering transport facts" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packet.items.map((item) => (
            <article className="min-w-0 rounded-company border border-base-300 bg-base-100 p-4" key={item.offeringId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><h2 className="break-words text-lg font-black text-company-ink">{item.paperclipProjectName}</h2><p className="mt-1 text-sm text-company-muted">Lifecycle: {item.lifecycleStage}</p></div>
                <span className={`badge badge-outline shrink-0 font-black ${itemTone(result.status, item)}`}>{item.readiness.status}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-black uppercase text-company-muted">Source SHA</dt><dd className="mt-1 break-all font-mono font-bold text-company-ink">{item.sourceControl.sourceSha ?? "Unknown"}</dd></div><div><dt className="text-xs font-black uppercase text-company-muted">Deployed SHA</dt><dd className="mt-1 break-all font-mono font-bold text-company-ink">{item.sourceControl.deployedSha ?? "Unknown"}</dd></div></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Alignment / conflict</dt><dd className="mt-1 break-words text-company-ink">{item.sourceControl.versionAlignment} / {item.conflictState}</dd></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Evidence / open blockers</dt><dd className="mt-1 text-company-ink">{item.readiness.evidenceState} / {item.aggregates.issues.byStatus.blocked}</dd></div>
                <div><dt className="text-xs font-black uppercase text-company-muted">Next evidence</dt><dd className="mt-1 leading-6 text-company-ink">{item.readiness.nextGate ?? "No next gate was provided."}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      ) : null}
    </Shell>
  );
}
