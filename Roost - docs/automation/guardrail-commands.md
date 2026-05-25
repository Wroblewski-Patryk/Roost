# Guardrail Commands

Last updated: YYYY-MM-DD

## Purpose

List commands that validate project health and should be run before important
handoffs, releases, or broad autonomous work.

## Commands

| Command | Purpose | When to run | Expected evidence |
| --- | --- | --- | --- |
| `npm test` | Example test command | Before release | Passing output |

## Rule

If a guardrail command is flaky or environment-dependent, document the required
environment and the fallback proof.
