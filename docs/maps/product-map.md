# Product Map

Last updated: 2026-07-28

## Purpose

Use this map when someone needs one readable place to answer:

- can I use this release now;
- what exactly works;
- what is unverified;
- what happens next;
- which source is authoritative when Roost, Soar, Paperclip, or production disagree.

Roost is the owner-facing product map surface. Paperclip remains the live
execution and evidence gate. Soar and Roost repositories remain the source of
truth for product intent, architecture, journeys, release contracts, and
deployment truth.

The canonical UI for this map lives in the authenticated React shell at
`/areas?area=00-ogolny&view=product-map`. It reads only Roost's authenticated
`GET /v1/product-map/projection` read model. The browser never contacts
Paperclip, localhost, or the projection ingress path.

## Read-Model Presentation Contract

The view renders each accepted projection offering with its lifecycle stage,
source/deployed SHA, version alignment, readiness/evidence status, open issue
count, next gate, and conflict state. The accepted V1 packet does not include a
person-level owner field; the UI therefore identifies the mapped Paperclip
project and does not invent an owner.

- `current` may be presented as current only when the source is available and
  no stale or conflict flag is set.
- `stale` is labelled last-known-good evidence and cannot promote readiness.
- `conflict`, `empty`, and `unavailable` remain explicit recovery states.
- `NO-GO`, conflict, and `zeroGapButNoGo` always receive the negative visual
  state; a zero gap count never overrides a negative decision.

The future live-projection release is protected by
`docs/operations/product-map-protected-release-preflight.md`. The existence of
the local UI or the accepted Paperclip source contract does not authorize a
push, deploy, restart, or production-readiness claim.

The lifecycle-procedure publication is governed by
`docs/architecture/lifecycle-procedure-publication-contract.md`. Product Map
reuses the Company OS `Procedure`/`ProcedureStep` definition for
`PROC-SH-APPLICATION-LIFECYCLE` v1.0 and composes it with a strict Paperclip
execution-state projection. Packet schema `2.0` replaces arbitrary packet
acceptance; retained v1 packets cannot be promoted as current. The shared public
state vocabulary is `current`, `stale`, `conflict`, `source_only`, and
`unavailable`.

## Authority Rules

- Never merge local HEAD, origin/main, and deployed SHA into one truth.
- Show source SHA, deployed SHA, and freshness boundary separately.
- A healthy public endpoint does not imply authenticated journey readiness or
  commercial readiness.
- Stale projections cannot promote a `NO-GO` or `conditional` verdict to green.
- If sources disagree, display the conflict and keep the stricter verdict.

## Source / Authority Matrix

| Surface | Authority docs | Observed source SHA | Deployed SHA | Readiness verdict | Freshness boundary | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Roost product / release | `docs/product/overview.md`, `docs/releases/roost-v1-0-sale-readiness-contract.md`, `docs/architecture/architecture-source-of-truth.md`, `docs/architecture/traceability-matrix.md` | `cfb5390c` on `main`, observed before this map packet; map revision is the commit containing this file | `070b150f5477d701d462485aad8b91450d0c3d71` | `conditional_guided_sale_ready` | Snapshot observed 2026-07-25; deployed truth is separate and older than the observed local source | Roost product owner / release owner |
| Soar product / release | `docs/product/overview.md`, `docs/product/known-limits.md`, `docs/planning/soar-v1-sale-readiness-contract.md` | `d3d163d83` on `main` | `9d1801d9b023211d4446629aac7bd58def70322d` | `NO-GO` | Snapshot observed 2026-07-25; production build-info and local HEAD are distinct from the release contract | Soar product owner |
| Paperclip control plane | `docs/architecture.md`, `docs/product/capability-map.md`, `docs/status/app-completion-index.md`, `docs/status/project-truth-index.md` | `ae50a1d0` on `codex/rolling-work-queue` | `n/a - local control plane only` | `operational truth only` | Snapshot observed 2026-07-25; heartbeat and company-situation data require their own current timestamps | Softwarehouse control-plane owner |

## Readability View

```text
Roost Product Map
+- Roost release contract
|  +- owner use: yes
|  +- guided pilot: yes
|  +- self-serve: no
|  `- commercial / GA: no
+- Soar release contract
|  +- owner use: bounded internal verification only
|  +- guided pilot: no
|  +- self-serve: no
|  `- commercial / GA: no
`- Paperclip control plane
   +- owner use: yes, for supervised execution and evidence
   +- guided pilot: not a sales posture
   +- self-serve: not applicable
   `- commercial / GA: no
```

## What Each Lane Means

### Roost

Roost v1.0 is the guided owner-operated sale/pilot candidate. It supports a
single workspace, manual onboarding, supervised or read-only agent access,
governed knowledge-plane reads, and manual deployment/smoke procedures.

Do not label Roost as self-serve SaaS, hosted Paperclip V1, or general
availability.

### Soar

Soar v1.0 remains `NO-GO` until the exact candidate satisfies the approval
and acceptance path recorded in its sale-readiness contract. Public health
checks alone do not change that verdict.

### Paperclip

Paperclip is the execution and orientation layer. It is the live source for
issues, runs, approvals, budgets, blockers, and evidence gates. It is not a
sellable product release in this map.

## Thin Vertical Slice Plan

1. Keep the Roost map as the owner-facing aggregation point.
2. Pull release truth from the repo contracts listed in the matrix.
3. Pull live execution truth from Paperclip issue state and company-situation
   projection.
4. Render the same facts in both graph form and table/list form.
5. Keep stale or conflicting data visible instead of normalizing it away.
6. Add coverage for stale data, SHA mismatch, zero-gap-but-no-go, missing
   evidence, and supersession before treating the projection as stable.
7. Pass the protected release preflight for one exact candidate before
   production promotion or live acceptance.

## Release State

- Paperclip source contract: accepted at commit
  `1f8950aa818c2762a1694cae42bf35f9ab7984ca`; strict-3200 runtime acceptance
  remains protected.
- Roost deployed source: `070b150f5477d701d462485aad8b91450d0c3d71`
  as observed from public health on 2026-07-28.
- Roost local source: ahead of deployed/live `origin/main`; no exact Product
  Map release candidate is selected.
- Release verdict: `NO-GO` until the candidate, independent acceptance,
  capacity, rollback image, owner binding, deployment, smoke, and monitoring
  gates in the protected preflight all pass.

## Conflict Handling

When Roost, Soar, Paperclip, or production disagree:

- show all observed SHAs and timestamps;
- mark the newest verified source explicitly;
- keep the stricter readiness verdict;
- label projections as projections, not source truth;
- route unresolved conflicts back to the owning product/release lane.

## Use This Map When

- choosing whether a release can be used now;
- comparing owner-use, guided-pilot, self-serve, and commercial readiness;
- checking whether a claim is backed by the exact source SHA or only by a
  stale projection;
- deciding whether the next action is product work, evidence work, or a
  blocker handoff.
- opening the versioned owner-facing UI when the map must be reviewed without
  collapsing source truth, deployed truth, or freshness boundaries.
