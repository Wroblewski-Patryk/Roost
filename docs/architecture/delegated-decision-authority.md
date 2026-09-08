# Owner reservations and delegated decision authority (RF-CTX-018)

The existing Decision register and workforce records own this contract. A title,
free-text role, General department, integration key or model interpretation never
confers business decision authority. No installation hierarchy or mandate is seeded.

## Classification and owner authority

Native proposals declare one of `product_direction`, `money`, `legal`,
`critical_risk`, `mandate_change`, or `ordinary_domain`. The first five require
explicit acceptance by `workspaces.owner_user_id` with a current owner membership.
Another membership labelled owner is insufficient. Computed critical risk also
requires that primary owner. Missing legacy classification stays owner-only.
Silence, a draft, an interview answer and an impact preview grant no approval.
Only the current owner can publish the classification of an ordinary proposal.
The server validates declared types; it does not infer meaning from prose.

Generic Decision creation records a proposal; generic routes cannot accept,
rewrite or archive an accepted Decision. Governed supersession preserves history.

## Versioned mandate ledger

`workforce_mandate_versions` extends canonical workforce authority with an
append-only, request-idempotent history. Each version records the workspace,
workforce holder, typed human/agent principal, owner issuer, canonical accountable
department, explicit task/application/project/procedure IDs, exclusions and their
explanation, permitted operations, risk ceiling, validity, status, reason and an
accepted owner `mandate_change` Decision. That Decision must cover the exact
mandate entities. A new version requires a different accepted source Decision.

The implemented operations are `accept_decision`, `supersede_decision`,
`answer_interview`, and `accept_interview`. They do not confer execution, result
review, release or tool permission. Low, medium and high ceilings are supported;
critical risk and reserved domains cannot be delegated. Every affected task must
be explicitly included; naming its parent application or project never includes
it implicitly. Source IDs, holder, workspace and revision are checked in the
database transaction. Holder and workspace remain fixed across a mandate's
versions. Only the primary owner may issue, change, suspend or revoke. Revocation
is terminal; resuming a suspended mandate requires another audited version.

## Shortest organizational route

The projection reads `workforce_entities.manager_id`, the explicit
`department_director` hierarchy level, and canonical department relations with
`relationship_role=owner`. Every route participant must have a valid principal,
one accountable department and at most one direct manager. A specialist needs
an explicit manager. No manager is inferred from a CEO title.

Within a department the route climbs to the nearest common manager and descends
to the recipient. Across departments it climbs to the requesting director,
coordinates directly with the recipient's peer director, and descends. For example:

`Application PM (Innovations) → Innovations director → Technology director → Frontend developer`

All twelve directors remain peers. A director may have no superior or an explicit
report to the primary owner's human workforce record; that owner edge is watched
but does not lengthen peer coordination. Management/CEO coordinates through this
same model. General is not an authority department. Missing or inactive principals,
cross-workspace edges, cycles, ambiguous directors/departments/principals and
department-bypassing manager links block routing. Limits are 2,000 workforce
records, 2,000 current mandates and 100 ancestors per endpoint.

The resolver walks the shortest route from requester to recipient and chooses
the first principal with exactly one current matching mandate. It checks the
department, entity set, exclusions, operation, risk, owner issuer and validity.
Missing authority escalates an explicit mandate proposal to the owner; it never
broadens the scope or silently substitutes another principal. A snapshot stores
the mandate ID/version, route, watched ancestry, source revisions and scope proof.

## Native integration and independent gates

Decision acceptance stores the immutable authority snapshot alongside the existing
impact preview and task effects. An agent additionally needs a current bound
credential and one `decision_supersede` capability grant per affected task, bound
to that exact Decision and preview. The ordinary task grant UI exposes eligible
choices; grants cannot outlive the credential or selected mandate. Every grant
must produce a same-transaction use receipt. Replay rechecks the principal and
current authority, grant revocation/expiry and its original receipt.

Material interviews retain `requiresHuman=true`. An ordinary block can name the
human selected by the same route, with both interview operations in one mandate.
The owner publishes it; the designated human answers and separately accepts it.
Agent question preparation remains governed by its existing narrow grant; it
does not accept a human-required answer. Reserved classes and legacy `task_scope`
remain primary-owner decisions. Recorded authority stays readable after changes.

RF-SEC-002 gates are independent of this mandate. High risk retains applicable
procedure verification, independent review and mandate evidence. Critical risk
also retains backup, restore-plan and fresh owner approval, even when the explicit
decision class is critical but its task's computed risk is lower. Pending Decision
authors, declared human decision makers and interview answer authors cannot issue
their own independent review proof. Proofs bind current pending Decisions and
interview versions. Existing result-review roles and independence remain separate;
review and Ready surfaces show the effective Decision authority and its currentness.

## Changes, expiry and concurrency

Serializable commands share the existing Ready source fence with mandate,
membership, workspace and hierarchy mutations. Acceptance rechecks current owner,
principal, mandate version, exact scope, risk, hierarchy and preview before commit.
Monotonic source revisions prevent edit/revert from restoring an old authority.
A new matching mandate on the route also changes the proof. Display-only workforce
edits do not change authority.

Changed, suspended, revoked or expired authority invalidates only dependent
previews, Ready/admission/grants and queued/active work. Accepted task effects
retain their old snapshot; a superseding accepted Decision is the explicit
reauthorization path. The existing RF-CTX-006 stop fence handles active work.
Expiry is checked at native admission, Ready reads and heartbeat checkpoints;
the effective mandate deadline also caps admission expiry consumed by the host.
This uses the existing host protocol and never starts a model. No prior pin,
grant, accepted history or independent sibling task is restored or rewritten.

## Upgrade and verification

`20260908190000_delegated_decision_authority` is additive: empty ledgers, nullable
historical authority fields and new guards. It seeds no company data, rotates no
credential, modifies no old migration and resets no database. Preserve a verified
private backup, existing secrets and persistent volume. Prefer a forward fix;
an older backend must not become an authority bypass after mandates are issued.

Verification uses the pure authority policy tests, `decision authority` API
fixture, existing Decision/interview/risk/Ready/review regressions, responsive
PL/EN authority and governance browser tests, host packet/stop tests, and the full
forward migration preservation fixture. All fixtures are synthetic; active-stop
coverage includes an explicit historical execution fixture, without invoking a
provider. Runtime execution remains disabled and the host remains in observe mode.

This is the bounded native RF-CTX-018 implementation. Semantic classification of
arbitrary external content, a general enterprise delegation broker, HR catalogs,
automatic company reorganization and unattended agent activation remain outside
the contract.
