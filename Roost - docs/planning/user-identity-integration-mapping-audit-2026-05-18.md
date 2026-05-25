# User Identity Integration Mapping Audit

## Header
- ID: UIM-AUD-001
- Title: User identity mapping across ClickUp, Google Drive, clients, and internal workforce
- Task Type: research
- Current Stage: analysis
- Status: REVIEW
- Owner: Product Docs + Architecture + Backend Builder
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: DMS-06-WORKFORCE-001; ORG-ARCH-002; CC-04-001; CC-08-001
- Requirement Rows: proposed REQ-UIM-001 through REQ-UIM-006
- Risk Rows: proposed RISK-UIM-001 through RISK-UIM-004
- Iteration: 2026-05-18 owner-directed integration analysis
- Operation Mode: ARCHITECT
- Mission ID: UIM-AUD-001
- Mission Status: CHECKPOINTED

## Context

The owner asked for one coherent identity mapping layer so tasks can be
assigned to ClickUp users, Google Drive file and folder sharing can be managed
through CompanyCore, external people can be marked as external or client
employees, and internal-only CompanyCore behavior can operate without a
provider.

The current architecture already points in this direction:

- `docs/architecture/unified-organizational-operating-system.md` defines
  CompanyCore as the organizational world state for humans, AI agents,
  integrations, and future clients.
- `workforce_entities` is the first unified human/AI roster, but it explicitly
  excludes ClickUp assignee matching and deeper RBAC from V1.
- `tasks`, `task_lists`, `google_drive_files`, `resources`, `clients`, and
  `stakeholders` store some provider/source metadata, but there is no central
  external-person identity map.

## Provider Documentation Evidence

### ClickUp

Official ClickUp API docs confirm that task assignees are represented as user
IDs. Create Task accepts an `assignees` array of integer user IDs, while the
Tasks guide states that assignees are managed as an array of user IDs and that
available IDs can be retrieved through workspace/team-related endpoints.

ClickUp also has member access endpoints for task/list membership, but those
only return people with explicit access to the task or list and do not include
people who only inherit access through a Team, Folder, or Space. The FAQ also
states that API `team_id` is the legacy name for Workspace ID and `group_id`
is a user group ID. User roles are represented as numeric roles:

- `1`: Workspace owner
- `2`: Admin
- `3`: Member
- `4`: Guest

Implication for CompanyCore:

- ClickUp account IDs must not be stored only on `tasks`.
- The system needs a provider-account identity row for each ClickUp user ID,
  linked when possible to a CompanyCore workforce member, user account, agent,
  or client stakeholder.
- Guests and unmapped ClickUp users should become explicit external identities,
  not fake internal users.

### Google Drive

Official Google Drive API docs confirm that file, folder, and shared-drive
access is managed through `permissions` resources. A permission grants a
`type` such as `user`, `group`, `domain`, or `anyone` and a `role` such as
`owner`, `organizer`, `fileOrganizer`, `writer`, `commenter`, or `reader`.

For `type=user` or `type=group`, permission creation requires an
`emailAddress`. The permission resource returns a provider `id`, also called
the permission ID, which is a unique opaque identifier for the grantee. Google
also notes that folder permissions propagate downward and that Drive
capabilities such as `canShare` should be checked before rendering share UI or
attempting writes.

Implication for CompanyCore:

- Google Drive sharing should be modeled as a CompanyCore command over a
  mapped internal/external identity, not as raw email entry directly against
  Drive.
- Google Drive permission IDs and emails must be stored as provider identity
  mappings and resource-access evidence.
- Folder inheritance and shared-drive restrictions must be represented in the
  read packet so the UI can show why an access change is direct, inherited,
  blocked, or requires a different parent/folder/drive role.

## Current Implementation Findings

| Area | Current state | Gap against target |
| --- | --- | --- |
| Internal users | `users` has email/name/auth fields and workspace memberships. | No link to `workforce_entities` or provider identities. |
| Workforce roster | `workforce_entities` supports humans and agents, manager, department, role, source, and external ID. | Only one `source/externalId` pair; not enough for multiple providers per person. |
| Clients | `clients` has core CRM data and `stakeholders` can store client contacts. | Client employee/stakeholder records are not unified with workforce or provider identity mapping. |
| ClickUp tasks | ClickUp sync imports title, description, status, priority, due date, list ID, task external ID. | Assignees are not parsed, persisted, read in packets, or written back. |
| Operations board | `GET /v1/operations/work-items` returns `responsibility.status = not_modeled` and missing fields include `owner_user_id`, `assigned_agent_id`, and `reviewer_id`. | Confirms assignment is intentionally missing, not just hidden from UI. |
| ClickUp writeback | `PATCH /v1/operations/work-items/:id` writes title/status/priority/due date back to ClickUp. | Assignee writeback is unsupported. |
| Google Drive files | Drive metadata is indexed with external file IDs, parent IDs, content snapshots, and area/resource mapping. | Permissions, permission IDs, grantees, capabilities, sharing commands, and access history are not modeled. |
| Resources | `resources` has ownerRole and accessLevel. | No person-level or client-stakeholder resource access model. |
| External mappings | `external_container_mappings` maps provider containers to areas/folders/tables. | It maps containers, not people/accounts. |

## Architecture Conclusion

The desired behavior is not fully implemented.

CompanyCore currently has useful provider object mapping, but not provider
person/account mapping. The current system can import ClickUp tasks and Drive
files, and it can manage a basic human/agent roster, but it cannot yet answer
these core questions reliably:

- Which CompanyCore person is ClickUp user `12345`?
- Is that person internal, an AI agent, an external collaborator, or a client
  employee?
- Which client does this external person belong to?
- Which Google Drive permission ID/email maps to the same person?
- Can this CompanyCore actor assign a task to that mapped person?
- Can this CompanyCore actor share a Drive file/folder with that mapped
  person?
- If the provider account is unknown, should the system create a pending
  external identity, block the action, or ask the owner to link it?

The correct target is a shared identity layer, not provider-specific fields
sprinkled across ClickUp and Drive modules.

## Recommended Target Model

### 1. Organizational person/member source

Keep `workforce_entities` as the human/AI organizational roster for internal
members and agents, but do not force every external account into it as if it
were an employee.

Recommended entity categories:

- `internal_human`: CompanyCore user or internal employee.
- `agent`: AI/digital worker.
- `client_contact`: person linked to a `client` or future client organization.
- `external_collaborator`: external person not yet linked to a client.
- `system_or_integration`: provider/service account when needed.

### 2. External identity map

Add a provider-account mapping layer after a schema decision:

```text
external_identities
  workspace_id
  provider
  provider_account_id
  provider_account_email
  provider_display_name
  provider_role_or_kind
  identity_kind
  linked_workforce_entity_id
  linked_user_id
  linked_agent_id
  linked_client_id
  linked_stakeholder_id
  status
  confidence
  raw
```

This lets ClickUp user IDs, Google permission IDs/emails, future Slack/Gmail
accounts, and internal-only records converge into one person-resolution model.

### 3. Resource access and sharing model

Drive sharing needs a separate access/audit layer, not only identity rows:

```text
resource_access_grants
  workspace_id
  resource_type
  resource_id
  provider
  provider_resource_id
  external_identity_id
  role
  access_type
  inherited_from_resource_id
  expires_at
  status
  raw
```

Google Drive permission writes should go through command routes that validate:

- CompanyCore actor authority.
- Target identity status and link confidence.
- Google `canShare` capability.
- My Drive versus shared drive rules.
- Direct versus inherited permission behavior.
- Expiration constraints.
- Event/audit evidence.

### 4. Task assignment model

Task assignment should not be implemented as a single `task.assigneeId` field.
It should follow the already planned UOS task-recursion direction:

```text
task_assignments
  workspace_id
  task_id
  assignee_identity_id
  assignee_workforce_entity_id
  provider
  provider_assignee_id
  status
  source
  assigned_by_actor_type
  assigned_by_actor_id
  assigned_at
```

ClickUp assignee import/writeback should use this model:

- Import ClickUp assignees into `external_identities`.
- Link known IDs to workforce members/users/agents/client contacts.
- Represent unmapped assignees as pending external identities.
- Write back assignees only through an audited command when the target has a
  valid ClickUp provider account ID.

## Proposed Requirements

| ID | Requirement | Status | Proof needed |
| --- | --- | --- | --- |
| REQ-UIM-001 | CompanyCore stores a provider-agnostic identity map for external accounts. | proposed | Schema decision and migration proof. |
| REQ-UIM-002 | ClickUp user IDs from assignees/members are imported and linked to CompanyCore people when possible. | proposed | API test with mocked ClickUp task assignees. |
| REQ-UIM-003 | Tasks can be assigned internally to mapped people/agents and optionally written back to ClickUp. | proposed | Command-route API tests and ClickUp writeback smoke. |
| REQ-UIM-004 | Google Drive permissions can be listed and mapped to CompanyCore internal or external identities. | proposed | API test with mocked Drive permissions. |
| REQ-UIM-005 | CompanyCore can share Drive files/folders with mapped identities through an audited command. | proposed | Permission create/update/delete command tests. |
| REQ-UIM-006 | Client employees are first-class contacts linked to clients and can also have provider identities. | proposed | Client/stakeholder identity-link API proof. |

## Proposed Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RISK-UIM-001 | Assignee or sharing writes target the wrong external person because provider IDs are stored ad hoc. | high | Central external identity map with confidence/status and owner review. |
| RISK-UIM-002 | Google Drive sharing bypasses CompanyCore authority and exposes sensitive client/internal files. | high | Share commands must validate actor authority, Drive capabilities, and audit every write. |
| RISK-UIM-003 | Client employees are mixed with internal employees, corrupting workforce visibility and permissions. | medium | Separate identity kind and client/stakeholder linkage; do not auto-promote externals to internal workforce. |
| RISK-UIM-004 | Provider access inheritance is misrepresented as direct CompanyCore access. | medium | Store direct/inherited access evidence and display blocked/parent-owned cases honestly. |

## Recommended Implementation Sequence

1. `UIM-BE-001 External Identity Mapping Schema Decision`
   - Compare extending `workforce_entities` versus adding
     `external_identities`.
   - Recommendation: add `external_identities` and link to existing users,
     workforce entities, agents, clients, and stakeholders.

2. `UIM-BE-002 External Identity Read API`
   - Add read-only identity resolution packet:
     `GET /v1/identity-mappings`.
   - Include provider, account ID, email, display name, kind, linked entity,
     confidence, and review status.

3. `UIM-BE-003 ClickUp Assignee Import`
   - Extend ClickUp client/task type to include assignees.
   - Upsert ClickUp users into external identities during task sync.
   - Add assignment read evidence to Operations work items.

4. `UIM-BE-004 Task Assignment Command`
   - Add audited CompanyCore command to assign a task to a mapped identity.
   - Only write back to ClickUp when the identity has a ClickUp account ID and
     the task is ClickUp-backed.

5. `UIM-BE-005 Google Drive Permission Import`
   - Add Drive permission list client methods and permission persistence.
   - Map permission users/groups/domains to identities where possible.

6. `UIM-BE-006 Google Drive Share Command`
   - Add audited share/revoke/update commands for files/folders.
   - Require mapped target identity or an explicit owner-approved external
     invite path.

7. `UIM-WEB-001 Identity Linking Workbench`
   - Add owner UI under People/Agents or Workspace Settings to review,
     merge/link, mark external, and attach external people to clients.

## Safe Assumptions

- Safe: CompanyCore should remain the source of truth and providers should be
  behind adapters.
- Safe: unmapped provider users should be imported as pending external
  identities, not silently discarded.
- Safe: Drive sharing and ClickUp assignment require command routes with audit
  and capability checks.

## Risky Or Blocking Assumptions

- Blocking before implementation: whether client employees should live as
  enhanced `stakeholders`, a new `client_contacts` table, or a subtype of a
  future people/person table.
- Blocking before writes: whether CompanyCore should allow inviting a new
  email to Drive when that email is not yet mapped to any known person.
- Blocking before ClickUp writeback: whether assignment changes in
  CompanyCore should always sync to ClickUp or be provider-write optional per
  task/list/workspace.

## Result Report

- Task summary: analyzed current CompanyCore schema/routes/docs and current
  ClickUp/Google Drive API behavior for user/account mapping, assignees, and
  sharing.
- Files changed: this planning audit only.
- How tested: source review and official provider documentation review.
- What is incomplete: no runtime implementation, migration, API test, or UI
  change was made in this analysis stage.
- Next steps: decide the external identity schema and then implement the
  read-only identity mapping API before any assignment/share writes.
