# Screen Quality Checklist

Use this checklist for every major screen or flow before calling it polished.

## Core Questions

- Is the screen's purpose obvious within the first viewport?
- Is the primary action visually dominant?
- Is the information hierarchy clear without reading everything?
- Does the copy help the user act, not just describe?
- Can the user tell within 3 seconds what matters now, what is blocked, and
  what to do next?

## Layout Questions

- Does the screen have a clear rhythm in spacing and grouping?
- Are important sections visually distinct?
- Is there unnecessary repetition of cards, borders, or containers?
- Does the layout use width intentionally on larger surfaces?

## Asset Questions

- Does the screen depend on decorative or atmospheric imagery?
- If yes, was the correct medium chosen: code-native, SVG, or raster asset?
- Were canonical background elements preserved instead of approximated away?
- Are page-level and card-level background treatments intentionally separated?

## State Questions

- Is `loading` calm and informative?
- Is `empty` helpful and action-oriented?
- Is `error` recoverable and understandable?
- Is `success` visible without being disruptive?
- Are loading, error, and success states local to the action or section where
  they happened?
- Are raw backend or provider errors hidden behind user-language recovery copy?

## Interaction Questions

- Are tap and click targets comfortable?
- Is feedback immediate after user actions?
- Are hover, focus, disabled, and destructive states obvious where relevant?
- Does the flow reduce effort with defaults, previews, and sensible sequencing?

## Responsive Questions

- Does mobile feel like a first-class layout?
- Does tablet have its own layout logic instead of simple scaling?
- Does desktop use space for speed, context, and scanning?
- Does navigation adapt to screen width and input mode?

## Accessibility Questions

- Is body text readable without strain?
- Is contrast strong enough in real usage?
- Is focus visible?
- Can the flow work without relying only on color?

## Polish Questions

- Does the screen feel intentional rather than generic?
- Are motion and transitions helping comprehension?
- Is there at least one detail that makes the experience more pleasant?
- Would this screen still feel strong if screenshots were compared side by side
  with a high-quality product?
- If a canonical reference exists, is the remaining difference documented and
  explicitly acceptable?
