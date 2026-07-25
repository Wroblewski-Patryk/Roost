# App Completion Index

Generated: 2026-07-24T17:57:48.628Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.
Internal functions and modules are implementation details: they receive proof through their owning product boundary and are not dispatched as one issue per symbol.

## Counts

- Items: 46
- User flows: 4
- Needs browser/screenshot review: 0
- Missing test link: 0
- Missing doc link: 0
- Implemented, needs proof: 0
- Blocked: 0
- Known non-ok risk items: 0
- Priority review items indexed: 0/0
- Priority review truncated: false

## Flow Summary

- Unclassified user workflow: 25 entities; risks {"ok":25}; gates {"auth":21}
- Account access: 19 entities; risks {"ok":19}; gates {"auth":19,"configuration":4}
- Dashboard overview: 1 entities; risks {"ok":1}; gates {}
- User configuration: 1 entities; risks {"ok":1}; gates {"auth":1,"configuration":1}

## Priority Review Queue

_None._

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
