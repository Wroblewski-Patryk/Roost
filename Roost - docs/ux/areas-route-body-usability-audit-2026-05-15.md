# Areas Route Body Usability Audit

Date: 2026-05-15
Scope: canonical `/areas` route body after V2VIS-002 shell convergence.

## Executive Summary

The `/areas` route is one of the most important owner-console surfaces because
it connects departments, tables, provider mappings, Drive resources, and
agent-safe operating context. Before this slice, the data was mostly present,
but the page behaved like a long operational report. The owner had to scroll
through many panels before answering the three CompanyCore management questions:

- what matters now;
- what is blocked or needs review;
- where to act next.

This audit keeps Company City and deeper gamification deferred to V2. The V1
web goal is a useful, calm management workbench that is safe for humans and AI
operators.

## 100 Route-Body Findings And Fix Targets

| ID | Surface | Finding | Fix target |
| --- | --- | --- | --- |
| AR-001 | First viewport | The hero explains the route but does not summarize the current operational priority. | Add an area command summary. |
| AR-002 | First viewport | The owner sees metrics before knowing what requires action. | Put review counts above broad exploration. |
| AR-003 | First viewport | Mobile starts as a tall stack of cards. | Use denser mobile spacing and compact metric rhythm. |
| AR-004 | First viewport | Tablet lacks a deliberate priority band. | Make command summary responsive. |
| AR-005 | First viewport | Desktop has room for priority plus evidence but uses a single long column. | Split command brief and signal cards. |
| AR-006 | Hero | "React workbench" is implementation language. | Replace in a future copy pass with product language. |
| AR-007 | Hero | Primary actions are generic and do not explain why they matter. | Keep actions near priority context. |
| AR-008 | Hero | Area counts do not indicate whether unmapped resources exist. | Add provider and Drive review counts. |
| AR-009 | Hero | Drive count is useful but not actionable. | Pair it with ownership status. |
| AR-010 | Hero | Capability count is abstract for owners. | Keep as secondary evidence. |
| AR-011 | Command | No single "what to do now" card exists. | Add priority title/detail. |
| AR-012 | Command | Missing ownership is not promoted above other page content. | Count provider and Drive items needing area. |
| AR-013 | Command | Empty areas can be interpreted as broken. | Explain future scope vs missing import. |
| AR-014 | Command | Success state is not acknowledged when map is ready. | Show "Area map is ready". |
| AR-015 | Command | Owner cannot jump to review queues quickly. | Add anchor action. |
| AR-016 | Command | Owner cannot jump to selected-area inspection quickly. | Add anchor action. |
| AR-017 | Command | Review and coverage metrics are scattered. | Group four command cards. |
| AR-018 | Command | Metrics are not interactive. | Make command metric cards anchors. |
| AR-019 | Command | Mobile command cards could become too wide. | Use one-column card grid on mobile. |
| AR-020 | Command | Tablet command cards need scan density. | Use two-column grid on tablet. |
| AR-021 | Filters | Filters are near the bottom after several dense sections. | Move filters near the top. |
| AR-022 | Filters | The table count changes out of sight after filtering. | Add visible row count to command summary. |
| AR-023 | Filters | Mobile users must scroll too far before narrowing the table. | Promote filters before mapping panels. |
| AR-024 | Filters | Search placeholder is acceptable but not tied to decisions. | Future copy pass can mention ownership/resource. |
| AR-025 | Filters | Area type options are useful but broad. | Keep options but pair with command context. |
| AR-026 | Signal cards | Mapping signal cards are valuable but appear as generic status tiles. | Keep after filters as secondary evidence. |
| AR-027 | Signal cards | Signal actions compete with review queues. | Command summary establishes priority first. |
| AR-028 | Signal cards | Four cards can feel heavy on mobile. | Reduce surrounding mobile spacing. |
| AR-029 | Signal cards | Status language assumes the owner knows provider scope. | Future copy pass can define provider ownership. |
| AR-030 | Signal cards | Secondary links are good but not contextualized. | Keep inside the same operational sequence. |
| AR-031 | Review queues | Review queues are important but lacked a direct landing anchor. | Add `area-review-queues` anchor. |
| AR-032 | Review queues | The two review queues can be missed between other panels. | Link from command summary. |
| AR-033 | Review queues | Empty success states are useful but appear late. | Promote counts in command summary. |
| AR-034 | Review queues | Assignment controls are small on mobile. | Preserve labels and reduce page padding around them. |
| AR-035 | Review queues | Long provider names risk card stretching. | Existing break-word behavior remains required. |
| AR-036 | Review queues | Assignment pending state is visible only by disabled control. | Future action-state pass should add local row feedback. |
| AR-037 | Review queues | Queue count says visible, but not urgency. | Command summary adds urgency count. |
| AR-038 | Review queues | Both queues have similar visual weight even if one is empty. | Future pass can sort non-empty first. |
| AR-039 | Review queues | The owner may not know why assignment matters for AI. | Detail copy already explains agent dependency. |
| AR-040 | Review queues | Long queue lists could dominate mobile. | Future pass can add progressive disclosure if data grows. |
| AR-041 | Selected context | Selected context is high value but too far down the page. | Add command anchor. |
| AR-042 | Selected context | Area select is discoverable but not framed as the main drill-down. | Link from command summary. |
| AR-043 | Selected context | The nested panels create a long mobile wall. | Tighten mobile spacing in the area context card. |
| AR-044 | Selected context | Tables, records, Drive, and provider panels are equal even when empty. | Future pass can rank non-empty panels first. |
| AR-045 | Selected context | Record previews are useful but can become noisy. | Keep capped previews. |
| AR-046 | Selected context | Long API path text can wrap awkwardly. | Existing global wrapping remains required. |
| AR-047 | Selected context | Reassignment controls are powerful but visually small. | Keep accessible labels; future pass can add row actions. |
| AR-048 | Selected context | Empty selected area copy is passive. | Future pass can link to lifecycle/create area. |
| AR-049 | Selected context | Area metadata lacks readiness summary. | Command summary covers route-level readiness first. |
| AR-050 | Selected context | Drive/provider reassignment success appears route-level only. | Future pass can make row-local success. |
| AR-051 | Lifecycle | Create/delete area controls are useful but buried. | Add lifecycle anchor. |
| AR-052 | Lifecycle | Delete is dangerous and small. | Existing error styling and reassignment copy should remain. |
| AR-053 | Lifecycle | The create form consumes mobile height. | Mobile card padding tightened. |
| AR-054 | Lifecycle | New area form appears before explaining editable count. | Badge count remains in header. |
| AR-055 | Lifecycle | User-created areas can be confused with system areas. | Existing system-area protection copy remains. |
| AR-056 | Lifecycle | Delete reassignment target is not user-selectable. | Future backend/UI pass may support explicit reassignment. |
| AR-057 | Lifecycle | Success after create/delete depends on refresh. | Existing route notice explains refresh. |
| AR-058 | Lifecycle | Empty state is helpful but not linked to integrations. | Future pass can link to mapping after first area. |
| AR-059 | Lifecycle | Editable area cards can become long if many areas exist. | Future pass can add table mode or pagination. |
| AR-060 | Lifecycle | Form validation is minimal but acceptable for current scope. | Keep disabled submit and max lengths. |
| AR-061 | Coverage cards | Coverage highlight cards previously had no header. | Add titled coverage section. |
| AR-062 | Coverage cards | Users did not know why only four areas appeared. | Explain strongest mapped areas. |
| AR-063 | Coverage cards | Coverage cards lacked path to the full table. | Add "Review all rows" action. |
| AR-064 | Coverage cards | Cards could be mistaken for complete area list. | Title clarifies highlights. |
| AR-065 | Coverage cards | Mobile cards added another untitled section. | Wrap in a named card section. |
| AR-066 | Coverage cards | Top-row sort is useful but implicit. | Copy describes richest coverage. |
| AR-067 | Coverage cards | Drive/provider/table badges are useful but secondary. | Keep below title. |
| AR-068 | Coverage cards | Empty or sparse areas are hidden from highlights. | Command summary reports empty area count. |
| AR-069 | Coverage cards | Highlight cards need relation to table. | Add anchor to table. |
| AR-070 | Coverage cards | Tablet two-column behavior is useful. | Preserve responsive grid. |
| AR-071 | Table | Table is the main audit surface but appeared after filters far below. | Move filters earlier and anchor table. |
| AR-072 | Table | Table count is shown only at table header. | Echo count in command summary. |
| AR-073 | Table | Horizontal table scroll is acceptable but must not leak page overflow. | Preserve global table shell constraints. |
| AR-074 | Table | Next action buttons are small but appropriately secondary. | Keep table actions as compact links. |
| AR-075 | Table | Ownership badges are useful but not summarized. | Future pass can add ownership distribution. |
| AR-076 | Table | Source count lacks source detail. | Future pass can add expandable row detail. |
| AR-077 | Table | Provider and Drive columns are numeric only. | Future pass can add tooltips or row detail. |
| AR-078 | Table | Empty table state is clear. | Preserve DataTable empty state. |
| AR-079 | Table | Filtered state lacks reset shortcut. | Future pass can add reset control. |
| AR-080 | Table | Mobile table remains a dense expert view. | Keep after command and summary sections. |
| AR-081 | Accessibility | New anchors need visible text, not icon-only controls. | Use text links and card labels. |
| AR-082 | Accessibility | Interactive metric cards need link semantics. | Implement as anchors with readable text. |
| AR-083 | Accessibility | Hover-only affordance is insufficient. | Include focus-visible state. |
| AR-084 | Accessibility | Buttons and links must wrap without clipping. | Reuse global wrapping rules. |
| AR-085 | Accessibility | Select labels must remain present. | Preserve explicit labels and aria-labels. |
| AR-086 | Accessibility | Mobile spacing cannot shrink touch targets below useful size. | Keep button/select primitives from DaisyUI. |
| AR-087 | Responsiveness | Mobile page padding was too generous for dense workbench data. | Reduce area-route padding. |
| AR-088 | Responsiveness | Card bodies consumed too much vertical height on mobile. | Reduce area-route card-body padding. |
| AR-089 | Responsiveness | Hero actions can wrap unevenly. | Let mobile hero buttons share width. |
| AR-090 | Responsiveness | Metric cards should remain scannable but compact. | Use two-column mobile metric grid. |
| AR-091 | Responsiveness | Command cards need stable columns by viewport. | Use 4/2/1 column grid. |
| AR-092 | Responsiveness | Nested context panels need tighter mobile rhythm. | Reduce context gaps and nested padding. |
| AR-093 | Responsiveness | Anchor jumps should not hide headings under top chrome. | Add scroll-margin. |
| AR-094 | Product language | The route should feel like company management, not system inspection. | Use "Area command" and ownership language. |
| AR-095 | Product language | AI safety reason should be explicit. | Mention AI workflows relying on ownership. |
| AR-096 | Product language | Coverage should be a management signal. | Name "Strongest mapped areas". |
| AR-097 | Product language | Empty areas need business interpretation. | Explain future scope vs missing imports. |
| AR-098 | Reuse | The fix should not invent a new visual system. | Reuse cards, badges, buttons, icons, and tokens. |
| AR-099 | Scope | Backend contracts should not change for layout polish. | Keep change in React route body and CSS. |
| AR-100 | Next cycle | This slice should create a pattern for future route-body audits. | Document command summary and evidence path. |

## Implemented Repair Strategy

| Repair | Findings covered | Implementation surface |
| --- | --- | --- |
| Area command summary | AR-001 through AR-020, AR-031 through AR-033, AR-041 through AR-042, AR-071 through AR-072 | `web/src/main.tsx`, `web/src/styles.css` |
| Early filters | AR-021 through AR-025, AR-071 through AR-080 | `web/src/main.tsx` |
| Anchored route sections | AR-015 through AR-018, AR-031, AR-041, AR-051, AR-093 | `web/src/main.tsx`, `web/src/styles.css` |
| Coverage highlights wrapper | AR-061 through AR-070 | `web/src/main.tsx` |
| Mobile density polish | AR-003, AR-019, AR-020, AR-028, AR-043, AR-053, AR-087 through AR-092 | `web/src/styles.css` |

## Deferred To Later UX Cycles

- Replace remaining implementation-facing copy such as "React workbench" with
  product-facing management language.
- Add row-local assignment feedback for provider and Drive reassignment.
- Add reset filter affordance and richer table row detail if table-heavy use
  becomes a frequent operator path.
- Sort review queues by non-empty urgency if real production data starts
  mixing empty and high-volume queues.

## Acceptance Criteria

- `/areas` shows a command summary before dense mapping panels.
- Filters are reachable near the top of the route body on mobile, tablet, and
  desktop.
- Review queues, selected context, lifecycle, coverage, and table sections are
  linkable from the route body.
- Mobile, tablet, and desktop checks show no horizontal overflow, console
  issues, failed requests, or clipped primary controls.
