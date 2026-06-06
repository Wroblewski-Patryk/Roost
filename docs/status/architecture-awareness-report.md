# Architecture Awareness Report

Generated: 2026-06-06T14:38:37.948Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost

## Counts By Type

| Type | Count |
| --- | ---: |
| agent | 47 |
| api_endpoint | 57 |
| component | 7 |
| document | 885 |
| feature | 198 |
| function | 7257 |
| migration | 31 |
| model | 175 |
| module | 67 |
| project | 1 |
| route | 3 |
| test | 1 |

## Counts By Status

| Status | Count |
| --- | ---: |
| blocked | 4 |
| deprecated | 4 |
| implemented | 8712 |
| in_progress | 1 |
| tested | 8 |

## Health Signals

- Raw implementation entities without inferred tests: 7518
- Actionable implementation entities without inferred tests: 1911
- Raw implementation entities without inferred docs: 440
- Actionable implementation entities without inferred docs: 261
- Classified inferred-link noise: 5776
- Entities without owner attribution: 0
- Disconnected entities: 0

## Top Actionable Missing Test Links

- api_endpoint: USE /react (.tmp/web-qa-001/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-001/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-001/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-001/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-001/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-001/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-001/mock-server.cjs#/vendor)
- api_endpoint: GET * (.tmp/web-qa-audit/mock-server.cjs#*)
- api_endpoint: USE /react (.tmp/web-qa-audit/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-audit/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-audit/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-audit/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-audit/mock-server.cjs#/vendor)
- api_endpoint: GET / (src/app.ts#/)
- api_endpoint: USE /agent-events (src/app.ts#/agent-events)
- api_endpoint: USE /agent-logs (src/app.ts#/agent-logs)
- api_endpoint: USE /agents (src/app.ts#/agents)
- api_endpoint: USE /api-keys (src/app.ts#/api-keys)
- api_endpoint: USE /assets (src/app.ts#/assets)
- api_endpoint: USE /auth (src/app.ts#/auth)
- api_endpoint: USE /clients (src/app.ts#/clients)
- api_endpoint: USE /commercial-exceptions (src/app.ts#/commercial-exceptions)
- api_endpoint: USE /company-os (src/app.ts#/company-os)
- api_endpoint: USE /connection (src/app.ts#/connection)
- api_endpoint: USE /dashboard (src/app.ts#/dashboard)
- api_endpoint: USE /deals (src/app.ts#/deals)
- api_endpoint: USE /decisions (src/app.ts#/decisions)
- api_endpoint: USE /departments (src/app.ts#/departments)
- api_endpoint: USE /events (src/app.ts#/events)
- api_endpoint: USE /finance (src/app.ts#/finance)
- api_endpoint: USE /goals (src/app.ts#/goals)
- api_endpoint: USE /google-drive (src/app.ts#/google-drive)
- api_endpoint: USE /health (src/app.ts#/health)
- api_endpoint: USE /intake (src/app.ts#/intake)
- api_endpoint: USE /integration-settings (src/app.ts#/integration-settings)
- api_endpoint: USE /interactions (src/app.ts#/interactions)
- api_endpoint: USE /mcp (src/app.ts#/mcp)
- api_endpoint: USE /notes (src/app.ts#/notes)

## Top Actionable Missing Doc Links

- api_endpoint: USE /react (.tmp/web-qa-001/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-001/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-001/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-001/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-001/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-001/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-001/mock-server.cjs#/vendor)
- api_endpoint: GET * (.tmp/web-qa-audit/mock-server.cjs#*)
- api_endpoint: USE /react (.tmp/web-qa-audit/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-audit/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-audit/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-audit/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-audit/mock-server.cjs#/vendor)
- api_endpoint: GET / (src/app.ts#/)
- api_endpoint: USE /agent-events (src/app.ts#/agent-events)
- api_endpoint: USE /agent-logs (src/app.ts#/agent-logs)
- api_endpoint: USE /agents (src/app.ts#/agents)
- api_endpoint: USE /api-keys (src/app.ts#/api-keys)
- api_endpoint: USE /assets (src/app.ts#/assets)
- api_endpoint: USE /auth (src/app.ts#/auth)
- api_endpoint: USE /clients (src/app.ts#/clients)
- api_endpoint: USE /commercial-exceptions (src/app.ts#/commercial-exceptions)
- api_endpoint: USE /company-os (src/app.ts#/company-os)
- api_endpoint: USE /connection (src/app.ts#/connection)
- api_endpoint: USE /dashboard (src/app.ts#/dashboard)
- api_endpoint: USE /deals (src/app.ts#/deals)
- api_endpoint: USE /decisions (src/app.ts#/decisions)
- api_endpoint: USE /departments (src/app.ts#/departments)
- api_endpoint: USE /events (src/app.ts#/events)
- api_endpoint: USE /finance (src/app.ts#/finance)
- api_endpoint: USE /goals (src/app.ts#/goals)
- api_endpoint: USE /google-drive (src/app.ts#/google-drive)
- api_endpoint: USE /health (src/app.ts#/health)
- api_endpoint: USE /intake (src/app.ts#/intake)
- api_endpoint: USE /integration-settings (src/app.ts#/integration-settings)
- api_endpoint: USE /interactions (src/app.ts#/interactions)
- api_endpoint: USE /mcp (src/app.ts#/mcp)
- api_endpoint: USE /notes (src/app.ts#/notes)

## Classified Inferred-Link Noise

- config_only_file: 2
- generated_vendor_docs_vault_plugin: 5774

## Top Classified Noise Samples

- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/dataview/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/note-toolbar/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/obsidian-excalidraw-plugin/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/obsidian-git/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/obsidian-tasks-plugin/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/omnisearch/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/table-editor-obsidian/main.js)
- generated_vendor_docs_vault_plugin: feature: main.js (docs/.obsidian/plugins/templater-obsidian/main.js)
- config_only_file: feature: tailwind.config.mjs (tailwind.config.mjs)
- config_only_file: feature: vite.config.mjs (vite.config.mjs)
- generated_vendor_docs_vault_plugin: function: _ (docs/.obsidian/plugins/dataview/main.js#_)
- generated_vendor_docs_vault_plugin: function: _$1 (docs/.obsidian/plugins/dataview/main.js#_$1)
- generated_vendor_docs_vault_plugin: function: _advanceReadiness (docs/.obsidian/plugins/dataview/main.js#_advanceReadiness)
- generated_vendor_docs_vault_plugin: function: _binStringToArrayBuffer (docs/.obsidian/plugins/dataview/main.js#_binStringToArrayBuffer)
- generated_vendor_docs_vault_plugin: function: _checkBlobSupport (docs/.obsidian/plugins/dataview/main.js#_checkBlobSupport)
- generated_vendor_docs_vault_plugin: function: _checkBlobSupportWithoutCaching (docs/.obsidian/plugins/dataview/main.js#_checkBlobSupportWithoutCaching)
- generated_vendor_docs_vault_plugin: function: _classCallCheck (docs/.obsidian/plugins/dataview/main.js#_classCallCheck)
- generated_vendor_docs_vault_plugin: function: _decodeBlob (docs/.obsidian/plugins/dataview/main.js#_decodeBlob)
- generated_vendor_docs_vault_plugin: function: _deferReadiness (docs/.obsidian/plugins/dataview/main.js#_deferReadiness)
- generated_vendor_docs_vault_plugin: function: _encodeBlob (docs/.obsidian/plugins/dataview/main.js#_encodeBlob)
- generated_vendor_docs_vault_plugin: function: _extend (docs/.obsidian/plugins/dataview/main.js#_extend)
- generated_vendor_docs_vault_plugin: function: _fullyReady (docs/.obsidian/plugins/dataview/main.js#_fullyReady)
- generated_vendor_docs_vault_plugin: function: _getConnection (docs/.obsidian/plugins/dataview/main.js#_getConnection)
- generated_vendor_docs_vault_plugin: function: _getKeyPrefix (docs/.obsidian/plugins/dataview/main.js#_getKeyPrefix)
- generated_vendor_docs_vault_plugin: function: _getOriginalConnection (docs/.obsidian/plugins/dataview/main.js#_getOriginalConnection)
- generated_vendor_docs_vault_plugin: function: _getSupportedDrivers (docs/.obsidian/plugins/dataview/main.js#_getSupportedDrivers)
- generated_vendor_docs_vault_plugin: function: _getUpgradedConnection (docs/.obsidian/plugins/dataview/main.js#_getUpgradedConnection)
- generated_vendor_docs_vault_plugin: function: _initStorage (docs/.obsidian/plugins/dataview/main.js#_initStorage)
- generated_vendor_docs_vault_plugin: function: _initStorage$1 (docs/.obsidian/plugins/dataview/main.js#_initStorage$1)
- generated_vendor_docs_vault_plugin: function: _initStorage$2 (docs/.obsidian/plugins/dataview/main.js#_initStorage$2)
- generated_vendor_docs_vault_plugin: function: _isEncodedBlob (docs/.obsidian/plugins/dataview/main.js#_isEncodedBlob)
- generated_vendor_docs_vault_plugin: function: _isLocalStorageUsable (docs/.obsidian/plugins/dataview/main.js#_isLocalStorageUsable)
- generated_vendor_docs_vault_plugin: function: _isUpgradeNeeded (docs/.obsidian/plugins/dataview/main.js#_isUpgradeNeeded)
- generated_vendor_docs_vault_plugin: function: _n (docs/.obsidian/plugins/dataview/main.js#_n)
- generated_vendor_docs_vault_plugin: function: _rejectReadiness (docs/.obsidian/plugins/dataview/main.js#_rejectReadiness)
- generated_vendor_docs_vault_plugin: function: _setItem (docs/.obsidian/plugins/dataview/main.js#_setItem)
- generated_vendor_docs_vault_plugin: function: _tryReconnect (docs/.obsidian/plugins/dataview/main.js#_tryReconnect)
- generated_vendor_docs_vault_plugin: function: _wrapLibraryMethodsWithReady (docs/.obsidian/plugins/dataview/main.js#_wrapLibraryMethodsWithReady)
- generated_vendor_docs_vault_plugin: function: $ (docs/.obsidian/plugins/dataview/main.js#$)
- generated_vendor_docs_vault_plugin: function: $$1 (docs/.obsidian/plugins/dataview/main.js#$$1)

## Notes

- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.
- Curated graph coverage input: `C:/Personal/Projekty/Aplikacje/Roost/docs/graphs/architecture-graph.json` (covered paths: 0).
- Override input: `C:/Personal/Projekty/Aplikacje/Roost/docs/architecture/scanner-overrides.json` (entity entries: 0, relation entries: 0).
- Override summary: excluded files 0, entity overrides 0, relation overrides 0, critical entities tagged 0.
- `verified` still requires fresh command/browser/deploy evidence, not only file presence.