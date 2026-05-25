# UI Scorecard

Use this scorecard during design reviews, implementation reviews, and
pre-release UX passes.

Score each category from `1` to `5`.

- `1` = weak or unresolved
- `3` = acceptable but unremarkable
- `5` = excellent and clearly intentional

## Categories

### Clarity

- Is the purpose of the screen obvious within seconds?
- Is the primary action immediately understandable?
- Is the information architecture easy to scan?

### Hierarchy

- Do size, spacing, contrast, and placement create a clear reading order?
- Are important elements obviously more important?
- Are groups and sections visually distinct without clutter?

### Usefulness

- Does the screen help the user complete the job quickly?
- Are the right controls visible at the right time?
- Is friction reduced instead of shifted elsewhere?

### Visual Direction

- Does the screen feel intentional instead of generic?
- Does it match the approved visual thesis?
- Are typography, color, spacing, and surfaces working together?

### Delight

- Does the screen feel pleasant to use?
- Are details like empty states, transitions, and feedback thoughtfully handled?
- Is there enough personality without hurting clarity?

### Responsive Quality

- Does mobile feel native to mobile instead of compressed desktop?
- Does tablet use extra space meaningfully?
- Does desktop improve speed and scanability with width?

### State Design

- Are `loading`, `empty`, `error`, and `success` handled well?
- Do transient states feel stable and informative?
- Does the user always know what is happening?

### Accessibility

- Are contrast, focus states, target sizes, and readable type solid?
- Can the flow be understood without relying on color alone?
- Does the screen remain usable under zoom and keyboard navigation when
  relevant?

### Performance Feel

- Does the interface feel responsive and lightweight?
- Do animation and media support, rather than delay, the task?
- Is perceived performance protected during real workflows?

## Suggested Thresholds

- `4.0+` average: strong release candidate
- `3.5 - 3.9`: acceptable, but review the weakest category
- `<3.5`: revise before calling the screen polished

## Review Template

```markdown
### Screen / Flow
- Name:
- Reviewer:
- Date:

### Scores
- Clarity:
- Hierarchy:
- Usefulness:
- Visual Direction:
- Delight:
- Responsive Quality:
- State Design:
- Accessibility:
- Performance Feel:

### Strongest Areas
- TBD

### Weakest Areas
- TBD

### Required Fixes Before Approval
- TBD
```
