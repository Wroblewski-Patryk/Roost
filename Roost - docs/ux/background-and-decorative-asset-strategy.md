# Background And Decorative Asset Strategy

Use this file when a design includes non-trivial background visuals, ambient
illustration, texture, or decorative overlays.

## Principle

Backgrounds are part of the product surface, not disposable filler.

If the reference design depends on artful imagery, soft illustration, or
specific atmosphere, that visual layer must be treated as a real asset
decision, not improvised with generic gradients.

## Choose The Right Medium

### Prefer Code-Native Styling When

- the effect is geometric and simple
- the effect is repeatable through tokens
- the result can be reproduced faithfully with gradients, borders, shadows,
  blur, and transforms
- responsiveness requires dynamic resizing without quality loss

### Prefer SVG When

- the artwork is vector-friendly
- edges must remain crisp
- a decorative motif needs scaling flexibility
- the scene is illustrative but not painterly

### Prefer Raster Assets When

- the reference uses watercolor, grain, paper, fog, clouds, glow bloom, or
  painterly depth
- the background has subtle tonal complexity that code will flatten
- the decorative layer contains texture that matters to the brand feel
- repeated gradient experimentation is replacing straightforward asset use

## Anti-Approximation Rule

Do not replace a canonical image-based background with:

- one or two radial gradients
- a blur blob cluster
- a washed-out tint overlay
- a simplified geometric substitute

unless the task explicitly allows stylistic adaptation instead of fidelity.

## Asset Production Rule

When the reference requires a raster background:

- generate or export the asset intentionally
- crop or compose it for the actual target container
- version it like any other UI asset
- record where and why it is used

If the asset is derived from a canonical mockup, note that relationship in the
task or UX docs.

## Container-Specific Backgrounds

Treat these as separate decisions:

- full-page atmosphere
- hero or top-panel background
- card-level decorative wash
- sidebar decorative illustration

Do not assume one background treatment should cover all of them.

## Validation Questions

- Is the asset materially closer to the canonical design than a CSS
  approximation would be?
- Does the asset preserve the intended softness, depth, and composition?
- Is the file format appropriate to the visual effect?
- Is the implementation robust across responsive sizes?
