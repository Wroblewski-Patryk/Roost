import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { Shell } from "../../layout/shell";

type ProductMapSurface = {
  surface: string;
  authorityDocs: string[];
  observedSourceSha: string;
  deployedSha: string;
  readinessVerdict: string;
  freshnessBoundary: string;
  owner: string;
};

const mapSurfaces: ProductMapSurface[] = [
  {
    surface: "Roost product / release",
    authorityDocs: [
      "docs/product/overview.md",
      "docs/releases/roost-v1-0-sale-readiness-contract.md",
      "docs/architecture/architecture-source-of-truth.md",
      "docs/architecture/traceability-matrix.md"
    ],
    observedSourceSha: "cfb5390c",
    deployedSha: "070b150f5477d701d462485aad8b91450d0c3d71",
    readinessVerdict: "conditional_guided_sale_ready",
    freshnessBoundary: "Snapshot observed 2026-07-25; deployed truth is separate and older than the observed local source.",
    owner: "Roost product owner / release owner"
  },
  {
    surface: "Soar product / release",
    authorityDocs: [
      "docs/product/overview.md",
      "docs/product/known-limits.md",
      "docs/planning/soar-v1-sale-readiness-contract.md"
    ],
    observedSourceSha: "d3d163d83",
    deployedSha: "9d1801d9b023211d4446629aac7bd58def70322d",
    readinessVerdict: "NO-GO",
    freshnessBoundary: "Snapshot observed 2026-07-25; production build-info and local HEAD are distinct from the release contract.",
    owner: "Soar product owner"
  },
  {
    surface: "Paperclip control plane",
    authorityDocs: [
      "docs/architecture.md",
      "docs/product/capability-map.md",
      "docs/status/app-completion-index.md",
      "docs/status/project-truth-index.md"
    ],
    observedSourceSha: "ae50a1d0",
    deployedSha: "n/a - local control plane only",
    readinessVerdict: "operational truth only",
    freshnessBoundary: "Snapshot observed 2026-07-25; heartbeat and company-situation data require their own current timestamps.",
    owner: "Softwarehouse control-plane owner"
  }
];

function verdictClass(verdict: string) {
  if (verdict === "NO-GO") {
    return "badge-error";
  }

  if (verdict === "operational truth only") {
    return "badge-info";
  }

  return "badge-success";
}

function truthList(items: string[]) {
  return items.map((item) => (
    <span className="rounded-full border border-base-300 bg-base-200/55 px-3 py-1 text-xs font-bold text-company-muted" key={item}>
      {item}
    </span>
  ));
}

export function ProductMapRoute() {
  const snapshotDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date("2026-07-25T00:00:00Z"));

  return (
    <Shell activeArea="00-ogolny">
      <section className="grid gap-5 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="badge badge-primary badge-outline font-black uppercase tracking-[0.12em]">Versioned owner-facing map</span>
            <span className="badge badge-outline font-black uppercase tracking-[0.12em]">{snapshotDate}</span>
          </div>
          <div>
            <p className="text-sm font-black uppercase text-primary">00 General</p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">Roost Product Map</h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">
              One readable place to compare source truth, deployed truth, and freshness before deciding whether Roost, Soar, or Paperclip should be treated as usable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-arrow-left" variant="outline">
              Back to 00 General
            </CcButton>
            <CcButton href="/dashboard" iconLeft="ph-house" variant="ghost">
              Open dashboard
            </CcButton>
          </div>
        </div>

        <aside className="grid gap-3 rounded-company border border-base-300 bg-base-200/55 p-4">
          <div>
            <p className="text-xs font-black uppercase text-company-muted">Snapshot version</p>
            <p className="mt-1 text-sm text-company-muted">Observed source and deployed truth stay separate on purpose.</p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-company border border-base-300 bg-base-100 p-3">
              <p className="text-xs font-black uppercase text-company-muted">Observed source SHA</p>
              <p className="mt-1 font-mono text-sm font-bold text-company-ink">cfb5390c</p>
            </div>
            <div className="rounded-company border border-base-300 bg-base-100 p-3">
              <p className="text-xs font-black uppercase text-company-muted">Deployed SHA</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-company-ink">070b150f5477d701d462485aad8b91450d0c3d71</p>
            </div>
            <div className="rounded-company border border-base-300 bg-base-100 p-3">
              <p className="text-xs font-black uppercase text-company-muted">Readiness verdict</p>
              <span className="mt-2 badge badge-success badge-outline font-black">conditional_guided_sale_ready</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {mapSurfaces.map((surface) => (
          <article className="rounded-company border border-base-300 bg-base-100 p-4" key={surface.surface}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-company-ink">{surface.surface}</h2>
                <p className="mt-1 text-sm text-company-muted">{surface.owner}</p>
              </div>
              <span className={`badge ${verdictClass(surface.readinessVerdict)} badge-outline font-black`}>{surface.readinessVerdict}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-black uppercase text-company-muted">Authority docs</dt>
                <dd className="mt-2 flex flex-wrap gap-2">{truthList(surface.authorityDocs)}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-black uppercase text-company-muted">Observed source SHA</dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-company-ink">{surface.observedSourceSha}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase text-company-muted">Deployed SHA</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-bold text-company-ink">{surface.deployedSha}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-company-muted">Freshness boundary</dt>
                <dd className="mt-1 leading-6 text-company-ink">{surface.freshnessBoundary}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-company-ink">Readability view</h2>
              <p className="mt-1 text-sm text-company-muted">The map stays honest by showing source SHA, deployed SHA, and status separately.</p>
            </div>
            <span className="badge badge-outline">text</span>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-company border border-base-300 bg-base-200/55 p-4 text-sm leading-6 text-company-ink">
{`Roost Product Map
+- Roost release contract
|  +- owner use: yes
|  +- guided pilot: yes
|  +- self-serve: no
|  \`- commercial / GA: no
+- Soar release contract
|  +- owner use: bounded internal verification only
|  +- guided pilot: no
|  +- self-serve: no
|  \`- commercial / GA: no
\`- Paperclip control plane
   +- owner use: yes, for supervised execution and evidence
   +- guided pilot: not a sales posture
   +- self-serve: not applicable
   \`- commercial / GA: no`}
          </pre>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-xl font-black text-company-ink">What each lane means</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
              <p className="text-sm font-black uppercase text-primary">Roost</p>
              <p className="mt-2 text-sm leading-6 text-company-muted">
                Roost v1.0 is the guided owner-operated sale/pilot candidate. It supports a single workspace, manual onboarding, supervised or read-only agent access, governed knowledge-plane reads, and manual deployment and smoke procedures.
              </p>
            </div>
            <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
              <p className="text-sm font-black uppercase text-primary">Soar</p>
              <p className="mt-2 text-sm leading-6 text-company-muted">
                Soar v1.0 remains NO-GO until the exact candidate satisfies the approval and acceptance path recorded in its sale-readiness contract.
              </p>
            </div>
            <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
              <p className="text-sm font-black uppercase text-primary">Paperclip</p>
              <p className="mt-2 text-sm leading-6 text-company-muted">
                Paperclip is the execution and orientation layer. It is the live source for issues, runs, approvals, budgets, blockers, and evidence gates.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-xl font-black text-company-ink">Conflict handling</h2>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-company-muted">
            <p>When Roost, Soar, Paperclip, or production disagree, show all observed SHAs and timestamps.</p>
            <p>Mark the newest verified source explicitly and keep the stricter readiness verdict.</p>
            <p>Label projections as projections, not source truth.</p>
            <p>Route unresolved conflicts back to the owning product or release lane.</p>
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-5">
          <h2 className="text-xl font-black text-company-ink">Use this map when</h2>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-company-muted">
            <p>Choosing whether a release can be used now.</p>
            <p>Comparing owner-use, guided-pilot, self-serve, and commercial readiness.</p>
            <p>Checking whether a claim is backed by the exact source SHA or only by a stale projection.</p>
            <p>Deciding whether the next action is product work, evidence work, or a blocker handoff.</p>
          </div>
        </article>
      </section>

      <CcNotice
        detail="The product map stays versioned on purpose: the UI mirrors the source docs and keeps conflicts visible instead of normalizing them away."
        title="Versioned owner-facing truth"
        tone="info"
      />
    </Shell>
  );
}
