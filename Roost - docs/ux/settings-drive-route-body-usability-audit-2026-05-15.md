# Settings Drive Route Body Usability Audit - 2026-05-15

## Context

- Route: `/settings/drive`
- Mission: V2VIS-005 Settings Drive Route Body UX Polish Cycle
- Design source: existing authenticated shell, route command strip, Google Drive integration workflow, and V2 foundation direction recorded in `docs/ux/design-memory.md`.
- User goal: connect Google Drive, choose useful folders, import knowledge, and keep area ownership clear for future AI and MCP use.
- UX bar: the route must answer what matters now, what is blocked, and what the next action is across desktop, tablet, and mobile.

## 100 Findings

| ID | Finding | UX Impact | Action |
| --- | --- | --- | --- |
| DRV-001 | The route opens with a technical setup form before a clear decision summary. | Owners must infer the workflow order. | Add a command summary above setup controls. |
| DRV-002 | OAuth status, folder selection, import, and area review are separate facts. | The next action is not obvious. | Collapse them into one priority message. |
| DRV-003 | The status pills are useful but low hierarchy. | Critical blockers compete with secondary counts. | Add stronger priority title and detail. |
| DRV-004 | "Drive connected" does not explain whether folders are imported. | Connection can be mistaken for completion. | Separate OAuth, selection, import, and area review states. |
| DRV-005 | "Consent required" does not point to the consent workflow. | Users may hunt through the form. | Link command card to setup panel. |
| DRV-006 | Selected folder count is not actionable. | Users cannot jump to folder selection. | Add a folder selection anchor. |
| DRV-007 | Imported item count is not actionable. | Users cannot jump to imported files. | Add an imported files anchor. |
| DRV-008 | Area ownership risk is hidden in a pill. | Agent context quality may be missed. | Promote unassigned folders as a command card. |
| DRV-009 | The right action column has only setup and review. | The workflow has more than two steps. | Add Select folders and Review import actions. |
| DRV-010 | The setup guide is long and competes with live state. | Mobile users see instructions before status. | Put command summary before the guide. |
| DRV-011 | No route-local summary says "imported knowledge is usable." | Success feels vague after import. | Add ready state copy. |
| DRV-012 | Missing client and missing consent are visually similar. | Users may paste a code before saving client data. | Stage OAuth state in command card value. |
| DRV-013 | A disconnected state does not say owner auth is required. | Signed-out users see disabled controls without enough guidance. | Add signed-out priority copy. |
| DRV-014 | Imported folders need an ownership explanation. | Drive can become a file dump. | Tie area review to operating-area ownership. |
| DRV-015 | The route does not reinforce future AI/MCP usefulness. | Users may not know why mapping matters. | Mention agent-safe company context. |
| DRV-016 | The folder picker section has no stable anchor. | Command links cannot scroll precisely. | Add `#drive-folder-picker`. |
| DRV-017 | Imported files panel has no stable anchor. | Review links cannot scroll precisely. | Add `#drive-files-panel`. |
| DRV-018 | Anchor jumps can land under sticky chrome. | Users lose section headings. | Add scroll margins. |
| DRV-019 | Count cards are absent. | Scanning the route is slower. | Add four compact command cards. |
| DRV-020 | The route does not make incomplete import visible on desktop first viewport. | Users may stop after OAuth. | Show import readiness before form fields. |
| DRV-021 | Mobile density is mostly form-first. | The route feels like admin plumbing. | Use a one-column command summary on mobile. |
| DRV-022 | Tablet layout can flatten without keeping status hierarchy. | The route becomes a long stack. | Preserve command-card grouping. |
| DRV-023 | OAuth client saved without token is a distinct state. | The current summary underplays this middle step. | Use "Consent" as card value. |
| DRV-024 | Selected folders with no imported files is a risky partial state. | Users may think save selection imports data. | Prioritize "Import selected folders." |
| DRV-025 | Imported folders without area ownership weaken AI answers. | Future MCP agents lose operating context. | Prioritize area review when needed. |
| DRV-026 | Area review success is not celebrated. | Users cannot tell mapping is complete. | Show "folders have context." |
| DRV-027 | The route needs a clear relation to `/areas`. | Area mapping can feel separate from Drive. | Link completed area review card to `/areas`. |
| DRV-028 | Relationships are still a secondary action. | Sync graph work is not framed as immediate setup. | Keep relationship link but lower than setup flow. |
| DRV-029 | The command summary should not introduce fake data. | Trust depends on real state. | Use existing `state.googleDrive` counts only. |
| DRV-030 | The summary must work when signed out. | Private routes can still render before session. | Derive signed-out blocker copy. |
| DRV-031 | The summary must work before Drive config loads. | Empty arrays must not break rendering. | Reuse defensive state fallbacks. |
| DRV-032 | Selected folder IDs can come from saved config or input. | The count can drift if only one source is used. | Keep combined parse logic. |
| DRV-033 | Imported folder count differs from item count. | Users need both breadth and ownership. | Show imported items plus folder count. |
| DRV-034 | Discovered folder count explains whether picker was loaded. | Selection blockers need context. | Include discovered folders in Selection card. |
| DRV-035 | The card color system should match existing route command cards. | Visual language stays coherent. | Reuse ready/attention/blocked tones. |
| DRV-036 | The route should avoid decorative redesign. | It is an operations tool. | Keep restrained workbench styling. |
| DRV-037 | Command cards need visible focus states. | Keyboard users need orientation. | Add hover/focus card affordance. |
| DRV-038 | Card text must fit small screens. | Long labels could clip. | Use compact labels and responsive columns. |
| DRV-039 | Buttons should remain secondary once summary exists. | The form should not feel overloaded. | Keep existing button hierarchy. |
| DRV-040 | The main setup panel should remain the edit surface. | Summary should not duplicate forms. | Link to existing controls. |
| DRV-041 | OAuth details are security-sensitive. | Summary must not expose secrets. | Show only configuration state. |
| DRV-042 | Authorization code state should remain private. | Summary should not reveal token data. | Show consent saved/missing only. |
| DRV-043 | Import mode stays lower priority. | Users choose it after selection. | Leave import mode in the form. |
| DRV-044 | Reconcile action is advanced. | It should not dominate first-run setup. | Keep reconcile in action row. |
| DRV-045 | The setup guide is necessary but verbose. | It supports edge cases after summary. | Leave guide but subordinate it. |
| DRV-046 | Current route context copy is good but not operational enough. | It explains scope but not next action. | Add command block beneath copy. |
| DRV-047 | Existing route command strip already gives global context. | Route body needs local execution detail. | Do not duplicate global nav details. |
| DRV-048 | The route is part of integration settings. | It should connect to relationships and areas. | Keep links to related modules. |
| DRV-049 | Drive import is foundational for V2. | Data quality matters before gamification. | Frame Drive as knowledge foundation. |
| DRV-050 | The summary should be testable without live Google OAuth. | Local validation cannot depend on external consent. | Test disconnected signed-in state. |
| DRV-051 | Production may have imported data. | Summary must scale to hundreds of files. | Use counts and compact copy. |
| DRV-052 | Imported file table can be empty. | Empty state should remain honest. | Do not claim data exists. |
| DRV-053 | Folder picker can be empty. | Empty picker should not look broken. | Keep existing empty note. |
| DRV-054 | Disabled form controls need a status explanation. | Signed-out states otherwise feel broken. | Priority copy covers owner login. |
| DRV-055 | The visual system already uses 8px radii. | New cards should match. | Use 8px radius. |
| DRV-056 | The route should not become a landing page. | It is an active admin tool. | Keep content dense and action-oriented. |
| DRV-057 | Mobile action stack needs direct anchors. | Scrolling a long form is costly. | Add compact action links. |
| DRV-058 | Tablet users need two-card scanning when possible. | Four one-column cards are too long. | Use two-column command grid below desktop. |
| DRV-059 | Desktop users need command cards in one row. | Status should be instant to scan. | Use four-column desktop grid. |
| DRV-060 | The heading should not change route identity. | Existing `Google Drive` title is correct. | Keep page title. |
| DRV-061 | Summary labels should be nouns. | Fast scanning improves. | Use OAuth, Selection, Imported, Area review. |
| DRV-062 | Values should be short. | Prevent card overflow. | Use `Ready`, `Consent`, `Missing`, or counts. |
| DRV-063 | Details should explain consequence. | Counts alone are weak. | Add small explanatory detail text. |
| DRV-064 | Area review card can point to two destinations. | Incomplete and complete states differ. | Link incomplete to file review, complete to areas. |
| DRV-065 | Anchor cards should retain SPA navigation for internal routes. | `/areas` must use router binding. | Add `data-link` when href starts with `/`. |
| DRV-066 | External Google links remain separate. | Summary should not open external consent directly. | Leave Google consent link in form. |
| DRV-067 | The route should not hide dangerous advanced fallback. | Folder IDs remain needed for fallback. | Keep advanced fallback field. |
| DRV-068 | Summary state should update after operations. | Users need immediate feedback. | Render from shared state function. |
| DRV-069 | The route should avoid manual string parsing beyond existing helper. | Reliability matters. | Reuse `parseIdList`. |
| DRV-070 | Existing `bindInlineNavigation` supports internal links. | No new router code needed. | Reuse it for command cards. |
| DRV-071 | The card should be accessible as links. | Keyboard users can act from summary. | Use anchors with real hrefs. |
| DRV-072 | The command grid needs an accessible label. | Screen readers need group purpose. | Add `aria-label`. |
| DRV-073 | The setup panel remains `aria-disabled` when signed out. | Summary must explain why. | Signed-out priority copy. |
| DRV-074 | The route has many action buttons in one row. | Summary reduces cognitive load before the row. | Add workflow-first summary. |
| DRV-075 | `Review folders` label was ambiguous. | It could mean picker or relationships. | Rename to `Review import`. |
| DRV-076 | `Select folders` should be direct. | It names the actual task. | Add action link. |
| DRV-077 | `Relationships` should stay available. | Synced resources affect graph review. | Keep relationship action. |
| DRV-078 | Drive state is not purely binary. | Active, configured, consented, selected, imported, mapped are separate. | Model staged priority. |
| DRV-079 | The visual polish should not require backend changes. | Scope stays narrow and reversible. | Implement route-body UI only. |
| DRV-080 | Existing tests can validate syntax/build. | Low risk but must gate commit. | Run Node check, build, tests. |
| DRV-081 | Browser proof should cover desktop. | First viewport must be usable. | Verify at `1366x900`. |
| DRV-082 | Browser proof should cover tablet. | Shell density changes. | Verify at `834x1112`. |
| DRV-083 | Browser proof should cover mobile. | Long setup flows are most fragile there. | Verify at `390x844`. |
| DRV-084 | Horizontal overflow is a recurring layout risk. | It breaks mobile UX. | Measure body width against viewport. |
| DRV-085 | Console errors hide route regressions. | They indicate broken client logic. | Check browser console. |
| DRV-086 | Failed requests can reveal auth/API regressions. | UI may look okay while data fails. | Track failed responses. |
| DRV-087 | Visible unnamed controls hurt accessibility. | Forms need clear labels. | Check accessible control names. |
| DRV-088 | The route should support refresh/reload. | SPA state should not depend on transient scroll. | Use static anchors and render state. |
| DRV-089 | No new architecture truth is needed. | This is a UX implementation slice. | Update UX docs and ledgers only. |
| DRV-090 | The route should not block future V2 Company City work. | Foundation UI must stay operational. | Keep route business-focused. |
| DRV-091 | Drive import readiness should be canonical for future provider screens. | Similar setup flows will recur. | Record pattern in design memory. |
| DRV-092 | Summary should not use one-note palette. | Green fits Drive but must stay restrained. | Use neutral white cards with small green surface. |
| DRV-093 | The UI should be usable by AI-driven browser agents. | Anchors and labels help automation. | Use stable IDs and clear link text. |
| DRV-094 | The summary should show blocker severity. | Owners need prioritization. | Tone cards as ready, attention, blocked. |
| DRV-095 | The copy should be plain, not playful. | Settings flow requires trust. | Use concise operational language. |
| DRV-096 | The solution should be compatible with existing shell. | Avoid route-specific nav rewrites. | Only add route body components. |
| DRV-097 | The route should make no claim about Google verification. | That depends on external Google state. | Keep verification warning in setup guide. |
| DRV-098 | The card action targets should survive route reload. | Hash anchors should be stable. | Add IDs in markup. |
| DRV-099 | The implementation should remain easy to remove or evolve. | V2 may replace visual shell later. | Use scoped CSS class names. |
| DRV-100 | The route should make "ready for agents" feel earned. | AI usefulness depends on connected, imported, mapped data. | Show success only after real state supports it. |

## Canonical Route Body Assumptions

- A provider import route should expose a local command summary above technical setup controls.
- Provider readiness must be staged, not binary: credentials, consent, selected scope, imported data, ownership, and relationship readiness are distinct user questions.
- Stable section anchors are part of usability and AI-operability for long authenticated workbenches.
- Counts are useful only when paired with the next action or the risk they represent.

