# Product Intake And Decision Handshake

Agents must not turn vague product intent into implementation by guessing the
product. Use this intake layer before greenfield app work, major feature work,
architecture changes, UX redesigns, and ambiguous fixes.

Convert intent into a shared target:

`request -> clarified intent -> explicit assumptions -> decisions -> delivery map -> mission -> evidence`

## When To Use

Use this process when the user asks for a new app, broad feature, workflow,
screen, integration, AI behavior, architecture change, mobile behavior, or
ambiguous fix whose success criteria are not testable yet.

## Intake Questions

Ask the smallest useful set, usually 3 to 7 questions:

- What exact problem should this solve?
- Who is the primary user?
- What is the first successful end-to-end journey?
- What must be excluded from v1?
- What domain rules, calculations, permissions, or failure cases matter?
- What visual references, screenshots, sketches, or tone should guide the UI?
- What does "done" mean, and what proof should the agent run before reporting
  success?

## Assumption Protocol

1. Write explicit assumptions.
2. Mark each assumption as `safe`, `risky`, or `blocking`.
3. Continue only with safe assumptions.
4. Stop for user confirmation on blocking assumptions.
5. Record accepted assumptions in `.agents/state/decision-register.md`.

## Decision Register

Maintain `.agents/state/decision-register.md` for accepted product,
architecture, UX, data, integration, and delivery decisions. Accepted decisions
become project memory. Superseded decisions must say what replaced them.

## Greenfield Flow

1. Run intake until the first useful version is clear.
2. Create or update the app blueprint.
3. Record assumptions and decisions.
4. Create the delivery map.
5. Create the first mission.
6. Build the thinnest end-to-end slice.
7. Prove the journey with real validation before expanding breadth.

## Brownfield Flow

1. Identify the current user-visible problem or expansion goal.
2. Find the affected journey in module confidence and delivery map.
3. Add the missing journey first if it does not exist.
4. Check whether the request changes an accepted decision.
5. Update the decision register when target behavior changes.
6. Build and validate against existing architecture and acceptance criteria.
