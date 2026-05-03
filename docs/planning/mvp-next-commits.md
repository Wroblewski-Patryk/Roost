# MVP Next Commits

Keep this file short and execution-focused. The active queue must stay
synchronized with `.codex/context/TASK_BOARD.md`.

## NOW

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

## NEXT

- [ ] No active P0/P1 v1 runtime task is ready.
- [x] Source handoff package: document the OpenJarvis
      `5a426370` connector hygiene commit and the Paperclip `4cfa476f`
      adapter commit for managed upstream handoff.
- [ ] Optional source merge execution: push or upstream the OpenJarvis
      `5a426370` connector hygiene commit when that repository is ready for
      managed changes.
- [ ] Blocked source merge execution: push or upstream the Paperclip
      `4cfa476f` adapter commit after write access or a fork/PR route is
      available.
- [ ] Optional release automation: complete GitHub-to-Coolify auto-deploy
      webhook administration when webhook-management tooling or credentials are
      available.

## PIPELINE

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


## GROUP QUEUE

- [ ] CCV1-A (docs and planning): CCV1-001, CCV1-002, CCV1-005
- [ ] CCV1-B (workspace and auth): CCV1-011, CCV1-012, CCV1-013, CCV1-007
- [ ] CCV1-C (regression prevention): CCV1-014, CCV1-015, CCV1-016, CCV1-017
- [ ] CCV1-D (runtime foundation): CCV1-003, CCV1-004, CCV1-006, CCV1-010
- [ ] CCV1-E (completion): CCV1-008, CCV1-009

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
