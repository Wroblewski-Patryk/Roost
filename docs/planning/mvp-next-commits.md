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

## NEXT

- [ ] CCV1-036A Webhook Schema And Security Foundation
- [ ] CCV1-036B ClickUp Webhook Registration
- [ ] CCV1-036C ClickUp Webhook Receiver And Inbox
- [ ] CCV1-036D Task Event Processor
- [ ] CCV1-036E Agent Event Bridge
- [ ] CCV1-036F Production Webhook Smoke
- [ ] Implement Paperclip application-side adapter code that reads
      `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.

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
- [ ] 13. CCV1-036A Webhook Schema And Security Foundation
- [ ] 14. CCV1-036B ClickUp Webhook Registration
- [ ] 15. CCV1-036C ClickUp Webhook Receiver And Inbox
- [ ] 16. CCV1-036D Task Event Processor
- [ ] 17. CCV1-036E Agent Event Bridge
- [ ] 18. CCV1-036F Production Webhook Smoke


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
