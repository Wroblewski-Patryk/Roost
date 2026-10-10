# Trusted company source reviews: migration loss review

The migration creates `company_source_reviews`, its index, and triggers. It does not update, delete, backfill, or classify any existing company record, evidence, decision, task, or event. No current record becomes trusted by default. Existing company-information Ready pins are rejected on their next inspection or claim because the current packet validator requires an eligible review; no Worker admission can use a stale pin. Normal inspection may then mark the task as needing revalidation. A new approval or withdrawal is appended by an owner for one task and one exact record revision. UPDATE, DELETE, and TRUNCATE of these receipts fail closed. A missing review removes the selected source and blocks launch.

The new foreign keys use `RESTRICT` because deleting an adopted task, record, workspace, or actor would destroy the review history. Those entities use lifecycle states for normal operations. The new table participates in the existing Ready source fence and invalidation triggers, so a later review changes the affected task's Ready status without touching its company records.

An empty disposable PostgreSQL database applied the complete migration chain in the native HTTP/Worker test. Production migration and deployed read-back remain separate release evidence.
