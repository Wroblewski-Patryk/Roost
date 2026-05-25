# Tooling Contract

Last updated: YYYY-MM-DD

## Purpose

Define which commands, scripts, MCP tools, provider actions, and automations
agents may use.

This contract complements `docs/operations/approval-aware-agent-command-flow.md`.

## Principles

- Prefer read-only discovery before writes.
- Risky commands need explicit policy and evidence.
- Missing command classification means risky by default.
- Agents must not bypass project APIs or service boundaries.

## Command Catalog

Use `agent-command-catalog.csv` as the machine-readable index.

## Maintenance Rule

When a new script, command route, MCP action, or provider operation is exposed
to agents, add it to the catalog with safety classification.
