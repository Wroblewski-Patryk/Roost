# Roost Brand Book v1

Last updated: 2026-05-24

## Brand Description

Roost is the operational center for LuckySparrow: the digital nest where
people, AI agents, processes, knowledge, tasks, pipelines, and company
resources cooperate.

Roost is not a classic ERP and not another task manager. It is the operating
system for an autonomous organization, designed for both human web UI and
agent-facing API/MCP access.

The brand must communicate:

- control without chaos
- modernity without exaggerated cyberpunk
- minimalism
- modularity
- system intelligence
- the feeling of an ordered command center

## Visual Direction

Roost UI should feel like:

- an operations center
- a system-management layer
- a modern cockpit
- an autonomous-company interface

Avoid:

- gaming chaos
- heavy neon cyberpunk
- exaggerated hacker aesthetics
- generic SaaS card clutter

Prefer:

- subtle light
- depth
- dark surfaces
- thin outlines
- delicate gradients
- modular cards
- clear information hierarchy

## Typography

Primary font: `Inter`.

Reason:

- modern
- highly readable
- strong for dashboards and small UI sizes
- neutral
- aligned with minimalist operational products

Approved alternatives when needed:

- `Geist`
- `Satoshi`
- `Plus Jakarta Sans`

Default remains `Inter`.

Typography rules:

- headings use weight `600-700`
- uppercase is reserved for micro labels
- body text is neutral and readable with about `150%` line height
- UI labels use uppercase with `0.08em-0.12em` tracking

## Color System

The palette should suggest a night operations center, digital light,
technology, intelligence, and cool calm.

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#6366F1` | CTA, active elements, links, focus, active modules |
| Secondary | `#3B82F6` | information, hover, supporting accents, charts |
| Accent | `#06B6D4` | AI, MCP, synchronization, data-flow motion |
| Success | `#10B981` | success, online state, healthy processes |
| Base 100 | `#0D1117` | main background |
| Base 200 | `#161B22` | cards and panels |
| Base 300 | `#21262D` | borders and elevated surfaces |
| Neutral | `#1F2937` | secondary UI |
| Primary text | `#E5E7EB` | main content |
| Secondary text | `#9CA3AF` | secondary content |
| Muted | `#6B7280` | supporting and disabled content |

Brand gradient:

```css
linear-gradient(135deg, #6366F1 0%, #3B82F6 50%, #06B6D4 100%)
```

Use the gradient for glows, hero emphasis, active elements, and AI/data-flow
effects. Do not flood whole pages with strong gradients.

## DaisyUI Theme

```js
roost: {
  "primary": "#6366F1",
  "primary-content": "#FFFFFF",
  "secondary": "#3B82F6",
  "secondary-content": "#FFFFFF",
  "accent": "#06B6D4",
  "accent-content": "#FFFFFF",
  "neutral": "#1F2937",
  "neutral-content": "#E5E7EB",
  "base-100": "#0D1117",
  "base-200": "#161B22",
  "base-300": "#21262D",
  "base-content": "#E5E7EB",
  "info": "#3B82F6",
  "success": "#10B981",
  "warning": "#F59E0B",
  "error": "#EF4444"
}
```

## Component Style

Cards:

- dark glass
- light blur
- subtle border
- `rounded-2xl`
- very soft glow only where it clarifies hierarchy

Borders:

- default to `rgba(255,255,255,0.06)`

Shadows:

- soft and restrained
- avoid heavy black shadows

Icons:

- outline only
- thin stroke
- minimalist
- geometric
- consistent

Reference families:

- Phosphor Icons as the installed primary family
- Lucide, Heroicons outline, and similar systems as direction references

Animation:

- smooth
- calm
- system-like
- fade, glow, subtle movement, and depth motion

Avoid flashy bounce, game-like motion, or noisy effects.

## Logo Direction

The logo should:

- work as an outline mark
- remain legible as a favicon
- use simple geometry
- be animation-friendly
- act as a system symbol

Approved motifs:

- sparrow
- nest
- letter `R`
- circle or orbit
- modularity
- connections and system graph

The current public UI may use a restrained placeholder mark until the final SVG
logo is supplied. The placeholder must not become a competing logo system.

## Reference Image Notes

The supplied brand reference confirms:

- ROOST wordmark in wide-spaced uppercase
- subtitle: "Centrum operacyjne Twojej firmy"
- Inter as the default typeface
- palette samples: `#6366F1`, `#3B82F6`, `#06B6D4`, `#10B981`,
  `#1F2937`
- DaisyUI token mapping for the `roost` theme
- brand principles: modern, functional, transparent/intuitive, productivity
  focused, human-supporting technology, clean outline design
- visual tags: `OUTLINE`, `MINIMAL`, `FUNCTIONAL`
- logo explorations based on sparrow, nest, circle/orbit, `R`, and modular
  geometry

## Public Homepage Rules

The public homepage should make Roost recognizable in the first viewport:

- logo or placeholder mark must link to `/`
- no separate `Home` nav item is needed
- language selection belongs in the footer
- hero must not be a long list of department cards
- hero should show a central operating-system signal: topology, command core,
  data-flow layer, cockpit surface, or system graph
- the next section should peek below the first viewport on desktop and mobile
- footer attribution should read `Made with [theme-colored symbol] by
  luckysparrow.ch`

## Emotional Target

Roost should make the user feel:

- "I have control over the system."
- "This is the operational center."
- "The company is alive."
- "AI collaborates with people."
- "This is modern, but practical."
