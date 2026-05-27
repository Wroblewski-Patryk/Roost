# LUC-271: Deployment-Mode Acceptance Criteria Clarification

Date: 2026-05-27  
Owner: Product Lead  
Parent Closure Path: LUC-259 (via LUC-266 reopen triage)

## Scope

Clarify and make testable the acceptance criteria split between:

- `local_trusted`
- `authenticated` with `private` exposure
- `authenticated` with `public` exposure

This delta is limited to acceptance criteria clarity and closure-readiness, not implementation.

## Canonical Definitions

- `local_trusted`: no-login local mode; loopback-only trust boundary.
- `authenticated`: login-required mode with shared auth stack.
- `authenticated/private`: authenticated mode for private-network exposure (LAN/VPN/Tailscale).
- `authenticated/public`: authenticated mode for internet-facing exposure.

## Acceptance Criteria (Testable)

1. Mode model is unambiguous:
- Exactly two runtime modes are documented and validated: `local_trusted` and `authenticated`.
- `private/public` are documented as exposure policies under `authenticated`, not standalone runtime modes.

2. `local_trusted` behavior is explicit:
- Login is not required for local operator actions.
- Bind policy is loopback-only for default safe operation.
- Mode is presented as the default in interactive onboarding.

3. `authenticated/private` behavior is explicit:
- Login is required.
- Private host trust policy is required.
- Auto base URL mode is allowed (no mandatory explicit public URL).
- Supported with private-network bind strategies (`loopback`, `lan`, `tailnet`, `custom`).

4. `authenticated/public` behavior is explicit:
- Login is required.
- Explicit public base URL is required.
- Doctor/deployment checks apply stricter public-surface validation.

5. Migration and ownership path is explicit:
- Transition from `local_trusted` to `authenticated` requires a claim flow that transfers board ownership from local implicit admin to a signed-in user.
- Post-claim state preserves instance-admin capability for the claiming user.

6. Config contract is explicit and non-ambiguous:
- `server.mode` uses only `local_trusted | authenticated`.
- `server.exposure` is required when `server.mode=authenticated`, with only `private | public`.
- No compatibility aliases for dropped/legacy mode names are accepted in closure criteria.

7. Verification commands are documented:
- Interactive setup path (`onboard`, `configure`) and validation path (`doctor`) are listed as acceptance verification surfaces.

## Closure Check For LUC-271

LUC-271 is closure-ready when all seven criteria above are present in canonical deployment documentation and referenced by roadmap audit tracking for LUC-259 closure.
