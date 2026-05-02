# Secure Development Lifecycle

Use this for auth, AI, money, user data, admin tooling, integrations, secrets,
permissions, and any feature with meaningful abuse potential.

## Security Lifecycle

1. Requirements
   - Identify protected data, identities, roles, and permissions.
   - Define compliance or privacy constraints if applicable.
2. Design
   - Draw trust boundaries.
   - Identify abuse cases and likely attacker goals.
   - Prefer approved security primitives and existing permission paths.
3. Implementation
   - Keep secrets out of code and logs.
   - Validate inputs at the boundary.
   - Enforce authorization server-side or at the trusted boundary.
   - Fail closed when ownership, identity, payment, or AI policy is uncertain.
4. Verification
   - Test allowed and denied paths.
   - Run static, dependency, or secret scans when available.
   - Include adversarial checks for AI-assisted flows.
5. Release
   - Confirm secure defaults, env ownership, logging safety, and rollback.
6. Response
   - Record incidents, suspected bypasses, and regression tests.

## Lightweight Threat Model

Use this prompt when risk is meaningful:

- Assets:
- Actors:
- Trust boundaries:
- Entry points:
- Abuse cases:
- Required controls:
- Tests or checks:
- Residual risk:

## Hard Blocks

Do not ship when:

- authorization is incomplete or only client-side
- secrets are committed, logged, or exposed to the browser unintentionally
- user data ownership is ambiguous
- AI output can trigger privileged actions without policy checks
- money-impacting behavior lacks fail-closed validation
- security evidence is missing for a high-risk change
