# V1 Settings Canonical Spec

Date: 2026-05-15
Stage: planning
Task: `V1SETTINGS-001`

## Purpose

This spec defines the canonical V1 direction for the private settings module.
Settings should become one owner and AI administration center instead of a set
of separate provider pages.

The owner outcome is:

```text
I can control application defaults, integrations, trusted knowledge, callable
tools, API keys, MCP visibility, and approval safety from one calm settings
surface before Jarvis, Paperclip, or future applications use CompanyCore.
```

## Canonical Images

- Desktop target:
  `docs/ux/assets/companycore-v1-settings-desktop-canonical.png`
- Mobile target:
  `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`
- Render source:
  `docs/ux/assets/companycore-v1-settings-canonical.html`

These images are planning targets for the next implementation slice. They are
not production proof until the React route is built and verified.

## Route Direction

The current route set should converge into one settings module:

- `/settings` should become the canonical settings entry route.
- `/settings/integrations`, `/settings/drive`, `/settings/api`, and
  `/react-agent-tools` should become tab-aware or section-aware entry points
  into the same settings module.
- Legacy provider-shaped routes should remain only as redirects or temporary
  compatibility paths until references are cleaned.

## Information Architecture

Top-level settings tabs:

| Tab | Purpose |
| --- | --- |
| General | Workspace identity, owner preferences, application defaults, locale, safe defaults. |
| Integrations | Provider readiness and setup lanes for ClickUp and Google Drive. |
| Knowledge | Trusted sources, Drive roots, imports, area ownership, freshness, proof quality. |
| Tools | Callable agent/application tools, tool profiles, risk tiers, approval behavior. |
| API | Service keys, profiles, rotation, least-privilege access, active clients. |
| MCP | Manifest visibility, transport details, tool catalog, guardrails, external app readiness. |
| Access & audit | Owner approvals, agent activity, import history, mapping changes, key use evidence. |

## Layer Model

Settings should separate two AI-facing layers:

- `Knowledge`: what the agent or future app can know.
- `Tools`: what the agent or future app can do.

The implementation should also keep two supporting layers visible:

- `Access`: who or what can use the knowledge and tools.
- `Audit`: what happened, when, under which key/profile, and whether owner
  approval was required.

This prevents a provider form from mixing OAuth, imports, mapping, API keys,
MCP routes, and permissions in one dense screen.

## Integration Setup Pattern

Each provider should use the same step lane:

```text
Connect -> Scope -> Import / Sync -> Map -> Verify
```

For Google Drive:

- `Connect`: OAuth client readiness and owner consent.
- `Scope`: selected root folders that become trusted knowledge candidates.
- `Import`: Docs, Sheets, files, folders, and change reconciliation.
- `Map`: assign imported items to operating areas.
- `Verify`: freshness, readable content, AI-safe proof, and unmapped debt.

For ClickUp:

- `Connect`: token or future OAuth readiness.
- `Scope`: workspaces, spaces, folders, lists.
- `Import / Sync`: task and execution evidence refresh.
- `Map`: assign lists/tasks to operating areas and workflows.
- `Verify`: task pressure, ownership, stale sync, and agent-safe action status.

## Desktop Layout

- Reuse the private V1 atlas shell and dark area sidebar.
- Use a compact top command bar with settings breadcrumb, search, and status
  cluster.
- Show a settings hero that explains the owner/AI purpose and exposes high
  signal metrics: knowledge items, MCP tools, providers, guarded actions.
- Place the top-level settings tabs below the hero.
- Use a three-column body for integration-heavy settings:
  - left: integration layer list and provider cards;
  - center: selected provider setup lane with stepper, scope list, area map,
    and review queue;
  - right: AI readiness rail for knowledge, tools, MCP, and audit.

## Mobile Layout

- Use the existing mobile private topbar pattern.
- Stack the hero, horizontal settings tabs, provider cards, selected setup
  lane, AI readiness, and review queue.
- Keep tabs horizontally scrollable.
- Keep provider steps horizontally scrollable instead of compressing labels.
- Do not require the user to inspect a tiny full desktop settings grid.
- No horizontal overflow.

## States

Every implemented tab must define:

- `loading`: local skeleton or notice for the selected tab only.
- `empty`: honest missing setup state with one next action.
- `error`: user-language recovery message, not raw backend/provider error.
- `success`: saved, imported, mapped, or key-created confirmation near the
  action that produced it.
- `review`: scoped warnings for unmapped knowledge, stale sync, broad keys,
  missing approval gates, and unverified MCP exposure.

## Quality Bar

- Settings should feel like an operating control room, not an admin dump.
- The first read must answer what is connected, what agents can know, what
  agents can do, and what still needs owner review.
- Provider setup must be split by decision type, not by one giant form.
- Agent access must stay least-privilege and visibly guarded.
- No fake readiness metrics, placeholder integrations, or invented provider
  data may be shown in implementation.
