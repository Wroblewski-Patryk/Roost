# Product Delivery System

Last updated: 2026-05-11

## Purpose

This is the "paper and pencil" layer for agent-built applications. It turns
architecture, user notes, references, screenshots, PNG mockups, and product
ideas into a concrete implementation map before agents start writing code.

Use `.agents/state/delivery-map.md` as the current build map.

## Required Decomposition

Before broad implementation, decompose work across product intent, user
journeys, screens and states, frontend routes/components, backend/API
contracts, data ownership, integrations, runtime/workers, security/privacy,
operations, and tests/evidence.

Every layer should either have a concrete implementation path or an explicit
`not applicable` note.

## Visual Reference Workflow

When a screenshot, PNG, Figma frame, reference site, or visual note drives work,
record it, slice it into layout zones and components, map states, reuse shared
patterns, implement shell-first, capture rendered evidence, and record gaps.

Treat parity references as specifications, not inspiration.

## Definition Of Ready

A mission is ready only when target outcome, architecture source, owned scope,
exclusions, blockers, acceptance criteria, validation plan, and rollback or
recovery path are known or explicitly deferred.

## Traceability Rule

Every mission should connect:

`idea / architecture / reference -> delivery map row -> mission -> code -> validation evidence -> module confidence row`
