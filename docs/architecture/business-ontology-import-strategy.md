# Business Ontology Import Strategy

Last updated: 2026-05-30

## Purpose

CompanyCore/Roost needs a durable way to absorb external business operating
knowledge before the app grows into many departments, workflows, agents, and
authority paths. The owner-provided APQC PCF, SIPOC, organization-chart, and
role/ACL notes are accepted as useful direction for future architecture and
planning work.

This document records how those materials should guide future implementation.
It does not approve immediate schema expansion, broad imports, or autonomous
agent authority.

## Accepted Source Families

| Source family | Use in CompanyCore | Preferred import shape | Current status |
| --- | --- | --- | --- |
| APQC Process Classification Framework | External reference taxonomy for process domains and process classification. | Flattened CSV with source IDs, hierarchy levels, department mapping, PAEI tag, owner role, mapping notes, and lifecycle status. | Accepted as future import source. |
| SIPOC templates | Process onboarding and process-quality capture for Suppliers, Inputs, Process, Outputs, and Customers. | CSV or sheet rows connected to an existing or proposed process/procedure. | Accepted as future process-context source. |
| Organization-chart CSV | Starter shape for hierarchy, reporting relationships, role ownership, and agent/person assignment. | `node_id`, `parent_id`, `display_name`, `role_title`, `paei_type`, `primary_agent_id`, and MECE responsibilities. | Accepted as future workforce/authority seed input. |
| Role-to-ACL mapping | Contextual permission and approval planning for humans and agents. | `department`, `agent_id`, `agent_role`, `rls_role`, `approval_gate`, `capability_scope`, and blocked actions. | Accepted as future access-planning input only. |
| One-page SOP templates | Lightweight operating procedure capture for repeatable work. | Markdown or structured rows linked to processes, procedures, owners, evidence, acceptance criteria, rollback, and RACI. | Accepted as future knowledge/procedure source. |

## Target Mapping Model

External business ontology must map into the existing CompanyCore architecture
instead of creating a parallel system.

| External concept | Current or preferred CompanyCore concept | Implementation rule |
| --- | --- | --- |
| APQC category or process domain | Future process-domain taxonomy linked to existing `processes`, `business_functions`, and `operating_areas`. | Add only after an audit proves current process records cannot express the needed classification. |
| APQC process or activity | Existing `processes`, `pipelines`, `procedures`, and `procedure_steps`. | Prefer classification/linking before creating new workflow roots. |
| SIPOC supplier/input/output/customer | Process context, knowledge items, resources, relationships, clients, stakeholders, and acceptance criteria. | Start as read-only context and validation metadata. |
| Org-chart node | `workforce_entities`, `users`, `agents`, `company_roles`, and future rank/supervisor records. | Reconcile with current People/Agents and Paperclip director records before importing. |
| MECE responsibility | `company_roles`, `business_functions`, and future explicit responsibility records. | Every high-impact responsibility needs one accountable owner. |
| PAEI tag | Behavioral profile metadata on roles, agents, or imported process rows. | PAEI informs routing and staffing; it is not an authorization model. |
| ACL row | Capabilities, service-key profiles, approval gates, policies, controls, and blocked actions. | Permissions must remain enforced through API/MCP/auth policy, not CSV alone. |
| SOP | Existing or future procedures, procedure steps, standards, knowledge items, rollback notes, and acceptance criteria. | SOP import must preserve owner, scope, validation, rollback, and review evidence. |

## APQC To 12 Departments Rule

APQC PCF rows should be flattened and mapped to exactly one CompanyCore
department when imported. The canonical department set remains:

```text
00 General
01 Strategy
02 Product And Delivery
03 Sales
04 Operations
05 Relationships
06 People/Agents
07 Finance
08 Assets
09 Technology/AI
10 Legal
11 Innovation
12 Management
```

Mapping rules:

1. Assign by the primary value-chain owner, not by every supporting role.
2. Split rows that contain multiple business outcomes or multiple accountable
   departments.
3. Merge near-duplicate low-value rows only after preserving source IDs.
4. Default repeatable delivery/service execution to Operations unless it is
   clearly technology, people, finance, legal, or asset ownership.
5. Route contracts/compliance to Legal and payment/accounting/treasury to
   Finance.
6. Route procurement, vendors, facilities, and internal assets to Assets unless
   the item is architecture-critical technology ownership.
7. Separate Strategy direction-setting from Innovation experiments.
8. Treat Management as governance, PMO, policy, risk, audit, and cross-company
   control, not generic administration.

Minimum APQC mapping columns:

```text
source_system, source_version, pcf_id, pcf_name, level, parent_pcf_id,
department_key, paei, owner_role, mapping_notes, status
```

Allowed row statuses:

```text
discovered, mapped, transformed, imported, validated, rejected
```

## SIPOC Import Rule

SIPOC rows are useful for process onboarding and for making process context
agent-readable. They should not create executable workflow behavior by
themselves.

Minimum SIPOC columns:

```text
process_key, process_name, supplier, input, process_step, output, customer,
owner_role, source_reference, validation_status, notes
```

Future SIPOC implementation should first expose a read-only process-context
packet. Write behavior, workflow activation, provider writes, and autonomous
execution require separate command-shaped contracts.

## Organization Chart And Responsibility Rule

Org-chart CSV can bootstrap role and reporting assumptions, but it must be
reconciled with existing CompanyCore workforce records first:

- `users` remain human authentication identities.
- `agents` remain agent profiles and service/API identities.
- `workforce_entities` is the current shared human/agent roster foundation.
- `company_roles` and `business_functions` remain the preferred role and
  business-function foundations.

The imported hierarchy must support MECE accountability:

- one accountable owner per responsibility;
- supporting roles recorded separately as consulted, informed, or delegated;
- escalation path attached to the owner or supervisor chain;
- no autonomous high-impact action until accountability and approval authority
  are explicit.

## Role And ACL Rule

Role-to-ACL mapping is useful as a planning stub, not as a runtime authority
source. Future imports may propose capability profiles and approval gates, but
runtime enforcement must continue through:

- workspace auth;
- API capabilities;
- service-key profiles;
- MCP manifest filtering;
- approval requirements;
- policies and controls;
- audit/event evidence.

Every imported ACL row must also declare blocked actions so Paperclip and other
agents can understand what they cannot do.

## Paperclip Usage

Paperclip should consume this ontology through CompanyCore API/MCP read packets
and command routes. It must not import CSV files directly into its own separate
authority model.

Target Paperclip loop:

```text
business plan / owner intent
  -> imported process, SOP, responsibility, and ACL context in CompanyCore
  -> missing-work and ownership analysis
  -> proposed task, process update, or approval request
  -> owner or supervised agent execution
  -> evidence, feedback, and next gap
```

Paperclip may use APQC/SIPOC/org/ACL data to plan, classify, and propose work.
It may execute only through approved CompanyCore capabilities and approval
gates.

## Future Implementation Candidates

1. `ONTOLOGY-002` source inventory and sample import contract for APQC, SIPOC,
   org-chart, ACL, and SOP templates.
2. `ONTOLOGY-003` read-only process-domain taxonomy model or mapping layer,
   reusing existing `processes`, `pipelines`, `procedures`, and
   `business_functions` first.
3. `ONTOLOGY-004` CSV validation CLI for APQC/SIPOC/org/ACL imports:
   required columns, one department, one PAEI, owner present, duplicate
   detection, and blocked action checks.
4. `ONTOLOGY-005` MECE responsibility and PAEI mapping audit over current
   departments, roles, agents, and workforce entities.
5. `ONTOLOGY-006` read-only Paperclip planning packet that exposes process
   taxonomy, responsibilities, SOP links, blocked actions, and approval gates.

## Guardrails

- Do not add broad tables before auditing current foundations.
- Do not treat external taxonomies as permission sources.
- Do not let APQC hierarchy replace department accountability.
- Do not let organization hierarchy replace horizontal workflow/process flow.
- Do not let PAEI grant capabilities.
- Do not import SOPs as executable automation without command, approval,
  rollback, and evidence contracts.
- Keep all imported source IDs and source versions for traceability.
- Prefer read-only packets and validators before write/import automation.
