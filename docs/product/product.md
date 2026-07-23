# Product Definition

## Product Goal

- Core user problem: a company owner needs one governed place to understand,
  organize, and expose company work, knowledge, and AI-agent access without
  splitting truth across ad hoc tools.
- Core promise: Roost provides a workspace-scoped web/API/MCP operating core
  where humans and agents act through one audited boundary.
- Business intent: sell or grant guided v1.0 access to a reliable company
  operating foundation before expanding into broader hosted or autonomous
  product claims.

## Target Users

- Primary user: owner or operator of one company workspace
- Secondary user: supervised AI agent using scoped service keys through API/MCP
- Early adopter profile: teams willing to accept guided onboarding, manual
  rollout, and a read-safe knowledge-plane posture in exchange for a coherent
  operational core

## Product Rules

- Key constraints: PostgreSQL is source of truth, API is the supported
  integration boundary, MCP must stay a thin wrapper, and cross-workspace
  access must fail closed.
- Trust or safety expectations: risky MCP commands require supervision, agents
  do not get direct DB/provider access, and secrets stay encrypted and redacted.
- Data sensitivity notes: workspace business data, service API keys,
  integration settings, imported knowledge, and owner sessions are all
  sensitive surfaces.
- UX complexity policy: v1 prioritizes clear owner control, readiness
  visibility, and safe operational flows over decorative or autonomous
  behavior.

## Success Signals

- Usage success: owner can set up a workspace, inspect company context, import
  knowledge, and expose scoped API/MCP access with confidence.
- Quality success: generated app-completion remains zero-gap and release claims
  stay aligned with dated evidence.
- Delivery success: Roost can be positioned as a guided v1.0 pilot without
  overclaiming hosted or autonomous capabilities.
