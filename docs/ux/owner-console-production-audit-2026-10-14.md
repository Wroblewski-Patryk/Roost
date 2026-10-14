# Signed-in owner-console audit — 2026-10-14

This is read-only evidence from the deployed owner console. It records the
visible text and state of all 52 area-navigation views in the reference
installation plus workspace and account settings, at the browser's default
desktop viewport; representative screens were also captured. It is a route
and visible-state inventory, not a per-screen visual acceptance or proof that
forms, linked record details, permissions, keyboard paths, narrow screens,
agent actions, or error recovery work. No
company record was changed. Product acceptance remains in
`docs/product/requirements.md`; the active delivery order remains in
`docs/implementation.md`.

A separate Rdzeń read-only report at 2026-10-14 21:42 UTC counted 240 public
tables, 138 nonempty; 33 active procedures, 10 proposed Decisions, one
technical active Goal, 280 Tasks and 5,231 CompanyRecords. These are reported
inventory counts, not this UI audit's own database verification or a list of
records safe to delete. Its importer review found that `--apply` can reactivate
hidden or archived records. A durable cleanup claim needs a corrected import
path and repeat-import read-back.

## Findings that block an owner-usable workspace

1. The home health strip says there are no active blockers and shows 100%,
   while the same page presents ten attention signals and large open-signal
   counts. Repeated old credential decisions dominate the first five items.
   The different denominators may be technically explainable, but the owner
   cannot tell what the status means or what to do first. RF-OUT-001 and
   RF-UX-012 are not met by this screen.
2. The **Current** procedure list still shows many active, unlinked internal
   gate and application-release procedures, often assigned to all departments.
   General company procedures are mixed into that list. The catalog does not
   show an owner journey to instantiate a procedure into one run with linked
   tasks. This is a live data and workflow problem, not just a visual one.
   Preserve referenced audit history while removing proven disposable records
   from active company work. RF-CTX-029 remains unproved.
3. The sole visible company goal describes an internal two-source proof. The
   metric and initiative catalogs are empty. The Strategy overview mixes the
   adopted company direction, long technical comparison histories, a raw goal
   table and unrelated task previews. It does not show a usable path from a
   business outcome to measured progress and next work.
4. In the application overview, an archived delivery task is displayed as the
   nearest result and repeated old gate decisions appear as current blockers.
   Product readiness cards show percentages without an owner-facing explanation
   of their basis. A configured application's actual next outcome is unclear.
5. Workspace settings report two providers configured and available, while
   the Technology integrations table reports one of them disconnected with no
   synchronization. The surfaces need one truthful status model or an explicit
   explanation of the different layers. The Windows Host is shown offline and
   the provider as not ready, while the people directory labels many logical
   agent roles active. Role records must not imply runnable workers.
6. Twenty-six of the 54 inspected views displayed an empty catalog or an
   empty business section. Many use the same generic explanation and **Create**
   action. Expose empty capabilities only where the owner has a meaningful
   next step; avoid making thirteen area overviews and dozens of tables the
   primary way to understand the company.
7. Polish locale still includes English navigation, statuses and technical
   copy. The whole-company graph loaded thousands of nodes and relations; it
   is a secondary exploration tool, not a useful daily home.
8. During the audit, one browser tab changed from signed-in views to an
   access-changed message; its login form then showed a generic error. A fresh
   tab signed in successfully with the same saved account and completed the
   audit. This is an observed session/recovery defect candidate, not proof of
   a backend outage or its cause.

## View inventory

| Area | Views inspected and visible state |
| --- | --- |
| 00 General | Dashboard: overloaded by old decisions and conflicting attention/health summary. Company Graph: loads a very large exploratory graph. Company updates: empty. |
| 01 Strategy | Overview: direction exists but long technical history and mixed work obscure action. Goals: one internal proof goal. Metrics and KPIs: empty. Strategic initiatives: empty. Decision register: accepted, withdrawn and repeated pending technical decisions dominate. |
| 02 Product | Products and services: no product/service records, plus application readiness cards. Requirements: empty. Deliverables: empty. |
| 03 Sales | Overview: sample funnel and mixed follow-up tasks, with no live opportunity shown. Commercial offers: empty. |
| 04 Operations | Overview: generic department preview. Tasks: substantial task/list functionality with current/archive switches. Calendar: task time view. Procedures: active list polluted by historical gate/release records. Operational issues: empty. Operational events: empty. |
| 05 Relationships | Overview: mixed tasks and provider files; no clear customer record journey was established in this audit. Feedback: empty. |
| 06 People / Agents | Overview: generic department preview. Directory: logical agent roles and owner records appear active. Competencies: empty. Runtime readiness must be shown separately from role status. |
| 07 Finance | Overview: pricing candidates requiring owner decisions, with no source or current commercial workflow verified here. Budgets: empty. Invoices: empty. |
| 08 Assets | Overview: recent provider files. Files and folders: populated, but some source folders appear under unrelated area headings or unassigned. Company resources: older pipeline resources. Knowledge records: empty. |
| 09 Technology | Overview: raw operating-graph rows. Technology goals: empty. Integrations: provider-status discrepancy with workspace settings. Automations: empty. Technical incidents: empty. Environments: empty. |
| 10 Legal | Overview: raw strategy/governance graph and task count, with no legal question or action clear. Contracts: empty. Policies and guardrails: one deployment rule. Compliance: empty. |
| 11 Innovation | Product engineering: four application cards; stale technical blockers and archived nearest-result links appear in active context. Requirements: empty. Projects: four application delivery projects. Application Graph: visual application explorer. Experiments: empty. |
| 12 Management | Overview: generic task/department preview. Department management: configured system areas. Portfolio steering: empty. Company risks: empty. Escalations and blockers: empty. Management reviews: empty. |
| Settings | Workspace: provider setup, Host status, and a long list of current/historical credentials; the latter overwhelms normal setup. Account: basic profile and security controls. |

## Delivery implications

- Start with the owner home and current-data classification. Show one truthful
  attention queue, hide resolved/archived/test records from current work, and
  route each item to its exact next action. Do not delete unknown or referenced
  evidence from a visual observation alone.
- Keep the existing task and file capabilities. Connect them to goals,
  questions/decisions, customers, applications and procedures through complete
  owner journeys instead of adding more empty catalogs.
- Make procedure launch, project/application status, provider health and agent
  readiness explainable before presenting them as complete company functions.
- Regress signed-in PL/EN, narrow/tablet/desktop, keyboard, long content,
  loading/empty/error states and actual task completion in subsequent bounded
  implementation work. This read-only inventory does not provide those proofs.

Relevant accepted clauses: RF-OUT-001/002, RF-CTX-016/029, RF-HOST-023,
RF-UX-010/012. The owner-console design direction is in
`docs/product/company-operating-workflows.md`.
