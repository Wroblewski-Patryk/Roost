# Security Baseline

## Always Check

- auth and session boundaries
- secrets and env ownership
- ownership and authorization rules
- rate limiting and abuse controls
- logging without secret leakage

## Elevated Risk Areas

- AI-assisted flows
- money-impacting flows
- background jobs with retries
- webhook handlers
- deployment and secret rotation changes

## Required Validation For Risky Changes

- fail-closed behavior
- authorization boundaries
- retry and idempotency safety
- negative-path verification

## AI Security Rule

AI systems must be tested against prompt injection, data leakage, and unauthorized access before deployment. Use `AI_TESTING_PROTOCOL.md` and `.codex/agents/ai-red-team-agent.md` for reproducible red-team scenarios.

AI, auth-sensitive, money-impacting, and cross-user data flows must fail closed when authorization, ownership, tool access, model memory, or policy validation is ambiguous.
