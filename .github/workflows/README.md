# Workflow Guidance

Add real GitHub Actions workflows only after the project stack and validation
commands are known.

Recommended minimum:
- CI for lint, typecheck, tests, and build
- optional deploy workflow only after the deployment contract is documented

Keep workflow commands aligned with `.codex/context/PROJECT_STATE.md`.
