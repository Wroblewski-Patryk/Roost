# Settings API Route Body Usability Audit

Date: 2026-05-15
Scope: `/settings/api` route body, agent service keys, capability preview, and
MCP route exposure.

## Executive Summary

`/settings/api` is a high-trust owner surface. It controls service keys that
can be handed to agents, adapters, MCP bridges, and internal tools. Before this
slice, the route already had the important mechanics: profile-backed key
creation, scope preview, one-time raw key display, key rotation/deactivation,
capabilities, and route manifest filters. The UX risk was that the decision
flow was distributed across several panels.

The owner should be able to answer quickly:

- is agent access currently safe;
- what key or scope needs review;
- where to act before copying a key into another system.

## 100 Route-Body Findings And Fix Targets

| ID | Surface | Finding | Fix target |
| --- | --- | --- | --- |
| API-001 | First viewport | The route title says API but not whether agent access is safe. | Add safety command summary. |
| API-002 | First viewport | Current key risk is lower than base URL/auth trivia. | Promote active/scoped/broad key counts. |
| API-003 | First viewport | MCP exposure is important but appears later. | Add MCP tool count to command summary. |
| API-004 | First viewport | Supervision needs are not visible before the form. | Add supervised tool count. |
| API-005 | First viewport | Preset availability is not visible before choosing a profile. | Add preset count. |
| API-006 | First viewport | Mobile users need one action path before dense controls. | Add command action links. |
| API-007 | First viewport | Tablet view should balance priority and metrics. | Use responsive command grid. |
| API-008 | First viewport | Desktop has enough space for a safety brief. | Split brief and command cards. |
| API-009 | First viewport | Broad compatibility keys need review priority. | Flag broad active keys. |
| API-010 | First viewport | No-key state should be framed as a safe next step. | Show first scoped key guidance. |
| API-011 | Safety | The route needs fail-closed language for signed-out state. | Use signed-in priority detail. |
| API-012 | Safety | Broad keys can feel normal if only active count is shown. | Separate scoped and broad detail. |
| API-013 | Safety | Destructive tools need a visible supervision cue. | Count write/destructive exposure. |
| API-014 | Safety | Approval-required tools need owner attention. | Count supervised tools. |
| API-015 | Safety | Preset-backed scopes should be preferred. | Promote preset count and form anchor. |
| API-016 | Safety | Agent handoff action lacks a safety checklist. | Use command copy to preview before create. |
| API-017 | Safety | Existing keys need review path, not only creation path. | Add Review keys action. |
| API-018 | Safety | Route exposure needs a direct path. | Add Route exposure action. |
| API-019 | Safety | Integration readiness is related but secondary. | Keep integration map as secondary action. |
| API-020 | Safety | The preview panel should remain the source of exact scope impact. | Link supervision card to preview. |
| API-021 | Agent keys | The service-key form is powerful and dense. | Put command context above it. |
| API-022 | Agent keys | Key name field appears before owner knows intended preset risk. | Keep preset/preview visible in same form. |
| API-023 | Agent keys | Scope textarea can intimidate non-technical owners. | Preserve preset reset path. |
| API-024 | Agent keys | Missing MCP base scopes are easy to overlook. | Preview already flags missing scopes. |
| API-025 | Agent keys | Create button is high-risk when scopes are custom. | Command summary points to preview. |
| API-026 | Agent keys | Reset preset could be interpreted as safe reset for all fields. | Keep local to preset in current wording. |
| API-027 | Agent keys | One-time raw key state must stay highly visible. | Preserve copy-once panel. |
| API-028 | Agent keys | Copy key can lead to unsafe external handoff. | Command summary emphasizes preview first. |
| API-029 | Agent keys | Rotation creates a new raw key and should stay attention-heavy. | Preserve confirmation and copy-once status. |
| API-030 | Agent keys | Deactivation impact needs clear text. | Preserve confirmation copy. |
| API-031 | Existing keys | Existing key list is below creation controls. | Add review anchor. |
| API-032 | Existing keys | Active/inactive count lacks broad/scoped nuance. | Add command card detail. |
| API-033 | Existing keys | Scope preview is truncated to eight scopes. | Keep compact; future row detail can expand. |
| API-034 | Existing keys | Last-used date is useful but not prioritized. | Keep in row secondary text. |
| API-035 | Existing keys | Broad compatibility label can sound benign. | Command summary calls it broad review. |
| API-036 | Existing keys | Inactive keys can clutter long-term. | Future cycle can add filters. |
| API-037 | Existing keys | Rotate/deactivate buttons are small on mobile. | Existing responsive actions go full-width. |
| API-038 | Existing keys | No keys empty state is helpful but late. | Command summary sets first-key action. |
| API-039 | Existing keys | Key prefix is useful for ops matching. | Keep row prefix. |
| API-040 | Existing keys | Service key list should be anchorable. | Use existing `agentKeyList` id. |
| API-041 | Capabilities | Capabilities are important but abstract. | Keep as secondary after command. |
| API-042 | Capabilities | Owner may not know which capability enables MCP. | Future pass can group capabilities. |
| API-043 | Capabilities | Capability count appears in pills only. | Preserve; route-body command focuses on tools. |
| API-044 | Capabilities | Capability list can be long. | Future pass can add search/grouping. |
| API-045 | Capabilities | Capability names are technical. | Future copy can map to owner tasks. |
| API-046 | Capabilities | There is no direct command jump to capabilities. | Added section anchor. |
| API-047 | Capabilities | Missing capabilities can look like broken state. | Empty/loading copy remains. |
| API-048 | Capabilities | Capability list and route list can overlap conceptually. | Command summary points to route exposure. |
| API-049 | Capabilities | AI-facing capability meaning needs trust framing. | Command summary uses agent access language. |
| API-050 | Capabilities | Least privilege is not repeated near list. | Future pass can add grouping labels. |
| API-051 | Route workbench | Route workbench is useful but too late for risk assessment. | Add route exposure anchor. |
| API-052 | Route workbench | Method filters are good but route count is not command-level. | Command card reports MCP tools. |
| API-053 | Route workbench | Write route count was hidden in pills. | Keep in context pills. |
| API-054 | Route workbench | Route paths are technical and dense. | Keep monospace compact rows. |
| API-055 | Route workbench | Owner needs to connect routes to MCP tool exposure. | Command detail references MCP tools. |
| API-056 | Route workbench | Search routes is useful but not tied to agent action. | Route exposure action leads there. |
| API-057 | Route workbench | Empty route state is safe but could feel broken. | Existing empty copy remains. |
| API-058 | Route workbench | Method filter has no label explanation. | Existing label stays visible. |
| API-059 | Route workbench | Destructive/write route distinction should be surfaced. | Command card reports write/destructive tools. |
| API-060 | Route workbench | Route workbench needs stable anchor. | Add `api-routes-panel`. |
| API-061 | MCP | MCP manifest exposure is central but scattered. | Count MCP tools in command summary. |
| API-062 | MCP | Read/write/destructive balance is hidden until preview. | Add command detail. |
| API-063 | MCP | Approval-required tools need early warning. | Supervised command card. |
| API-064 | MCP | Missing MCP base scopes are route-critical. | Preserve preview warning. |
| API-065 | MCP | Relationship graph access is important for agents. | Preview retains graph read signal. |
| API-066 | MCP | Tool families are useful but secondary. | Preview keeps exact family list. |
| API-067 | MCP | Agent tools route should remain available. | Existing shell navigation handles it. |
| API-068 | MCP | MCP safety language should mention workspace scoping. | Context copy remains workspace-oriented. |
| API-069 | MCP | Raw provider secrets must never appear. | Existing backend contract unchanged. |
| API-070 | MCP | MCP route should not encourage direct DB access. | Existing manifest guardrails unchanged. |
| API-071 | Copy | "API" as H1 is too generic for owner intent. | Future copy pass should rename to Agent access. |
| API-072 | Copy | "Service key" is technical but accurate. | Pair with agent access command. |
| API-073 | Copy | "Capabilities" could be owner-hostile. | Future pass can add explanatory grouping. |
| API-074 | Copy | "Route workbench" is technical. | Command action uses route exposure wording. |
| API-075 | Copy | Jarvis/Paperclip/Aviary examples are useful but scattered. | Keep in summary and form copy. |
| API-076 | Layout | Base URL/auth cards precede safety work. | Command summary now carries priority. |
| API-077 | Layout | The route has multiple panels with equal weight. | Command summary creates hierarchy. |
| API-078 | Layout | On mobile, dense panels can feel like a wall. | Command cards collapse predictably. |
| API-079 | Layout | Context actions should not wrap into cramped rows. | Existing responsive actions full-width. |
| API-080 | Layout | Section anchors need scroll margin. | Add scroll-margin for key sections. |
| API-081 | Accessibility | Command cards must be text links, not icon-only controls. | Use readable anchors. |
| API-082 | Accessibility | Anchor links must be keyboard reachable. | Use native anchors and focus-visible styles. |
| API-083 | Accessibility | Form labels must remain visible. | No label removal. |
| API-084 | Accessibility | Existing controls need accessible names. | Preserve labels/aria labels. |
| API-085 | Accessibility | Copy-once key needs clear warning text. | Preserve copy-once paragraph. |
| API-086 | Accessibility | Mobile tap targets should not shrink. | Reuse existing button/action rules. |
| API-087 | Responsive | Command summary needs desktop/tablet/mobile columns. | 2-column summary, 4/2/1 command cards. |
| API-088 | Responsive | Long card labels can overflow. | Use existing wrap rules and compact text. |
| API-089 | Responsive | Route list table/rows must not cause page overflow. | Preserve compact-row wrapping. |
| API-090 | Responsive | Key raw code can be long. | Preserve code wrapping. |
| API-091 | States | Signed-out state needs safe message. | Priority detail handles sign-in. |
| API-092 | States | Empty key state needs first action. | Priority title handles first key. |
| API-093 | States | Broad key state needs review. | Priority title handles broad key review. |
| API-094 | States | Ready state needs maintenance instruction. | Priority detail handles ongoing review. |
| API-095 | States | Fallback presets should not look equal to backend profiles. | Preset card uses attention when profiles missing. |
| API-096 | Reuse | New UI should reuse vanilla patterns. | Use existing context card, buttons, pills. |
| API-097 | Scope | No backend/API changes should be required. | UI-only slice. |
| API-098 | Risk | Accidentally breaking key list id would break rendering. | Preserve `agentKeyList` id. |
| API-099 | Risk | Raw key display must not move below unsafe content. | Leave copy-once aside in key panel. |
| API-100 | Next cycle | This should feed the next route-body pass. | Document route-body command pattern. |

## Implemented Repair Strategy

| Repair | Findings covered | Implementation surface |
| --- | --- | --- |
| Safety command summary | API-001 through API-020, API-091 through API-095 | `public/app.js`, `public/styles.css` |
| Command cards and anchors | API-031 through API-040, API-046, API-051 through API-060, API-080 through API-082 | `public/app.js`, `public/index.html`, `public/styles.css` |
| MCP exposure summary | API-061 through API-070 | `public/app.js` |
| Responsive command grid | API-006 through API-008, API-078, API-087 through API-090 | `public/styles.css` |

## Deferred To Later UX Cycles

- Rename the H1 from `API` to owner-facing `Agent access`.
- Add capability grouping/search if capability review becomes a frequent
  operator workflow.
- Add key-list filters for large workspaces with many inactive keys.
- Add richer row detail for broad compatibility keys if any remain in
  production use.

## Acceptance Criteria

- `/settings/api` shows a safety command summary before dense key controls.
- The owner can jump to create key, review keys, preview supervision, and route
  exposure from the first route-body panel.
- Desktop, tablet, and mobile checks show no horizontal overflow, console
  issues, failed requests, or unnamed visible controls.
- Existing service-key create, copy-once, rotate, deactivate, capabilities,
  and route manifest behavior remain unchanged.
