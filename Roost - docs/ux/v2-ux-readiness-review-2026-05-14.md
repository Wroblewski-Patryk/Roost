# V2 UX Readiness Review

Date: 2026-05-14
Status: GO for V2 visual implementation planning; direct V2 implementation remains gated.

## Decision

CompanyCore may proceed to WEBFOUND-014, the V2 Visual Implementation Plan.
This is a planning gate, not permission to start building the Company City map
or gamification mechanics immediately.

The pre-V2 foundation is now strong enough to define the canonical V2 visual
plan because workspace context, operating areas, relationship visibility,
integration readiness, MCP key clarity, agent tool visibility, and AI-ready
smoke proof are all recorded with local evidence.

## Evidence Reviewed

| Area | Evidence | Gate Result |
| --- | --- | --- |
| Multi-workspace owner context | WEBFOUND-002/003/004 verified workspace list/create/select, token-scoped switching, `/auth/me` workspace readback, and owner-shell switch/create UI. | Pass |
| Operating-area navigation | WEBFOUND-002/003/004 and WEBFOUND-005 verified area inventory, resource-family sidebar counts, drawer behavior, keyboard/focus handling, and active area state. | Pass |
| Relationship model | WEBFOUND-007 documented relationship sources; WEBFOUND-008A verified `GET /v1/relationships/graph`; WEBFOUND-008B verified graph-backed `/relationships`. | Pass |
| Integration readiness | WEBFOUND-009 verified `/settings/integrations` readiness cards for ClickUp, Google Drive, relationship graph, and MCP agents from real state. | Pass |
| MCP key clarity | WEBFOUND-010 verified `/settings/api` previews workspace, risk, scopes, MCP tool exposure, supervised tools, and relationship graph availability before key creation. | Pass |
| Agent tool visibility | WEBFOUND-011 verified `/react-agent-tools` is reachable from the canonical shell and no longer teaches a separate permanent React preview nav taxonomy. | Pass |
| AI/MCP consumption | WEBFOUND-012 verified disposable owner bootstrap, MCP reader/operator profile keys, manifest visibility, HTTP and MCP relationship graph reads, and default guarded-command blocking. | Pass |

## V2 Planning Readiness

WEBFOUND-014 may now define the canonical V2 visual implementation plan for:

- authenticated shell structure across desktop, tablet, and mobile;
- Company City dashboard composition;
- left navigation and workspace/area orientation;
- command brief and status strip;
- relationship, integration, and MCP readiness signals in the shell;
- future gamification signals based only on real status, progress, blockers,
  readiness, and evidence.

## Direct Implementation Gates

Do not start building the Company City map or gamification mechanics until
WEBFOUND-014 records:

- the canonical first viewport for desktop, tablet, and mobile;
- which existing shell parts are reused, replaced, or migrated;
- how React and vanilla route shells converge during implementation;
- which visual assets or generated bitmap references are required;
- the state model for `loading`, `empty`, `error`, `success`, `blocked`, and
  `needs review`;
- accessibility and responsive proof expectations;
- rollback or containment plan for high-risk shell changes.

## Accepted Deferrals

| Deferral | Reason | Reopen Trigger |
| --- | --- | --- |
| Native mobile app | User explicitly deferred mobile app to V2 or later; web responsive behavior remains the current scope. | A separate native mobile mission is selected. |
| Fake operating-model demo data | ACF-PROD-001 rejected fake seed data before V2. Empty containers are acceptable when honestly labeled. | Product requires a demo workspace or real owner import/create flows. |
| Custom editable relationship edge table | WEBFOUND-007/008 selected read-only derived graph first. | A concrete workflow proves a missing relationship cannot be represented by existing models. |
| Gamification mechanics | User wants them in V2, but pre-V2 only allows real readiness/status signals. | WEBFOUND-014 defines evidence-backed gamification primitives. |
| Broad React shell rewrite | WEBFOUND-011 aligned navigation enough for readiness; full shell convergence should be planned before implementation. | WEBFOUND-014 selects a migration slice. |

## Residual Risks

| Risk | Current State | Required Handling In WEBFOUND-014 |
| --- | --- | --- |
| Two shell implementations still exist | Navigation taxonomy is aligned, but vanilla and React shells are not one shared shell component. | Plan a staged convergence path before replacing route surfaces. |
| Company City can become decorative | Foundation evidence exists, but the map could still hide actions behind visual polish. | Require first viewport to answer what matters now, what is blocked, and where to act next. |
| Gamification could reward vanity metrics | No gamification mechanics are implemented yet. | Use only real progress, readiness, blockers, approvals, sync health, and evidence signals. |
| Dense workbenches could lose efficiency | V2 visuals may overtake operational screens. | Keep workbenches quiet, dense, and action-first inside the canonical shell. |

## Canonical V2 UX Assumptions

- V2 starts from the existing owner-grade foundation, not a landing page.
- The first logged-in screen becomes a command map only if it preserves direct
  operational access to workbenches.
- The shell must show active workspace, active area or module, command pressure,
  integration/relationship readiness, and agent/MCP readiness.
- Desktop should use space for map plus command brief; tablet should use a
  deliberate split or compact rail; mobile should lead with action brief and
  selected context rather than a tiny full map.
- Visual delight is allowed only when it improves orientation, urgency,
  confidence, or decision speed.

## WEBFOUND-014 Starting Scope

WEBFOUND-014 should produce the canonical V2 visual implementation plan:

- layout zones for desktop/tablet/mobile;
- component inventory and reuse map;
- required visual assets;
- route migration order;
- proof plan and screenshots required before coding deeper routes;
- explicit non-goals for native mobile, fake data, and broad gamification.
