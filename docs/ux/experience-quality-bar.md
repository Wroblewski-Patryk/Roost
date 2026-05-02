# Experience Quality Bar

This file defines the minimum UX/UI bar for new products and major interface
changes.

It is inspired by the same qualities repeatedly rewarded in high-end web work:

- strong first impression
- clear usefulness within seconds
- memorable but controlled visual direction
- polished interaction details
- excellent usability despite creative presentation
- fidelity to the approved art direction when a canonical visual exists

## Core Principle

Beauty is not decoration added after functionality. The interface should make
useful work feel easier, faster, and more trustworthy.

## Product Experience Rules

- Lead with task clarity before visual flourish.
- Make every important screen answer within seconds:
  - what matters now
  - what is blocked
  - what the next action is
- Make the primary action obvious within the first viewport.
- Keep copy short, specific, and action-oriented.
- Prefer one strong concept per screen over many competing accents.
- Treat empty, loading, error, and success states as designed product moments,
  not leftovers.
- Design for interrupted use: users return on smaller screens, rotate devices,
  resize windows, and multitask.

## Surface Strategy

### Mobile

- Prioritize one primary job per screen.
- Keep core actions in reachable zones.
- Use tighter hierarchy, not merely smaller desktop layouts.
- Avoid stacking too many cards with identical weight.
- Respect safe areas, keyboards, and thumb ergonomics.

### Tablet

- Do not treat tablet as "large phone".
- Use extra width to reduce taps: split views, contextual panels, richer
  previews, and better browsing density.
- Preserve touch comfort while increasing information density.
- Check both portrait and landscape intentionally.

### Desktop

- Do not stop at centered mobile content with empty margins.
- Use width for faster scanning, comparison, and multi-step workflows.
- Support pointer precision, keyboard shortcuts, hover affordances, and
  denser layouts where appropriate.
- Let navigation, filters, and secondary context stay visible when that helps
  the task.

## Visual Direction Rules

- Define a visual thesis early: calm utility, editorial clarity, technical
  precision, playful energy, premium restraint, etc.
- Choose type, spacing, color, radius, and motion to reinforce that thesis.
- Avoid generic default aesthetics that could belong to any app.
- Use contrast in scale, weight, and spacing to create hierarchy before adding
  more color.
- Motion should clarify cause and effect, not distract from work.
- Use real assets when the visual language depends on texture or illustration
  that code cannot reproduce faithfully.

## Interaction Quality Rules

- Every control needs obvious default, hover, focus, active, disabled, and
  error behavior when relevant.
- Feedback must be fast and visible after taps, clicks, submissions, and data
  refreshes.
- Feedback should appear near the action that caused it whenever possible.
- Forms should reduce effort with sensible defaults, progressive disclosure,
  inline validation, and forgiving recovery.
- Raw backend, provider, or validation messages should be translated into
  user-language recovery states unless the user is explicitly in a developer or
  operator surface.
- Navigation should adapt to width instead of remaining frozen in one pattern.

## Accessibility And Performance Rules

- Readability beats style experiments.
- Touch targets, contrast, focus visibility, and zoom resilience are required.
- Fancy visuals must earn their cost; if motion or media harms responsiveness,
  simplify it.
- Perceived performance is part of design quality.
- Performance optimization should not become an excuse for avoidable visual
  downgrades; choose the right asset strategy instead.

## Definition Of "Pleasant"

An interface is pleasant when it feels:

- easy to understand
- stable and trustworthy
- visually intentional
- responsive to input
- comfortable across devices
- consistent enough to learn quickly
