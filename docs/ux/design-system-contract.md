# Design System Contract

This document defines how agents should treat the visual layer of the
application.

## Purpose

When a project has an established UI layer, it becomes the source of truth for:

- component styles
- visual tokens
- art direction
- spacing and layout patterns
- interaction states
- motion rules
- responsive behavior by surface

The goal is consistency, not one-off reinvention.

The visual target is not merely "acceptable" UI. The system should help teams
ship interfaces that feel clear, confident, and pleasant to use across mobile,
tablet, and desktop.

## Experience Quality Bar

Every meaningful UI change should preserve or improve:

- clear visual hierarchy
- readable spacing rhythm
- accessible contrast and type sizing
- explicit interaction states
- adaptive behavior across screen sizes
- purposeful motion, not decorative noise
- a recognizable visual point of view instead of generic default styling

## Reuse-First Rule

- Prefer an existing shared component or approved variant before creating a new
  one.
- Prefer extending an approved shared pattern over adding page-local styling.
- Reuse the best matching button, input, card, modal, table, badge, and form
  patterns that already exist.
- Create a new shared component or variant only when no approved pattern fits
  the need.
- Reuse approved page rhythms, density rules, and navigation patterns before
  inventing new ones.
- Reuse previously approved visual motifs recorded in `docs/ux/design-memory.md`
  when they still fit the product.

## Forbidden Behaviors

- creating a custom button style for a single screen when a reusable button
  already exists
- adding component-specific spacing, color, or motion rules that bypass the
  system without approval
- shipping dedicated per-instance visual props that fragment the design system
- silently restyling existing shared components for a local task
- shipping visually flat screens with no deliberate hierarchy, spacing rhythm,
  or state differentiation
- treating desktop as a stretched mobile screen or tablet as an afterthought
- copying fashionable effects that hurt readability, navigation, or perceived
  performance
- approximating canonical decorative imagery with generic gradients or blur
  blobs when real assets are required for fidelity

## When A New Pattern Is Allowed

Create a new shared pattern only when:

- there is no acceptable existing component or variant
- the new pattern solves a repeatable need, not a one-off exception
- it is documented so future work can reuse it
- its responsive and accessibility behavior is documented, not implied

If a project lacks a formal design system file, record the approved shared
patterns in project UX docs before large UI expansion.

## Agent Behavior

- treat the current visual system as a contract
- prefer reuse over invention
- if the visual system is clearly insufficient, propose the improvement in
  conversation before changing the system direction
- when creating a new shared pattern, update the relevant UX or component docs
- when a project has no strong visual direction yet, define one before
  expanding the surface area
- keep navigation, density, and interaction patterns appropriate to the active
  surface size and input mode
- treat canonical screenshots, approved mockups, and approved visual frames as
  implementation specifications when the task requires parity

## Validation Expectations

For UI tasks, record:

- which existing pattern was reused
- whether a new shared pattern was introduced
- which approved visual direction or motif was reused
- responsive checks
- accessibility checks
- state coverage: `loading`, `empty`, `error`, `success`
- surface behavior: `mobile`, `tablet`, `desktop`
- whether the result should be added to `docs/ux/design-memory.md`
- whether decorative and background elements were implemented with the correct
  asset strategy
