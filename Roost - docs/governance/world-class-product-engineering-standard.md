# World-Class Product Engineering Standard

This standard translates strong public engineering practices into a compact
agent-usable checklist for this repository.

## Reference Models

- Google SRE: define user-centered SLIs/SLOs, use error budgets to balance
  reliability and release pace, and choose only indicators that reflect what
  users care about.
- DORA: improve software delivery with small batches, continuous testing,
  deployment automation, version-controlled production artifacts, pervasive
  security, and loosely coupled architecture.
- Microsoft SDL and OWASP SAMM: treat security as lifecycle work, not a final
  audit. Include requirements, threat modeling, secure implementation,
  verification, release readiness, and response learning.
- GitLab product development flow: de-risk work through problem validation,
  solution validation, build, verification, launch, and post-launch
  improvement. Keep documentation and stakeholder visibility part of the work.
- Apple, Material, and Nielsen Norman usability guidance: user interfaces
  should be clear, consistent, accessible, responsive, forgiving, and written
  in the user's language.

## Public Source Links

- Google SRE: https://sre.google/sre-book/service-level-objectives/
- DORA continuous delivery capabilities:
  https://dora.dev/capabilities/continuous-delivery/
- DORA delivery metrics: https://dora.dev/guides/dora-metrics/
- Microsoft SDL practices:
  https://www.microsoft.com/en-us/securityengineering/sdl/practices
- OWASP SAMM: https://owasp.org/www-project-samm/
- GitLab product development flow:
  https://handbook.gitlab.com/handbook/product-development-flow/
- Apple Human Interface Guidelines:
  https://developer.apple.com/design/human-interface-guidelines/
- Nielsen Norman usability heuristics:
  https://www.nngroup.com/articles/ten-usability-heuristics/

## Repository Standard

Every important product or engineering change should answer:

- Why is this worth doing now?
- Who benefits or who is protected?
- What is the smallest safe slice?
- What existing contract, component, or architecture path is reused?
- What can fail and how will the system recover?
- How will we know it worked after release?

## Required Thinking By Scope

### Product or UX

- Define the user problem.
- Define the primary user journey.
- Define the success signal.
- Validate the screen against `docs/ux/evidence-driven-ux-review.md`.
- Avoid shipping visible future-facing controls that do not work.

### Runtime or Backend

- Define the real data path and ownership boundary.
- Define expected failure modes and safe responses.
- Add or update tests for success and at least one meaningful negative path.
- Update observability, smoke, and rollback notes when runtime behavior changes.

### Deployment or Operations

- Define the deploy target, health check, smoke path, and rollback path.
- Record environment and migration expectations.
- For risky changes, prefer feature flags, staged rollout, or a reversible
  release sequence.

### Security, Privacy, AI, Auth, or Money

- Define data classification and owner.
- Define trust boundaries and permission checks.
- Include threat modeling or abuse cases.
- Include fail-closed behavior.
- Run adversarial validation appropriate to the risk.

## Lightweight Metrics

Track these when the project is mature enough:

- lead time from task start to merged/deployed
- deployment frequency
- change failure rate
- failed deployment recovery time
- rework rate
- recurring defect themes
- user-visible UX regressions
- incident and rollback count

Metrics are for improving the system, not for judging individuals.

## Agent Handoff Standard

Every substantial handoff should include:

- context and active source of truth
- files or modules touched
- validation evidence
- risks and assumptions
- deploy or user impact
- next tiny task
