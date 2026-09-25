# Architecture documentation

This folder records Roost's current system boundaries and the technical
evidence used to verify them. Product assumptions do not live here; they live
in `docs/product/`.

## Reading order for implementation

1. `../implementation.md` for the active end-to-end outcome and current state.
2. `system-architecture.md` for the overall runtime and ownership boundaries.
3. `autonomy-activation-contract.md` for the current Roost -> Worker -> Hermes
   execution and activation boundary.
4. Only the component contracts referenced by the code being changed.
5. `traceability-matrix.md` when updating requirement evidence or readiness.

`architecture-source-of-truth.md` and versioned `*-v1`, `*-v2`, `*-v3`
documents contain detailed implementation/protocol evidence accumulated over
time. They are not a task queue. Historical "next atom", provider-order or
STOP statements in those files are superseded by `docs/implementation.md`.

## Maintenance

- Update an existing architecture document when the same boundary changes.
- Add a new technical contract only for a genuinely separate protocol or data
  boundary that cannot be expressed clearly in an existing document.
- Keep historical implementation narration out of current overview documents;
  Git already records chronology.
- Update architecture and traceability together when runtime behavior changes.
- Never infer product intent from an old technical experiment when the accepted
  requirements state a current rule.
