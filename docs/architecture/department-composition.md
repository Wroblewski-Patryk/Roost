# Department composition: bounded G16b contract

Last updated: 2026-10-11

## Boundary

G16b changes the presentation and shared-view availability of one existing
workspace department. It does not create a general hierarchy editor, assign
workforce or records to a new department, merge `OperatingArea`, or move
provider containers. The primary workspace owner is the only actor allowed to
preview and confirm a composition change. An API key, delegated member or
task-scoped human cannot confirm it.

The department ID and key are stable. Old URLs remain routable. `00 General`
is a company-wide projection and cannot be composed through this command.
The twelve named departments are an installation template, not a permanent
requirement for later organization design.

## Read and write contract

- `GET /v1/departments` returns views attached in the department's persisted
  `linked_views` and enabled in `department_view_availability`. The latter
  also contains possible shared views that are not yet attached. A fresh
  workspace initializes definitions and availability once under its row lock.
  Established workspaces are never reconciled against defaults on read.
  `availableViews[].availableInDepartments` describes eligibility in the
  availability table; `departments[].views` describes actual attachment.
- `POST /v1/departments/:id/preview` validates the complete proposed state,
  displays before/after navigation, attached/detached views and identities of
  existing responsibility, workforce and provider bindings. It returns a
  short-lived HMAC confirmation token bound to workspace, owner, department,
  draft and a hash of the current state.
- `POST /v1/departments/:id/actions/apply` checks the token and state inside a
  serializable transaction. It increments `composition_version` with a
  compare-and-set, writes department presentation and view availability, and
  records an audit event. Replays, stale previews and concurrent changes are
  refused.
- The legacy `PATCH /v1/departments/:id` cannot bypass preview. A legacy
  `POST /v1/departments` can create an empty identity for the primary owner;
  attaching views through that path is refused. The owner console offers
  composition only for existing departments in this gate.

The command refuses removal of a currently attached canonical steward view,
unsupported cross-department view attachments and any proposed configuration
without a view. Shared contextual views retain one canonical steward and
reuse the existing scoped route adapters. No record, relation, workforce,
permission, task scope, `OperatingArea` or provider mapping is mutated.

The shell reads linked shared views from the catalog. It keeps the selected
department active while a contextual view is shown; `00 General` hides
noncanonical shared shortcuts. A direct General view URL renders without a
department filter so its company-wide projection remains intact.

## Local evidence

- The additive migration was applied to a disposable predecessor-shaped
  database containing synthetic departments, relations, definitions,
  availability rows and provider mappings; pre/post counts and identity
  fingerprints matched.
- A native API test on an isolated PostgreSQL workspace with existing
  relations, ownership, workforce and provider mapping passed 1/1 after the
  final attachment-source correction. It exercised attach, detach, preview,
  apply, readback, stale and replay refusal, legacy bypass refusal, and
  absence of read-time reseeding. The fresh catalog has 13 departments, 51
  definitions and 183 availability rows; an availability row alone does not
  attach a shared view.
- Browser tests exercised Polish and English at narrow and wide widths,
  passing 4/4 preview/confirm/readback cases at 390/1440 CSS pixels. They
  include contextual navigation, company-wide General Goals and Projects,
  and sidebar refresh. These are synthetic fixtures; production composition
  was not changed.
- `npm run validate`, `npm run codex:check`, TypeScript typecheck and
  `git diff --check` passed. Independent Security review found no concrete
  authorization or data-loss blocker after the final General and selection
  repairs. A broad API run was stopped after earlier failures in the
  pre-correction G16b fixture and two unrelated task-role/clarification
  cases; it is not a full-suite pass.

## Release preflight

Before push, `main`, both public health endpoints and the running backend
reported `8e2ff3d6d45a7b6d8b49faab20cd42addd184ba2`. PostgreSQL was
healthy on the retained named volume. Its latest finished migration was
`20261011210000_g16a_scoped_human_task_access`, with no rollback. Read-only
counts were 13 departments, 2,799 organizational relations, 51 view
definitions, 184 availability rows and 26 provider mappings. Every persisted
attached view had an enabled availability row. The VPS had 9.3 GB free. The
last documented isolated restore of an encrypted recovery copy was on
2026-10-10; no fresh backup is claimed for this gate.

Deployed read-back is recorded only after deployment.
