# Evidence-Driven UX Review

Use this when reviewing or improving a real product surface, especially after a
full-route clickthrough, screenshot audit, or canonical-design parity pass.

## Core Question

Every important screen should answer these within 3 seconds:

- What matters now?
- What is blocked?
- What is the next action?

If the user cannot answer those quickly, the UI is not finished even if it
matches the visual theme.

## Review Inputs

- route list or user-journey list
- desktop, tablet, and mobile screenshots when available
- canonical design source when one exists
- known user notes or product assumptions
- test or clickthrough notes for primary flows

## What To Look For

- screens that are form-first instead of action-first
- too many cards or panels with equal visual weight
- primary action hidden below secondary metadata
- feedback appearing far away from the user action
- raw backend or validation errors exposed to end users
- empty, loading, error, or success states that are generic or global when the
  action happened inside one component
- mobile layouts that merely shrink desktop instead of prioritizing the most
  important content
- desktop layouts that stretch empty space instead of improving scan speed
- navigation duplication or competing rails
- non-functional buttons, placeholder actions, or future-facing controls that
  look live

## Recommended Evidence Shape

For broad UX passes, capture:

- a manifest of visited routes or flows
- screenshots for each important route and breakpoint
- route mismatches, redirects, or broken states
- the top visible issues grouped by severity
- the next one or two implementation slices

For canonical visual work, also follow
`docs/ux/canonical-visual-implementation-workflow.md`.

## Fix Priority

1. Unblock primary user flows.
2. Replace technical errors with user-language recovery.
3. Make the next action visually dominant.
4. Reduce equal-weight card clutter and duplicated navigation.
5. Improve responsive behavior for the most constrained breakpoint.
6. Polish visual parity and micro-interactions.

## Completion Bar

A UX review is complete only when it produces:

- evidence references
- clear findings
- prioritized implementation slices
- acceptance checks for the next slice
- any reusable pattern or anti-pattern updates needed for future agents
