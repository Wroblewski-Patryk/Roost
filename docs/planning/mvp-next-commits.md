# MVP Next Commits

Keep this file short and execution-focused. The active queue must stay
synchronized with `.codex/context/TASK_BOARD.md`.

## NOW

- [ ] UXA-002 Authenticated Private Route UX Evidence Harness:
      create or document an approved local authenticated screenshot path for
      the private owner-console routes, then capture desktop/tablet/mobile
      evidence without writing test data to production.
- [x] UXA-001 CompanyCore V1 UX/UI Audit:
      audited the public/auth owner entry, local seeded runtime state, private
      route implementation patterns, and UX source-of-truth docs; published
      `docs/ux/companycore-v1-ux-ui-audit.md` and queued `UXA-002..UXA-006`.
- [x] CCV1-067 Tech Stack Runtime Status Refresh:
      update `docs/architecture/tech-stack.md` so it reflects implemented auth,
      tests, migrations, owner console, ClickUp scheduler, and Google Drive v2
      foundation instead of older planned/foundation wording.
- [x] CCV1-066 Historical Guardrail Plan Classification:
      classify auth/workspace and regression-prevention planning docs as
      implemented historical guardrail plans, so they no longer read as active
      pre-v1-stability work.
- [x] CCV1-065 Front-Door Docs Scope Refresh:
      refresh `docs/README.md`, `docs/API.md`, and `docs/DEPLOYMENT.md` so
      they describe the current owner console and Google Drive v2 foundation
      instead of the earlier minimal-console/backend-only scope.
- [x] CCV1-064 Historical Checklist Closure:
      close stale unchecked AGCRUD planning criteria and the old blocked
      CCV1-009 contract using later accepted production and agent-runtime
      evidence.
- [x] CCV1-063 Historical Next Steps Refresh:
      replace stale `docs/NEXT_STEPS.md` v1 foundation guidance with current
      post-release status, blocked work, and canonical queue pointers; update
      the planning catalog so historical plans are not mistaken for active v1
      work.
- [x] CCV1-062 V1 Operator Runtime Pointer Refresh:
      refresh operator handoff and rollback docs to reference the current
      public `/health` build/image `71f3eb3b063ea68226a1736c727c52882b33f27a`
      and record that VPS Docker inventory still needs an approved operator
      shell before rollback.
- [x] AGRUN-008 Route-Level Business Editing Surfaces:
      reconcile whether the typed Notes, Projects, Clients, Task Lists, and
      Tasks editor workbenches already close the route-level business editing
      gap; if not, select exactly one remaining implemented route slice.
- [x] CCV1-061 Agent State Source-Of-Truth Sync:
      replace placeholder `.agents/state/*` continuation files with current v1
      post-release focus, known blockers, health evidence, and the next
      executable queue item.

- [x] AGRUN-002 Service Key Scope Enforcement:
      enforce `api_keys.scopes` per route capability, keep owner bearer-token
      access intact, preserve existing production agent compatibility through
      an explicit broad-scope decision or migration, and test denied/allowed
      scoped-key behavior.
- [x] AGRUN-003 Machine-Readable Agent Contract:
      extend the `/v1/connection` agent contract with route payload/error
      metadata so agents can learn supported writes without guessing from prose
      docs.
- [x] AGRUN-004 Reusable Agent Training Smoke:
      add a secret-safe script and package command that proves connection,
      create/read/update/archive, agent-log write, and fail-closed behavior
      locally and in production.
- [x] AGCRUD-002 Business Read/Update API Completion:
      add missing single-record read and update routes for first-party
      business APIs, keep workspace guardrails, update the adapter manifest,
      and cover the behavior in integration tests.
- [x] AGCRUD-003 Business Archive/Delete Policy And Slice:
      document safe archive/delete semantics for business records, then
      implement one guarded deletion/archive slice.
- [x] V2WEB-020 Main Operating Area Foundation
- [x] V2WEB-019 Relationship Review Filters
- [x] V2WEB-018 Global Module Switcher
- [x] V2WEB-017 ClickUp List Tree Filters
- [x] V2WEB-016 API Workbench Filters
- [x] V2WEB-015 Google Drive Files Workbench Filters
- [x] V2WEB-014 Integration Matrix Filters
- [x] V2WEB-013 Operating Area Workbench Filters
- [x] V2WEB-012 Pipeline Workbench Filters
- [x] V2WEB-011 Task Workbench Filters
- [x] V2WEB-010 Relationship Review Center
- [x] V2WEB-009 Account Settings View
- [x] V2WEB-008 Dashboard Command Center
- [x] V2WEB-007 Dedicated Pipeline View
- [x] V2WEB-006 Settings Integration Taxonomy View
- [x] V2WEB-005 Dedicated Tasks Adapter View
- [x] V2WEB-004 Dedicated Operating Areas View
- [x] V2WEB-002 Manual Provider Scope Mapping
- [x] V2WEB-001 Operating Map And Google Drive Console
- [x] V2GD-001 Google Drive Architecture And Queue
- [x] V2GD-002 Google Drive Persistence Foundation
- [x] V2GD-003 Google Drive Provider Client And OAuth Settings
- [x] V2GD-004 Folder Discovery And File Import
- [x] V2GD-005 Docs And Sheets Read/Create/Edit
- [x] V2GD-006 Drive Changes Freshness
- [x] V2GD-007 Google Drive Deploy Smoke Hardening
- [x] V2GD-008 Google Drive OAuth Runtime Hardening
- [x] V2GD-009 Google Drive Production Rollover Smoke
- [x] V2GD-010 Drive Hierarchy Preview And Descriptions
- [x] V2GD-011 Drive Setup Operator Instructions
- [x] V2WEB-022 Unified API Integration Setup
- [x] V2WEB-023 Dashboard Operational Cockpit
- [x] V2WEB-024 Data Operations Index
- [x] V2WEB-025 Generic Table Record Workbench
- [x] V2WEB-026 Typed Notes Editor Workbench
- [x] V2WEB-027 Typed Projects Editor Workbench
- [x] V2WEB-028 Typed Clients Editor Workbench
- [x] V2WEB-029 Typed Task Lists Editor Workbench
- [x] V2WEB-030 Typed Tasks Editor Workbench
- [x] V2GD-012 Drive Consent Guidance And Folder Picker
- [x] V2WEB-031 Cross-Department Pipeline Semantics
- [x] V2WEB-032 Dashboard Command Layout Polish
- [x] V2WEB-033 App Shell Navigation Polish
- [x] V2WEB-034 Command Bar Module Switcher Polish
- [x] V2WEB-035 Data Operations Index Polish
- [x] V2WEB-036 Table Workbench Context Polish
- [x] V2WEB-037 Tasks Adapter Context Polish
- [x] V2WEB-038 Pipeline Workflow Context Polish
- [x] V2WEB-039 Relationships Mapping Context Polish
- [x] V2WEB-040 API Agent Access Context Polish
- [x] V2WEB-041 Operating Area Context Polish
- [x] V2WEB-042 Google Drive Import Context Polish
- [x] V2WEB-043 Integration Map Context Polish
- [x] V2WEB-044 Account Context Polish
- [x] V2WEB-045 ClickUp Setup Context Polish
- [x] V2WEB-046 Auth Onboarding Context Polish
- [x] V2WEB-047 Public Entry Context Polish
- [x] V2WEB-048 Global Feedback Panel Polish
- [x] V2WEB-049 Table Workbench Empty State Polish
- [x] AGRUN-005 Scoped Agent Key Owner UI
- [x] CCV1-009P Protected production smoke for adapter CRUD
- [x] CCV1-027 Paperclip and Jarvis production env wiring
- [x] CCV1-029 ClickUp production bootstrap slot
- [x] CCV1-030 Minimal owner ClickUp web console
- [x] CCV1-031P ClickUp owner console deployment plan
- [x] CCV1-028 Deploy Jarvis application-side CompanyCore Data Source and chat context
- [x] CCV1-031 ClickUp Discovery Backend
- [x] CCV1-032 Guided Owner Console
- [x] CCV1-033 Production deploy and smoke for guided ClickUp owner console
- [x] CCV1-034 ClickUp-shaped operating model architecture and implementation
      plan
- [x] CCV1-034A Operating Model Registry Schema
- [x] CCV1-034B ClickUp Structure Persistence
- [x] CCV1-034B2 ClickUp Views And Custom Fields Persistence
- [x] CCV1-034C Registry-Backed Table API Contract
- [x] CCV1-034D Storage And Knowledge Roots
- [x] CCV1-034E Automation Scope Registry
- [x] CCV1-035 ClickUp First-Run Import Policy And Launch Audit
- [x] CCV1-036 ClickUp Webhook Trigger Architecture Plan
- [x] CCV1-037 ClickUp List Selection UX Fix
- [x] CCV1-038 Dashboard Task Table
- [x] CCV1-039 ClickUp Config-Only Save Fix
- [x] CCV1-040 ClickUp Save-And-Sync Activation Fix
- [x] CCV1-036A Webhook Schema And Security Foundation
- [x] CCV1-036B ClickUp Webhook Registration
- [x] CCV1-036C ClickUp Webhook Receiver And Inbox
- [x] CCV1-036D Task Event Processor
- [x] CCV1-036E Agent Event Bridge
- [x] CCV1-036G CompanyCore To ClickUp Write-Back
- [x] CCV1-036F Production Webhook Smoke
- [x] CCV1-042 ClickUp Full API Bridge Completion
- [x] CCV1-043 ClickUp Task Comment Bridge
- [x] CCV1-044 ClickUp Provider Event Retry And Health
- [x] CCV1-045 ClickUp Maintenance Freshness Run
- [x] CCV1-046 ClickUp Maintenance Scheduler
- [x] CCV1-047 Paperclip Application-Side CompanyCore Adapter
- [x] CCV1-048 V1 Closure Audit
- [x] CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path
- [x] CCV1-050 Jarvis CompanyCore Answer Precision Hardening
- [x] CCV1-051 Clean Sync Data Hygiene
- [x] CCV1-052 V1 Launch Boundary And Source Handoff
- [x] CCV1-053 V1 Source Handoff Package
- [x] CCV1-054 Final V1 Runtime Rollover Smoke
- [x] CCV1-055 Full V1 Live System Smoke
- [x] CCV1-056 V1 Post-Release Artifact Cleanup
- [x] CCV1-057 Paperclip Source Handoff Validation
- [x] CCV1-058 OpenJarvis Source Handoff Validation
- [x] CCV1-059 GitHub Auto-Deploy Capability Audit
- [x] CCV1-060 V1 Operator Handoff

## NEXT

- [ ] UXA-003 Dashboard First-Viewport Command Polish:
      tighten `/dashboard` so the first viewport has one dominant next action,
      visible blocker state, and quieter secondary module exploration.
- [ ] UXA-004 Mobile Auth Action-First Layout:
      reorder mobile `/auth/login` and `/auth/register` so the form comes
      before onboarding context while desktop keeps the two-column layout.
- [ ] UXA-005 Workbench Visual Role Cleanup:
      reduce equal-weight panel fatigue across dense workbenches by clarifying
      command, filter, list, selected-detail, and feedback roles.
- [ ] UXA-006 Local Action Feedback Placement:
      add local success/error/status placement for auth, provider setup, Drive
      import, typed editors, and API key lifecycle while preserving the global
      result panel for cross-route outcomes.
- [x] AGRUN-005 Scoped Agent Key Owner UI:
      expose scoped agent key creation, copy-once raw key display, rotation or
      deactivation, and capability presets in `/settings/api`.
- [x] AGRUN-006 Agent Event Ack Positive Smoke:
      create a controlled pending agent event, read it through a target service
      key, acknowledge it, verify it no longer appears as pending, and record
      production smoke evidence.
- [ ] AGRUN-007 Google Drive Owner Consent And First Import:
      blocked until real OAuth credentials and owner consent are available;
      then connect Drive, import a selected folder, and prove agent file
      readback through CompanyCore.
- [x] AGRUN-008 Route-Level Business Editing Surfaces:
      closed by evidence reconciliation; the typed editor workbenches for
      Notes, Projects, Clients, Task Lists, and Tasks are present locally and
      in production `app.js`.
- [x] AGRUN-009 Deploy Automation Reliability:
      audit whether current Coolify auto-deploy reliably updates production or
      document a one-command approved rollover path. First reconcile the
      current source-of-truth drift: this file contains a historical note about
      a successful auto-deploy, while operations docs still classify manual
      rollover as the approved path and auto-deploy tooling as unresolved.
- [x] AGCRUD-004 Registry Resource Lifecycle API:
      complete scoped lifecycle APIs for storage locations, knowledge roots,
      automation definitions, and operating folders.
- [x] AGCRUD-005 Provider/System Lifecycle Manifest:
      expose provider and system lifecycle actions to agents without raw
      system-table CRUD.
- [x] AGCRUD-006 Agent CompanyCore API Playbook:
      publish the agent read/write onboarding guide and smoke flow.
- [x] V2WEB-021 User-Created Area Deletion Guardrails:
      define system/user-created area metadata, protect `00. Glowny`, and only
      then expose safe delete controls for user-created areas.
- [ ] Continue v2 web console polish after main operating area foundation:
      deeper
      module editing surfaces should become route-level slices only when their
      data path is already implemented.
- [x] Source handoff package: document the OpenJarvis
      `5a426370` connector hygiene commit and the Paperclip `4cfa476f`
      adapter commit for managed upstream handoff.
- [ ] Blocked source merge execution: push or upstream the OpenJarvis
      CompanyCore connector hygiene change after write access or a fork/PR
      route is available.
- [ ] Blocked source merge execution: push or upstream the Paperclip
      `4cfa476f` adapter commit after write access or a fork/PR route is
      available.
- [x] Optional release automation evidence reconciliation: confirm whether the
      historical note about pushed commit `63348d6` supersedes the operations
      docs, or update the note so manual rollover remains the explicit approved
      path.

## PIPELINE

- [x] 74. AGRUN-002 Service Key Scope Enforcement
- [x] 75. AGRUN-003 Machine-Readable Agent Contract
- [x] 76. AGRUN-004 Reusable Agent Training Smoke
- [x] 77. AGRUN-005 Scoped Agent Key Owner UI
- [x] 78. AGRUN-006 Agent Event Ack Positive Smoke
- [ ] 79. AGRUN-007 Google Drive Owner Consent And First Import
- [x] 80. AGRUN-008 Route-Level Business Editing Surfaces
- [x] 81. AGRUN-009 Deploy Automation Reliability
- [ ] 82. AGRUN-010 Upstream Agent Source Merge Execution
- [x] 69. AGCRUD-002 Business Read/Update API Completion
- [x] 70. AGCRUD-003 Business Archive/Delete Policy And Slice
- [x] 71. AGCRUD-004 Registry Resource Lifecycle API
- [x] 72. AGCRUD-005 Provider/System Lifecycle Manifest
- [x] 73. AGCRUD-006 Agent CompanyCore API Playbook
- [x] 67. V2WEB-020 Main Operating Area Foundation
- [x] 68. V2WEB-021 User-Created Area Deletion Guardrails
- [x] 69. V2WEB-024 Data Operations Index
- [x] 70. V2WEB-025 Generic Table Record Workbench
- [x] 71. V2WEB-026 Typed Notes Editor Workbench
- [x] 72. V2WEB-027 Typed Projects Editor Workbench
- [x] 73. V2WEB-028 Typed Clients Editor Workbench
- [x] 74. V2WEB-029 Typed Task Lists Editor Workbench
- [x] 75. V2WEB-030 Typed Tasks Editor Workbench
- [x] 76. V2GD-012 Drive Consent Guidance And Folder Picker
- [x] 77. V2WEB-031 Cross-Department Pipeline Semantics
- [x] 78. V2WEB-032 Dashboard Command Layout Polish
- [x] 79. V2WEB-033 App Shell Navigation Polish
- [x] 80. V2WEB-034 Command Bar Module Switcher Polish
- [x] 66. V2WEB-019 Relationship Review Filters
- [x] 65. V2WEB-018 Global Module Switcher
- [x] 49. V2WEB-002 Manual Provider Scope Mapping
- [x] 50. V2WEB-003 Main Branch Web Console Shell Reconciliation
- [x] 51. V2WEB-004 Dedicated Operating Areas View
- [x] 52. V2WEB-005 Dedicated Tasks Adapter View
- [x] 53. V2WEB-006 Settings Integration Taxonomy View
- [x] 54. V2WEB-007 Dedicated Pipeline View
- [x] 55. V2WEB-008 Dashboard Command Center
- [x] 56. V2WEB-009 Account Settings View
- [x] 57. V2WEB-010 Relationship Review Center
- [x] 58. V2WEB-011 Task Workbench Filters
- [x] 59. V2WEB-012 Pipeline Workbench Filters
- [x] 60. V2WEB-013 Operating Area Workbench Filters
- [x] 61. V2WEB-014 Integration Matrix Filters
- [x] 62. V2WEB-015 Google Drive Files Workbench Filters
- [x] 63. V2WEB-016 API Workbench Filters
- [x] 64. V2WEB-017 ClickUp List Tree Filters
- [x] 48. V2WEB-001 Operating Map And Google Drive Console
- [x] 39. V2GD-001 Google Drive Architecture And Queue
- [x] 40. V2GD-002 Google Drive Persistence Foundation
- [x] 41. V2GD-003 Google Drive Provider Client And OAuth Settings
- [x] 42. V2GD-004 Folder Discovery And File Import
- [x] 43. V2GD-005 Docs And Sheets Read/Create/Edit
- [x] 44. V2GD-006 Drive Changes Freshness
- [x] 45. V2GD-007 Google Drive Deploy Smoke Hardening
- [x] 46. V2GD-008 Google Drive OAuth Runtime Hardening
- [x] 47. V2GD-009 Google Drive Production Rollover Smoke
- [x] 47a. V2GD-010 Drive Hierarchy Preview And Descriptions
- [x] 1. CCV1-031 ClickUp Discovery Backend
- [x] 2. CCV1-032 Guided Owner Console
- [x] 3. CCV1-033 Production deploy and smoke for guided ClickUp owner console
- [x] 4. CCV1-034 ClickUp-shaped operating model architecture
- [x] 5. CCV1-034A Operating Model Registry Schema
- [x] 6. CCV1-034B ClickUp Structure Persistence
- [x] 7. CCV1-034C Registry-Backed Table API Contract
- [x] 8. CCV1-034B2 ClickUp Views And Custom Fields Persistence
- [x] 9. CCV1-034D Storage And Knowledge Roots
- [x] 10. CCV1-034E Automation Scope Registry
- [x] 11. CCV1-035 ClickUp First-Run Import Policy And Launch Audit
- [x] 12. CCV1-036 ClickUp Webhook Trigger Architecture Plan
- [x] 13. CCV1-036A Webhook Schema And Security Foundation
- [x] 14. CCV1-036B ClickUp Webhook Registration
- [x] 15. CCV1-036C ClickUp Webhook Receiver And Inbox
- [x] 16. CCV1-036D Task Event Processor
- [x] 17. CCV1-036E Agent Event Bridge
- [x] 18. CCV1-036G CompanyCore To ClickUp Write-Back
- [x] 19. CCV1-036F Production Webhook Smoke
- [x] 20. CCV1-042 ClickUp Full API Bridge Completion
- [x] 21. CCV1-043 ClickUp Task Comment Bridge
- [x] 22. CCV1-044 ClickUp Provider Event Retry And Health
- [x] 23. CCV1-045 ClickUp Maintenance Freshness Run
- [x] 24. CCV1-046 ClickUp Maintenance Scheduler
- [x] 25. CCV1-047 Paperclip Application-Side CompanyCore Adapter
- [x] 26. CCV1-048 V1 Closure Audit
- [x] 27. CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path
- [x] 28. CCV1-050 Jarvis CompanyCore Answer Precision Hardening
- [x] 29. CCV1-051 Clean Sync Data Hygiene
- [x] 30. CCV1-052 V1 Launch Boundary And Source Handoff
- [x] 31. CCV1-053 V1 Source Handoff Package
- [x] 32. CCV1-054 Final V1 Runtime Rollover Smoke
- [x] 33. CCV1-055 Full V1 Live System Smoke
- [x] 34. CCV1-056 V1 Post-Release Artifact Cleanup
- [x] 35. CCV1-057 Paperclip Source Handoff Validation
- [x] 36. CCV1-058 OpenJarvis Source Handoff Validation
- [x] 37. CCV1-059 GitHub Auto-Deploy Capability Audit
- [x] 38. CCV1-060 V1 Operator Handoff


## GROUP QUEUE

- [x] CCV1-A (docs and planning): CCV1-001, CCV1-002, CCV1-005
- [x] CCV1-B (workspace and auth): CCV1-011, CCV1-012, CCV1-013, CCV1-007
- [x] CCV1-C (regression prevention): CCV1-014, CCV1-015, CCV1-016, CCV1-017
- [x] CCV1-D (runtime foundation): CCV1-003, CCV1-004, CCV1-006, CCV1-010
- [x] CCV1-E (completion): CCV1-008, CCV1-009

The group queue is historical. Current active and blocked work is represented
in `NOW`, `NEXT`, `PIPELINE`, and `.codex/context/TASK_BOARD.md`.

## Refill Rules

- Keep `NOW` small. Recommended maximum: 3 tasks.
- Move tasks from `NEXT` to `NOW` only when the current active slot is free.
- Use `PIPELINE` only when a larger execution wave needs continuity beyond
  `NEXT`.
- Use `GROUP QUEUE` when the project executes larger waves as grouped batches
  with explicit commit ranges.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md`.
- When publishing a new execution plan, activate the first executable tasks in
  `NOW` and `NEXT` in the same turn.
- Before reporting that no work is queued, verify both:
  - active canonical queue sections
  - background or historical unchecked checklists outside the canonical queue,
    clearly labeled as non-active if found.
