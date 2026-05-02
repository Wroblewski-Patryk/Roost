# LEARNING_JOURNAL

Purpose: keep a compact memory of recurring execution pitfalls and verified
fixes for this repository.

## Update Rules

- Add or update an entry when a failure pattern is reproducible or documented.
- Prefer updating an existing entry over creating duplicates.
- Keep entries in English and free of secrets.
- Apply the new guardrail in the same task where the learning is captured.
- For approved reusable UX or visual patterns, also update
  `docs/ux/design-memory.md`.

## Entry Template
```markdown
### YYYY-MM-DD - Short Title
- Context:
- Symptom:
- Root cause:
- Guardrail:
- Preferred pattern:
- Avoid:
- Evidence:
```

## Entries

### 2026-04-30 - Canonical visuals require surface-by-surface closure

- Context: Screenshot-driven UI work can drift when agents treat approved
  images as inspiration, spread polish across multiple surfaces, or replace
  required assets with generic CSS approximations.
- Learning: A canonical screenshot, mockup, or approved frame must be treated
  as the active spec. Explicit user notes become part of that spec.
- Guardrail: For pixel-close UI tasks, use
  `docs/ux/canonical-visual-implementation-workflow.md`, close one surface at a
  time, capture comparison screenshots, list visible mismatches, and require an
  explicit `95%` parity judgment before moving to dependent surfaces.

### 2026-04-30 - UX audits should become action-first evidence

- Context: Broad UI passes can produce screenshots without changing the
  product's day-to-day usefulness.
- Learning: Full-route clickthroughs are most useful when they answer whether
  each screen makes the next action, blocked state, and recovery path obvious.
- Guardrail: Use `docs/ux/evidence-driven-ux-review.md` for broad UX work,
  keep feedback local to user actions, hide raw technical errors from end
  users, and convert findings into the next one or two implementation slices.

### YYYY-MM-DD - Add first real repository-specific learning
- Context:
- Symptom:
- Root cause:
- Guardrail:
- Preferred pattern:
- Avoid:
- Evidence:
