# Native runtime redaction (RF-SEC-004)

The API and local host import the same policy, `roost-runtime-redaction-v1`, from
[`scripts/lib/agent-runtime-redaction.cjs`](../../scripts/lib/agent-runtime-redaction.cjs).
Supervised admission requires `native_runtime_redaction_v1`; older hosts cannot
claim work. Production execution remains disabled and the canonical host observe.

## Boundaries

| Surface | Decision |
| --- | --- |
| Submit, prompt, contract, governance commands | Sensitive required input blocks before acceptance/effects. A rejected replacement does not replace an existing pin. |
| Resolved task/application context and compiled prompt | Check before dispatch/spawn. Previously redacted input also blocks; no raw or redacted fallback. Reviewer identity uses its technical ID without a personal display name. |
| Events, heartbeat, results, failures | Diagnostics may be redacted before transport/persistence. API checks independently; unsupported or over-limit input blocks. |
| Checkpoint/recovery | Required content checked before API and local writer-state persistence. Existing recovery/lease fences remain. |
| Evidence/attachment metadata | Recursive text/JSON checks. Binary objects, unsupported declared formats and attachment content without media type fail closed. No extraction/OCR. |
| Legacy projections | Native routes and recognizable native slots in shared task/event/evidence/log responses are checked on demand. No stored history scan, rewrite or deletion. |
| Unknown native errors | Fixed errors/log messages; no exception arguments, Prisma payloads or stacks. Findings become safe incident references. |

The Prisma boundary rejects unexpected sensitive native writes from internal
producers too. Native nested relation writers are rejected because middleware
does not intercept their inner operations; use explicit guarded delegates.
Source-change SQL triggers emit fixed `Source changed` labels instead of source
titles. Forward migration `20260908080000_runtime_redaction_projection` changes
future notifications only and does not rewrite historical rows.

The root lease token is an authenticated transport field, exempt only in host
control requests and newly returned claim/recovery leases. It never enters model,
diagnostic, evidence or incident content. UUIDs, record IDs, digests, model token
limits and credential IDs retain their technical semantics.

## Defined policy

Known credentials are collected in memory from effective auth/integration
configuration, credential environment names, database URL passwords and current
request/host credentials. They are never persisted. A nonempty known credential
outside 8–8192 characters, more than 128 values or 32768 total credential
characters makes sanitation fail closed; values are not silently omitted.
Shell `PWD`/`OLDPWD` describe directories and are excluded from environment
credential discovery. JSON `pwd` remains a protected password field. Existing
host heartbeat findings use the verified host record ID for durable deduplication.

Detection covers password/secret/API-key/token/authorization/cookie/private-key
fields, credential assignments, common provider prefixes, JWT, Bearer/Basic,
private-key headers and credentials in URLs. Explicit personal fields cover
email, phone/mobile, postal/street/home address, birth date, SSN, passport,
national ID and personal/first/last/full name. `name` under user, reviewerUser,
contact, person, customer or owner is personal. Email syntax and defined personal
assignments are detected in text. Arbitrary prose names are not classified.

Checks include NFKC, zero-width formatting, bounded URI/Unicode/hex unescaping,
up to three base64/hex decoding rounds, ordinary joined-string splits and
same-purpose text chunks. Selected high-diversity 16-character known-secret
fragments are checked without treating common UUID substrings as credentials.
This does not detect arbitrary covert encodings or steganography.

Limits per value: 512 KiB cumulative bytes, 128 KiB strings, 20000 nodes, depth 32,
32 findings. Cycles, accessors, unsupported objects, non-finite numbers and
exhaustion fail closed. Locations use fixed schema names or positional indexes,
never arbitrary input keys or matches. Supported attachment media are text/plain,
text/markdown, text/csv and application/json; this is not a general file uploader.

Host stdout is bounded to 512 KiB per execution, stderr to 128 KiB. UTF-8 chunk
boundaries are preserved. Free-text JSONL diagnostics are held in bounded memory
and checked as a batch together with stderr. Live progress uses fixed text. A
sensitive batch withholds free-text results/commands and emits a safe notice.
Overflow stops the worker and reports a fixed failure. No raw fallback is sent.

## Incidents, retries and ownership

Discovery creates a `technical_incident` CompanyRecord assigned to Technology,
visible company-wide. Metadata contains policy, category/location, surface,
verified workspace-scoped task/execution/application references and technical
record/request correlation. Observation time is the record timestamp. A random
UUID fingerprint is independent of the detected value. Dedup keys hash only
classification and technical scope, never a match or its hash. Advisory locking
and the unique record key deduplicate concurrent requests and restarts. Changed
values with the same classification/scope share an incident.

The host's notice is an untrusted `host_redaction` observation, never a substitute
for the API check. Diagnostics are sanitized and incidents committed before the
handler persists content. An unexpected internal writer aborts its transaction;
the response boundary emits the safe incident afterward. Incident failure returns
a fixed 503 and withholds content. Incident metadata/content resist ordinary
record edits; humans may update status/priority or archive. Existing execution
and incident views show PL/EN removal notices and safe references.

## Evidence and limits of the claim

Synthetic verification: `scripts/agent-runtime-redaction.test.mjs`,
`scripts/agent-host-context-process.test.mjs`, `src/tests/api.test.ts`,
`scripts/agent-runtime-redaction-ui.test.mjs` and
`scripts/agent-runtime-redaction-migration.test.mjs`. The local API runner uses a
disposable local database role with a random in-memory password, removed after
its database. It does not rotate the operator's credential.

RF-SEC-004 remains partial for the company. This is native Agent Runtime content
protection, not whole-Roost DLP, a tool/network/provider broker, OS tracing, child
process file scanning or historical cleanup. Unknown unstructured secrets and
unclassified personal prose remain outside the deterministic policy. Testing
does not activate a real agent/model. Never scan production history, reset data,
rotate credentials or enable execution as an implicit side effect.
