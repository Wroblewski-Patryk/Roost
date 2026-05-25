# Web App UX100 Audit And Execution Plan - 2026-05-15

## Purpose

This document turns the current CompanyCore web product state and the intended
owner outcome into 100 concrete UX audits and 100 execution steps.

The user-facing promise is:

```text
An owner should open CompanyCore and immediately understand the company,
its operating areas, its synced resources, its blockers, and which AI/MCP
actions are safe to delegate.
```

## Inputs Reviewed

- Existing authenticated web routes in `public/index.html`.
- Current vanilla shell, route command strip, Drive/API/Areas route-body polish,
  and React Company OS / MCP surfaces.
- `docs/ux/experience-quality-bar.md`
- `docs/ux/screen-quality-checklist.md`
- `docs/ux/design-memory.md`
- `docs/ux/v2-visual-implementation-plan-2026-05-14.md`
- Current task board and next-step state after V2VIS-005, ACF-MAINT-002,
  ACF-QA-001, and ACF-OPS-001.

## Product Direction

CompanyCore should not feel like a collection of admin pages. It should feel
like a company operating cockpit:

- workspace first;
- company areas as the mental map;
- synced resources and relationships as explainable evidence;
- owner blockers and next actions above raw tables;
- AI/MCP access framed as supervised capability, not magic;
- future Company City and gamification grounded in real readiness signals.

## 100 Audits

| ID | Surface | Audit Finding | Better User Outcome |
| --- | --- | --- | --- |
| UX100-A001 | Shell | The app still exposes many destinations as route names instead of owner jobs. | Navigation reads like "run my company" instead of "open module." |
| UX100-A002 | Shell | Workspace switching exists but is not yet the emotional starting point of the product. | Multi-company owners feel each workspace is a real operating context. |
| UX100-A003 | Shell | The sidebar has company areas, but it can still feel like a dense directory. | The owner sees areas as a map of the company, not a link list. |
| UX100-A004 | Shell | The route command strip is useful but not yet paired with a persistent right-side decision brief. | Every route answers "what should I do now?" without scanning the whole page. |
| UX100-A005 | Shell | Mobile navigation relies heavily on the drawer. | Mobile supports quick checks and urgent actions without deep navigation. |
| UX100-A006 | Shell | Tablet is mostly responsive desktop, not its own experience. | Tablet users get split context and fewer taps. |
| UX100-A007 | Shell | Global search/module switcher is navigation-only. | Owner can jump to records, areas, blockers, and tools from one intent box. |
| UX100-A008 | Shell | Topbar actions are compact but do not yet express risk or attention. | Owner can see safety and blocker state from the chrome. |
| UX100-A009 | Shell | Current labels mix "Company map", "data", "bridge", and provider names. | Labels teach the operating model consistently. |
| UX100-A010 | Shell | The shell lacks a canonical "today's company status" object. | The app feels alive and current after login. |
| UX100-A011 | Dashboard | Dashboard has a Company map frame but not a full first-viewport command experience. | Owner understands company health within seconds. |
| UX100-A012 | Dashboard | Area cards are useful but not yet visually memorable as a future City preview. | V2 direction starts to feel tangible without fake visuals. |
| UX100-A013 | Dashboard | The dashboard could better distinguish owner action, AI action, and passive status. | The owner knows what to do personally and what can be delegated. |
| UX100-A014 | Dashboard | Current stats can feel equal-weight. | One priority dominates, supporting stats stay secondary. |
| UX100-A015 | Dashboard | Empty accepted containers are documented but not strongly explained in UI. | Empty projects/storage/automation states feel intentional, not broken. |
| UX100-A016 | Dashboard | Readiness signals are distributed across integrations, areas, API, and relationships. | Dashboard shows one readiness layer across the whole company. |
| UX100-A017 | Dashboard | The future gamification thesis is not visible yet. | Progress signals reward real data hygiene and operating clarity. |
| UX100-A018 | Dashboard | The route still depends mostly on cards. | The entry screen gains spatial hierarchy and clearer visual rhythm. |
| UX100-A019 | Dashboard | First viewport can include too many same-weight sections on smaller screens. | Mobile dashboard becomes one clear brief plus next action. |
| UX100-A020 | Dashboard | Agent readiness is present in related routes but not central enough on the dashboard. | Owner sees whether AI can safely help before creating keys. |
| UX100-A021 | Areas | `/areas` now has a strong command summary, but area details still compete with broad lists. | Selected area becomes a focused management surface. |
| UX100-A022 | Areas | Area inventory resources need stronger grouping by actionability. | Owner sees "needs review", "ready", and "empty accepted" quickly. |
| UX100-A023 | Areas | Area lifecycle controls need clearer local feedback after changes. | Owner trusts area edits and mapping actions. |
| UX100-A024 | Areas | Mobile area review can still become a long stack. | Mobile supports area triage before deep management. |
| UX100-A025 | Areas | Relationship and Drive assignments are related but appear in separate mental lanes. | Owner understands "this resource belongs here because..." |
| UX100-A026 | Areas | Area cards should show AI visibility explicitly. | Owner knows which area context an agent can read or act on. |
| UX100-A027 | Areas | Area readiness should feed dashboard/city state. | Fixing an area visibly improves the company map. |
| UX100-A028 | Areas | The main-general area can become a dumping ground. | Unassigned/default items are framed as review debt. |
| UX100-A029 | Areas | Area labels are operational but not yet role/person oriented. | Owner can connect areas to responsibilities and accountability. |
| UX100-A030 | Areas | Area quality lacks a clear score model. | Future gamification rewards real readiness, not arbitrary points. |
| UX100-A031 | Relationships | Relationship graph confidence exists but needs stronger explanation. | Owner knows which links are facts, inferred, unsupported, or need review. |
| UX100-A032 | Relationships | Relationship review should be closer to affected area/resource context. | Owner fixes context where the problem lives. |
| UX100-A033 | Relationships | Unsupported relationship families can feel like failures. | Unsupported links are framed as known boundaries. |
| UX100-A034 | Relationships | The route could show impact of unresolved relationships. | Owner understands why review improves AI and company clarity. |
| UX100-A035 | Relationships | Filters are useful but need saved "review modes." | Owner can triage direct, inferred, and provider issues quickly. |
| UX100-A036 | Relationships | Relationship UI should show source provenance more visibly. | Owner trusts how the graph was built. |
| UX100-A037 | Relationships | Bulk review flows are missing. | Owner can resolve repeated provider mapping issues efficiently. |
| UX100-A038 | Relationships | Mobile table/list density may still slow review. | Mobile review uses cards or compact rows tuned for decisions. |
| UX100-A039 | Relationships | The route does not yet expose "safe for AI" as a final state. | Owner knows when graph context is reliable enough for agents. |
| UX100-A040 | Relationships | Relationship changes should update the dashboard brief. | Fixing graph debt visibly reduces company blockers. |
| UX100-A041 | Data | `/data` and table views are powerful but still generic database surfaces. | Owner sees business meaning before raw table mechanics. |
| UX100-A042 | Data | Table selection needs stronger recommended starting points. | Owner knows which data set matters next. |
| UX100-A043 | Data | Record editor flows need clearer dirty/saved/error states. | Owner edits data confidently. |
| UX100-A044 | Data | Empty projects can look like missing implementation. | Empty project state explains accepted deferral or next import path. |
| UX100-A045 | Data | Search is present but not semantically tied to company questions. | Owner searches by people, work, area, provider, and AI relevance. |
| UX100-A046 | Data | Table workbench needs stronger relation previews. | Owner sees how records connect without jumping routes. |
| UX100-A047 | Data | Mobile data tables require more decision-first layouts. | Mobile shows summaries and primary actions before full tables. |
| UX100-A048 | Data | Data quality issues are not surfaced as a coherent backlog. | Owner sees incomplete records as fixable quality work. |
| UX100-A049 | Data | Import/source provenance should be visible per record. | Owner knows whether data came from ClickUp, Drive, API, or manual entry. |
| UX100-A050 | Data | Data surfaces should expose AI-readiness per object family. | Owner knows what an agent can safely use. |
| UX100-A051 | Tasks | Tasks and delivery should read like operating pressure, not just a task list. | Owner sees overdue, blocked, active, and delegated work instantly. |
| UX100-A052 | Tasks | Task adapter route name is technical. | Owner understands it as "Tasks & delivery sync." |
| UX100-A053 | Tasks | ClickUp sync status should be tied to task trust. | Owner knows whether task data is fresh. |
| UX100-A054 | Tasks | Task filters need decision presets. | Owner can jump to blocked, overdue, unassigned, and recently synced tasks. |
| UX100-A055 | Tasks | Mobile task triage should prioritize status and owner action. | Phone use supports quick decisions. |
| UX100-A056 | Tasks | Task-to-area mapping should be more visible. | Owner sees which company area owns each delivery issue. |
| UX100-A057 | Tasks | Task relationships with projects are weak because projects are empty. | Owner understands whether projects are intentionally deferred. |
| UX100-A058 | Tasks | Task sync errors need local recovery actions. | Owner can fix provider setup without hunting settings. |
| UX100-A059 | Tasks | Task readiness should feed dashboard pressure. | Delivery issues affect the command map. |
| UX100-A060 | Tasks | AI delegation state is not obvious per task. | Owner sees whether a task is safe for agent assistance. |
| UX100-A061 | Pipeline | Pipeline route needs clearer product stance: CRM, sales, or process pipeline. | Owner knows what business workflow the route supports. |
| UX100-A062 | Pipeline | Empty/low-data pipeline states need stronger explanation. | The route feels intentionally ready, not incomplete. |
| UX100-A063 | Pipeline | Pipeline filters should expose next commercial action. | Owner sees which deals/processes need attention. |
| UX100-A064 | Pipeline | Pipeline should connect to people, projects, and tasks. | Owner sees business flow, not isolated records. |
| UX100-A065 | Pipeline | Mobile pipeline should use stage cards rather than wide tables. | Mobile is useful for status checks. |
| UX100-A066 | Pipeline | Pipeline metrics should feed company status. | Revenue/process pressure appears in the command brief. |
| UX100-A067 | Integrations | Integration health cards are strong but should include freshness and last sync. | Owner knows if connected means current. |
| UX100-A068 | Integrations | Provider setup and sync outcomes should be more local. | Owner sees success/failure next to the provider acted on. |
| UX100-A069 | Integrations | ClickUp and Drive readiness should be comparable. | Owner learns one integration mental model. |
| UX100-A070 | Integrations | Integration failures need recovery paths, not raw provider language. | Owner can fix setup without decoding errors. |
| UX100-A071 | Integrations | Integration cards should expose AI impact. | Owner knows which providers enrich agent context. |
| UX100-A072 | Integrations | Integration setup can become dense on mobile. | Mobile shows provider health first, advanced setup second. |
| UX100-A073 | Drive | Drive import summary is strong; file review still needs richer content quality signals. | Owner knows imported context is useful, not merely present. |
| UX100-A074 | Drive | Drive file descriptions are prompt-driven but not guided enough. | Owner writes better descriptions for agents. |
| UX100-A075 | Drive | Reconcile changes should show what changed and what needs review. | Owner trusts refreshes and does not fear silent drift. |
| UX100-A076 | Drive | Large imports need asynchronous progress if they recur. | Owner can import without timeout ambiguity. |
| UX100-A077 | Drive | Folder assignment should visually connect to areas. | Owner sees Drive as company knowledge structure. |
| UX100-A078 | Drive | Docs/Sheets write/edit features need clear safety framing when enabled. | Owner knows when CompanyCore may modify external documents. |
| UX100-A079 | Drive | Mobile Drive setup remains advanced. | Phone use focuses on review and status, not full OAuth setup. |
| UX100-A080 | Drive | Drive readiness should feed agent memory readiness. | Owner knows if AI has enough context. |
| UX100-A081 | API | API route now has good safety summary, but key lifecycle needs richer review mode. | Owner can audit active, stale, broad, and risky keys quickly. |
| UX100-A082 | API | Copy-once key display should include handoff checklist. | Owner gives keys to agents with fewer mistakes. |
| UX100-A083 | API | Key rotation/deactivation needs stronger confirmation language. | Owner understands consequences before changing access. |
| UX100-A084 | API | MCP profiles need plain-language examples. | Owner knows which profile fits Jarvis, Paperclip, or an internal agent. |
| UX100-A085 | API | Agent access should show affected workspace and areas more directly. | Owner avoids cross-company confusion. |
| UX100-A086 | API | Mobile API route should emphasize review over creation. | Mobile avoids accidental credential creation. |
| UX100-A087 | MCP Tools | React agent tools surface is powerful but separate from vanilla shell language. | Agent tool review feels part of the same CompanyCore OS. |
| UX100-A088 | MCP Tools | Tool risk tags need user-language examples. | Owner understands destructive, supervised, and read-only behavior. |
| UX100-A089 | MCP Tools | Tool manifest search needs task-based presets. | Owner finds "what can this agent do?" quickly. |
| UX100-A090 | MCP Tools | MCP route should connect back to key profiles. | Owner sees profile -> scopes -> tools as one chain. |
| UX100-A091 | Company OS | Company OS cockpit is rich but visually denser than other routes. | Owner can supervise agents without feeling buried. |
| UX100-A092 | Company OS | Recovery/approval workflows need a persistent command queue. | Owner sees pending decisions first. |
| UX100-A093 | Company OS | Evidence chains need digestible summaries. | Owner trusts what an agent did without reading raw events. |
| UX100-A094 | Company OS | Definition editing should remain gated by workflow contracts. | Owner cannot accidentally change active automation behavior. |
| UX100-A095 | Company OS | Mobile cockpit should prioritize approvals and blockers. | Phone use supports safe supervision. |
| UX100-A096 | Account | Account readiness is less central than workspace/company readiness. | Owner understands account setup as part of operating safety. |
| UX100-A097 | Public Auth | Public login/register are functional but not yet aligned with product promise. | New users understand CompanyCore as an operating cockpit before sign-in. |
| UX100-A098 | Error States | Some routes can still rely on technical status messages. | Errors become recoverable product states. |
| UX100-A099 | Performance | Dense routes need perceived-performance patterns. | Loading feels calm and trustworthy. |
| UX100-A100 | Governance | UX evidence exists route-by-route but lacks a single execution map. | Future work follows a coherent user-outcome roadmap. |

## 100 Execution Steps

| Step | Target | Action | Proof |
| --- | --- | --- | --- |
| UX100-S001 | Planning | Convert this UX100 atlas into active queue rows by priority and dependency. | Task board and next-steps agree. |
| UX100-S002 | Planning | Define P0/P1/P2 scoring for owner value, AI safety, and implementation risk. | Prioritization table committed. |
| UX100-S003 | Shell | Draft the canonical authenticated shell v1.5 contract. | UX doc with desktop/tablet/mobile zones. |
| UX100-S004 | Shell | Add a persistent route decision brief pattern for dense workbenches. | One pilot route verified. |
| UX100-S005 | Shell | Align sidebar labels with owner jobs, not implementation names. | Navigation copy audit and browser proof. |
| UX100-S006 | Shell | Add attention/safety status to topbar or command strip. | Desktop/mobile screenshot proof. |
| UX100-S007 | Shell | Make mobile quick actions explicit for Map, Brief, Data, Tasks, Settings. | Mobile smoke no overflow. |
| UX100-S008 | Shell | Design tablet-specific split context rules. | Tablet screenshots for two routes. |
| UX100-S009 | Shell | Expand module switcher from routes to intent categories. | Search proof for route and business query. |
| UX100-S010 | Shell | Add active workspace confidence summary. | Multi-workspace smoke. |
| UX100-S011 | Dashboard | Build the next dashboard command brief from real blockers. | Signed-in dashboard proof. |
| UX100-S012 | Dashboard | Make agent readiness a first-viewport dashboard element. | MCP/key state reflected. |
| UX100-S013 | Dashboard | Create a city-preview layout using real area readiness only. | Desktop/tablet/mobile screenshots. |
| UX100-S014 | Dashboard | Separate owner action, AI action, and passive status visually. | UX review checklist pass. |
| UX100-S015 | Dashboard | Add empty accepted explanation for projects/storage/automation. | Empty-state browser proof. |
| UX100-S016 | Dashboard | Feed relationship review count into dashboard priority. | Graph issue changes priority. |
| UX100-S017 | Dashboard | Feed integration freshness into dashboard status strip. | Last-sync state visible. |
| UX100-S018 | Dashboard | Define evidence-backed gamification primitives. | No vanity points; every signal has source. |
| UX100-S019 | Dashboard | Make mobile dashboard first viewport one brief and one action. | Mobile screenshot proof. |
| UX100-S020 | Dashboard | Record final dashboard visual thesis for V2. | Design memory updated. |
| UX100-S021 | Areas | Add selected-area management header with owner questions. | `/areas` proof. |
| UX100-S022 | Areas | Group resources by review status and readiness. | Area inventory proof. |
| UX100-S023 | Areas | Show AI visibility/readiness per area. | MCP/area state proof. |
| UX100-S024 | Areas | Add "default area debt" messaging for main-general. | Unassigned item proof. |
| UX100-S025 | Areas | Improve local feedback for area mapping actions. | Interaction proof. |
| UX100-S026 | Areas | Create mobile area triage card layout. | Mobile proof. |
| UX100-S027 | Areas | Connect area fixes to dashboard readiness. | Cross-route proof. |
| UX100-S028 | Areas | Add responsibility/person placeholder only if real data exists. | No fake data check. |
| UX100-S029 | Areas | Define area quality scoring model. | UX/product doc. |
| UX100-S030 | Areas | Create area readiness reusable component contract. | Pattern gallery update. |
| UX100-S031 | Relationships | Add stronger graph-confidence explainer. | Relationship route proof. |
| UX100-S032 | Relationships | Add source provenance summary per relationship row/card. | Browser proof. |
| UX100-S033 | Relationships | Add saved review modes. | Filter interaction proof. |
| UX100-S034 | Relationships | Add impact copy for unresolved relationships. | Empty/blocker state proof. |
| UX100-S035 | Relationships | Design bulk review for repeated mapping issues. | Task contract before code. |
| UX100-S036 | Relationships | Improve mobile relationship review cards. | Mobile proof. |
| UX100-S037 | Relationships | Add "safe for AI" final state. | AI context readiness proof. |
| UX100-S038 | Relationships | Feed relationship fixes into dashboard priority. | Cross-route proof. |
| UX100-S039 | Relationships | Ensure unsupported families are not styled as errors. | Visual review. |
| UX100-S040 | Relationships | Keep relationship workbench module boundary clean. | Static JS check. |
| UX100-S041 | Data | Add business meaning intro to `/data`. | Route proof. |
| UX100-S042 | Data | Recommend starting tables based on blockers/readiness. | State-derived cards. |
| UX100-S043 | Data | Improve record editor dirty/saved/error states. | Interaction proof. |
| UX100-S044 | Data | Clarify empty projects and accepted deferral. | Empty proof. |
| UX100-S045 | Data | Add provenance badges per record family. | Table proof. |
| UX100-S046 | Data | Add relationship previews in record inspector. | Inspector proof. |
| UX100-S047 | Data | Build mobile record summary before table. | Mobile proof. |
| UX100-S048 | Data | Create data quality backlog summary. | Dashboard/data proof. |
| UX100-S049 | Data | Add AI-readiness per table/object family. | MCP/manifest proof. |
| UX100-S050 | Data | Extract data workbench when stable. | Maintainability proof. |
| UX100-S051 | Tasks | Rename/refine Tasks & delivery route framing. | Navigation proof. |
| UX100-S052 | Tasks | Add delivery pressure command summary. | Route proof. |
| UX100-S053 | Tasks | Add sync freshness state near task data. | Provider state proof. |
| UX100-S054 | Tasks | Add blocked/overdue/unassigned presets. | Filter proof. |
| UX100-S055 | Tasks | Improve mobile task triage. | Mobile proof. |
| UX100-S056 | Tasks | Show area ownership per task more clearly. | Table/card proof. |
| UX100-S057 | Tasks | Decide project mapping policy for tasks. | Product decision record. |
| UX100-S058 | Tasks | Add local recovery for ClickUp sync errors. | Error-state proof. |
| UX100-S059 | Tasks | Feed task pressure to dashboard. | Cross-route proof. |
| UX100-S060 | Tasks | Show AI delegation state per task. | AI safety proof. |
| UX100-S061 | Pipeline | Decide pipeline product definition. | Decision register update. |
| UX100-S062 | Pipeline | Add pipeline command summary. | Route proof. |
| UX100-S063 | Pipeline | Clarify empty/low-data pipeline state. | Empty proof. |
| UX100-S064 | Pipeline | Add stage-card mobile layout. | Mobile proof. |
| UX100-S065 | Pipeline | Connect pipeline objects to areas/tasks. | Relationship proof. |
| UX100-S066 | Pipeline | Feed pipeline pressure to dashboard. | Dashboard proof. |
| UX100-S067 | Integrations | Add last sync/freshness to readiness cards. | Route proof. |
| UX100-S068 | Integrations | Localize provider action feedback. | Interaction proof. |
| UX100-S069 | Integrations | Unify ClickUp/Drive readiness vocabulary. | Copy audit proof. |
| UX100-S070 | Integrations | Replace raw provider failures with recovery copy. | Error proof. |
| UX100-S071 | Integrations | Add AI impact per provider. | MCP context proof. |
| UX100-S072 | Integrations | Improve mobile provider health layout. | Mobile proof. |
| UX100-S073 | Drive | Add content quality signals for imported files. | Drive proof. |
| UX100-S074 | Drive | Add guided description prompts for agent usefulness. | Interaction proof. |
| UX100-S075 | Drive | Show reconcile diff summary. | Reconcile proof. |
| UX100-S076 | Drive | Plan async import progress only if repeated large imports recur. | Decision gate. |
| UX100-S077 | Drive | Visualize folder-to-area assignment. | Area/Drive proof. |
| UX100-S078 | Drive | Add safety copy for future Docs/Sheets writes. | UX doc before code. |
| UX100-S079 | Drive | Make mobile Drive status/review-first. | Mobile proof. |
| UX100-S080 | Drive | Feed Drive readiness to agent memory readiness. | Dashboard/API proof. |
| UX100-S081 | API | Add key lifecycle review mode. | API route proof. |
| UX100-S082 | API | Add key handoff checklist. | Create-key proof. |
| UX100-S083 | API | Improve rotation/deactivation confirmation. | Interaction proof. |
| UX100-S084 | API | Add MCP profile examples by agent. | Copy/route proof. |
| UX100-S085 | API | Show workspace/area impact for keys. | State proof. |
| UX100-S086 | API | Make mobile API review-first. | Mobile proof. |
| UX100-S087 | MCP Tools | Align React agent tools with canonical shell vocabulary. | React proof. |
| UX100-S088 | MCP Tools | Add user-language examples for risk tags. | Route proof. |
| UX100-S089 | MCP Tools | Add task-based tool presets. | Interaction proof. |
| UX100-S090 | MCP Tools | Connect profiles, scopes, and tools in one chain. | Cross-route proof. |
| UX100-S091 | Company OS | Add persistent owner command queue. | Company OS proof. |
| UX100-S092 | Company OS | Compress evidence chains into summaries. | Evidence proof. |
| UX100-S093 | Company OS | Make approvals/blockers first on mobile. | Mobile proof. |
| UX100-S094 | Company OS | Preserve definition editing gates. | Security/API proof. |
| UX100-S095 | Company OS | Align visual density with other routes. | Screenshot review. |
| UX100-S096 | Account | Tie account readiness to workspace safety. | Account proof. |
| UX100-S097 | Public Auth | Rewrite public auth framing to match operating cockpit promise. | Public route proof. |
| UX100-S098 | Errors | Create shared user-language error copy patterns. | Pattern gallery update. |
| UX100-S099 | Performance | Add perceived loading patterns for dense routes. | Browser proof. |
| UX100-S100 | Governance | Convert completed UX100 steps into module confidence updates. | Ledgers stay current. |

## First Recommended Implementation Waves

| Wave | Scope | Why First |
| --- | --- | --- |
| UX100-W01 | Dashboard command brief and mobile first viewport | Highest owner-value surface after login. |
| UX100-W02 | Shell decision brief and mobile quick actions | Multiplies clarity across all private routes. |
| UX100-W03 | Relationship/data provenance and AI safety labels | Improves trust for both owner and MCP agents. |
| UX100-W04 | Tasks/pipeline operating pressure summaries | Makes the app useful for day-to-day company management. |
| UX100-W05 | Company OS and MCP tools alignment | Makes agent supervision feel coherent and safe. |

## Definition Of Ready For Each Implementation Slice

- The slice maps to at least one UX100 audit ID and one UX100 step ID.
- The affected route has expected states: loading, empty, error, success.
- Desktop, tablet, and mobile proof is planned.
- AI/MCP impact is marked as none, read-only, supervised, or write-capable.
- Source-of-truth docs to update are named before coding.

## Stop Conditions

- Do not start Company City/gamification visuals until dashboard and shell
  information architecture are ready enough to support real readiness signals.
- Do not add fake data to make any audit item look complete.
- Do not add new agent write affordances without security and AI testing.
- Do not call auto-deploy proven while production health metadata is unknown.

