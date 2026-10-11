# Workspace Human Access

## Worker credential authority

The [Worker credential lifecycle](worker-credential-lifecycle-v1.md) is reserved
to the current primary workspace owner, with current owner membership, a signed
authentication time no more than five minutes old and an exact accepted governed
decision. Additional owners, admins, members, agents and API keys cannot use it.
Human tokens now carry `authTime`; workspace creation/selection preserves its
original value. Legacy tokens without it require another login for this lifecycle.
Ordinary human access remains governed by the current membership below.
The three lifecycle commands are unavailable by default because no synthetic or
production generator, hasher or delivery is configured. Source/synthetic tests
and bounded native PostgreSQL/HTTP qualification pass (v23); real provisioning,
secure delivery/TLS and launch are not qualified.

## Decision

Example Company production uses one canonical workspace. Humans join that
workspace through expiring invitations; public registration and authenticated
creation of additional workspaces are disabled in production unless
`ROOST_ALLOW_WORKSPACE_CREATION=true` is explicitly configured.

## Installation

A new installation creates one owner login and workspace plus twelve departments
and the system `00 General` surface. First login defaults and optional overrides
are documented in [Deployment](../DEPLOYMENT.md). Account settings allow changing
email (with the current password) and password. Bootstrap never updates an
existing account or workspace and provisions no API keys or business records.

## Roles

| Role | Authority |
| --- | --- |
| `owner` | Full workspace authority, owner-role changes, ownership transfer, administrators, integrations and service credentials. |
| `admin` | Workspace identity, integrations, service credentials, invitations for members/viewers, and non-owner member administration. |
| `member` | Read and write company operating records, without workspace security, integration or service-key administration. |
| `viewer` | Read-only access to company operating records. |

Every protected human request resolves the current membership from the token's
workspace and enforces the role from the database. A stale token never carries
durable role authority. Cross-workspace access fails closed.

## G16a task-scoped human access

The primary owner may issue a seven-day, one-time invitation for one email and
one existing, active task in the current workspace. The invitation stores the
task ID, membership role `member`, and a digest of the token. Reissue revokes the
old token; revocation and expiry prevent acceptance. Acceptance creates a
membership bound to that same task and a human workforce profile in one database
transaction. An existing full workspace member cannot accept this invitation as
a scope change. A scoped membership cannot be promoted or have its task scope
cleared; removal revokes its live access. The task and workspace relationship is
enforced by a composite foreign key, while archived tasks are refused at the
API boundary.

The human bearer token carries identity, not a durable scope grant. Each
request reloads the membership and allows a scoped person only the exact task
detail, its reduced review view, and the exact task review command. Both `/v1`
and legacy API aliases use the same deny-by-default boundary. Task listing,
other task IDs, workspace/project/company search and graph, execution history,
owner decisions, grants, member administration and task mutation are denied.
The account profile and logout remain available. The dedicated task page has
no workspace navigation. The login API may select one of the user's existing
memberships by explicit workspace ID; selecting a scoped membership does not
initialize a workspace operating model.

An invitation does not appoint the verifier. The owner must assign the new
human workforce profile as the exact verifier with the required authority,
competencies and current role pin. The existing independent review guard still
checks the distinct agent executor, native result, risk admission, material
version and one-time decision. A forward migration also checks the human's live
task scope in the database review guard. No invitation email is sent; the
owner copies the one-time link and delivers it through a separately chosen
channel. This first slice supports one scoped task per human per workspace.

### G16a local verification

The disposable PostgreSQL HTTP journey passed 2/2: one-time invite/reissue and
acceptance, exact-task read and cross-task/workspace-surface refusal, live
membership revocation, and an independent human review of a distinct agent's
completed result under current risk and procedure evidence. The migration
applied on an empty database and on a populated predecessor schema; existing
Task, membership and invitation values were preserved with null task scopes.
The focused PL/EN browser check submitted an exact-task review command at
390/1440 px (2/2), and the review/navigation model checks passed 3/3.
`npm run validate`, `npm run codex:check`, and diff checks passed. An attempted
all-API diagnostic encountered one ordinary `/auth/me` response-shape mismatch
and one transient browser fixture fetch failure; the shape was repaired and
both cases passed in a focused 2/2 rerun. The all-API suite was not completed
as one green run. Independent Security code review found no remaining confirmed
scope bypass after the invitation race and primary-owner lifecycle repairs.
These are local proofs; a production human invitation is not claimed here.

### G16a deployed read-back

Implementation commit `eee7835791b18d0d514528599f0d9f18b109daf4`
reached `main` and Coolify deployment `xy86mksrewo9hasbnske8m2w` finished.
Both public health endpoints reported `ok` with the exact build. Production
PostgreSQL was healthy on its retained named volume and recorded migration
`20261011210000_g16a_scoped_human_task_access` finished, with both task-scope
foreign keys present and no unfinished migration. A read-only query found no
task-scoped invitation or membership rows. The signed-in owner console showed
the exact-task invite action, the warning that invitation alone does not appoint
the verifier, and the one-email invitation form for the selected task. The form
was closed without submission. Unauthenticated account and task-review reads
returned 401. This is deployed read-only proof of the owner entry point and
database schema, not a production acceptance, scoped login or human review.

## Invitations

- Administrators invite `member` or `viewer`; owners may also invite `admin`.
- An invitation is scoped to one workspace and email address, expires after
  seven days, and may be revoked or reissued.
- Only a SHA-256 digest is stored. The raw invitation token is shown once.
- Existing users confirm their password; new users create a password with at
  least 12 characters. Acceptance creates the membership and human workforce
  record without creating another workspace.
- Membership, role, invitation and ownership changes write audit evidence.

## Ownership Safety

The primary owner is recorded by `workspaces.owner_user_id`. That member cannot
be removed or demoted. Ownership transfer promotes the selected member to
`owner`, changes the previous primary owner to `admin`, and updates the
workspace atomically. A user cannot remove themselves or change their own role
through the member editor.

Removing a non-owner member from either Workspace settings or the linked
People / Agents directory atomically removes the workspace membership and its
`source=user` workforce profile. It does not delete the person's global Roost
login, so another workspace membership or a later invitation remains safe.
Members with direct reports must have those reports reassigned first.

## Agent Access

Agents remain separate from human memberships. They use individually named,
workspace-scoped API keys with explicit capability profiles. Raw keys are shown
once; administrators can inspect safe prefixes/scopes, last use, and revoke or
enable a credential. Agent credentials never create human sessions.

Native review agents use [immutable credential/principal bindings](agent-credential-principal.md)
to exact workforce IDs. Their current task roles and mandates are checked separately.
Unbound integration keys cannot act as those principals; no credentials are
automatically assigned or converted on deployment.

The workforce editor may assign several governed company roles and several
departments to one human or agent. The first selected role and department are
the primary working role and accountable department retained in the legacy
scalar fields; the full selection is stored through organizational role scopes
and department relations.

This is current editor behavior. The accepted
[autonomy target](autonomy-activation-contract.md) requires one accountable
department and one direct supervisor per worker. Additional department relevance
must not imply multiple reporting lines. Existing multi-department records are
preserved; reconciliation requires a scoped contract, not automatic data removal.

RF-CTX-018 [decision authority](delegated-decision-authority.md) now enforces that
single-department/single-manager rule when resolving native delegated decisions.
It preserves ambiguous existing records and blocks their authority routes. Only
the primary workspace owner can issue or version a mandate; an additional owner
membership does not confer that reserved power. Ordinary human acceptance needs
the exact current delegated principal, independently of console role visibility.
