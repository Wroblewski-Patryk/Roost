# Canonical Visual Implementation Workflow

Use this workflow when a project has an approved target screen, screenshot, or
mockup that implementation should match closely.

The canonical visual is not inspiration. It is a specification.

## Goal

Prevent "close enough" approximations when the task requires a polished,
high-fidelity result.

## Core Contract

- The canonical visual is a specification, not inspiration.
- Work one surface at a time.
- Do not move to the next dependent surface until the current one is judged at
  `95%` parity or higher against the active spec.
- The active spec can be:
  - the canonical screenshot, mockup, or frame alone
  - or the canonical visual plus explicit user-requested interpretation notes
- If user-requested notes conflict with each other or with a previously
  accepted interpretation, stop and ask the user to decide before continuing.
- Do not silently downgrade image-rich or textured visual fidelity into generic
  gradients or theme-only approximations.

## Required Stages

### 1. Canonical Intake

- Identify the exact approved reference:
  - Figma frame
  - approved static mockup
  - approved screenshot
- Record the source in the task.
- Confirm whether the target is:
  - pixel-close implementation
  - structurally faithful implementation
  - style-inspired implementation

If the target fidelity is not explicit, do not assume. Record the assumption or
ask for clarification before broad implementation.

### 2. Visual Decomposition

Break the screen into:

- layout structure
- reusable components
- typography system
- decorative assets
- background assets
- surface treatments
- motion and interaction details

Do not merge all decorative work into "background styling".

### 3. Asset Strategy

For each decorative or background element, decide whether it should be:

- code-native CSS or native drawing
- SVG asset
- raster asset such as PNG or WebP

Use generated or exported image assets when the canonical design contains:

- painterly textures
- watercolor clouds
- soft organic shapes with irregular edges
- layered atmospheric scenes
- detailed decorative botanical or illustrated motifs
- lighting effects that are difficult to reproduce faithfully in code

Do not replace those with generic gradients unless the project explicitly
approves a lower-fidelity adaptation.

### 4. Gap Audit

Before implementation, compare the current UI against the canonical reference
and record:

- missing assets
- missing spacing or alignment details
- missing hierarchy differences
- missing visual texture or illustration
- missing state or interaction details
- anything currently approximated that should become a real asset

If the user has provided explicit deviations from the screenshot, record them
as approved interpretation notes and include them in the same gap audit.

Turn the gap audit into concrete tasks.

### 5. Implementation Sequencing

Recommended order:

1. asset preparation
2. structural layout parity
3. component styling parity
4. decorative and background parity
5. interaction and state parity
6. screenshot comparison pass

For multi-surface product shells, close shared dependencies first. A typical
order is:

1. public or unauthenticated shell frame
2. shared navigation pieces
3. public entry or home surface
4. authenticated shell frame
5. authenticated sidebar or shared navigation pieces
6. primary dashboard or overview surface
7. secondary workflow surfaces
8. detail or module-specific surfaces

Do not work broadly across later surfaces while an earlier dependent surface is
still visibly drifting from the active spec.

### 6. Screenshot Comparison Pass

- Capture the implemented screen in the browser.
- Compare it side by side against the canonical reference.
- List remaining mismatches explicitly.
- Do not stop at "the vibe is similar".

### 7. Quick Closure Check

After each surface slice:

1. capture the latest implementation screenshot
2. list the top 5 to 10 remaining visible mismatches
3. decide whether the current surface is at least `95%` aligned
4. only then move to the next dependent surface

If the answer is below `95%`, continue on the same surface instead of opening a
new module lane.

### 8. Closure Rule

Do not mark the task polished or done when:

- decorative assets were approximated without explicit approval
- screenshot comparison was skipped
- remaining mismatches are known but undocumented
- the UI matches only by theme, not by composition and detail
- the active surface is below the agreed parity threshold

## Output Expectations

Every high-fidelity visual task should leave behind:

- the canonical reference location
- the asset strategy used
- the gap list
- the screenshot comparison evidence
- the remaining mismatch list or explicit parity confirmation
- the interpretation notes that were treated as part of the active spec
