# Worker-owned read-only MCP broker

Provider contract v3 adds `roost-worker-mcp-broker-v1`. Its transport, admission,
data and lifetime contract is verified with synthetic clients, including a
separate fake Hermes process. `brokerContractVerified:true` describes that proof
only. No host entrypoint starts it in this release; observer does not import or
open it. Both API and Worker still refuse Hermes claim/recovery/model spawn.
There is no live Hermes/Codex compatibility proof or pilot admission.

## Ownership and data boundary

The broker runs inside the Worker process, using its existing authenticated API
closure. The long-lived Roost key remains in that closure and the Worker's
redaction secrets. It is never passed to a child, broker-started subprocess,
Hermes config, MCP result, metadata, error or log. The broker starts no process,
loads no credentials, performs no generic fetch and exposes no API proxy.

Exactly two **local broker tools** replace the foundation's proposed connection
and task-context discovery tools in `hermesPolicy.minimumTools`:

| Tool | Returned projection |
| --- | --- |
| `roost_get_execution_packet` | Existing validated `taskContext.executionPacket` |
| `roost_get_application_context` | Existing Ready-approved `application-agent-context-v2` projection |

These names are local MCP capabilities, not additions to Roost's global MCP/API
catalog. Both reuse `fetchExecutionContext`, existing execution-bound task and
execution-profile application APIs, `validateExecutionPacket`, Ready/risk/
procedure gates, `executionContextRevision` and native runtime redaction. No new
database schema or context store exists. Every tool read refreshes both contexts,
checks the exact prepared revisions and current Ready, then returns only its
named projection. The API closure receives fixed routes with IDs copied from the
claimed attempt; no client URL, path, query, SQL or operation becomes an API call.
Secret-bearing task content is rejected before deriving the application query.

The token and tool schemas bind exact execution, attempt, workspace, task,
application, packet revision and resolved-context revision. Unknown arguments,
other IDs/revisions or attempts fail closed. The application projection is the
existing bounded compiler result already covered by Ready, not a new list-all
or arbitrary-source reader. Context remains untrusted task data, never higher
authority instructions.

## Admission and lifetime

`startWorkerMcpBroker` requires supervised mode, compatible/enabled API protocol,
current lease, duration and output-budget guards, Worker task/writer/path guard,
an abort signal owned by Worker, a `spawn_intent` checkpoint matching the prepared
packet/context, and fresh provider attestation. It requests an uncached
installation check and refuses stale evidence. The production provider admission
function always rejects Hermes. Synthetic tests substitute code-only provider
and budget dependencies; no JSON/env option selects those substitutes.

The startup gate and fresh authoritative context run before any token/listener
exists. Requests recheck lease/duration/output/task authority, with a final
synchronous check before sending data. The caller's single abort signal must be
triggered by lease loss, cancellation, context invalidation and Worker stop before
provider termination. Existing lease/duration guards expose their remaining
monotonic budget for this boundary; no separate lease or renewal system exists.

The broker's immutable deadline is at most 30 seconds and ends five seconds
before the shorter remaining lease/duration budget. It never extends on renewal.
Independent expiry closes idle sockets; wall-clock jumps cannot extend its
monotonic deadline. Pending API work races abort and a three-second deadline;
late results are discarded and cannot issue the second API read after abort.
The socket, token and sequence disappear at completion, failure or stop. OS
process death closes the port; restart creates a new random port/token and cannot
resume the prior attempt's capability. Existing durable execution recovery still
owns any future model effects; this broker creates no recovery store.

## Transport and capability

The HTTP server binds an OS-selected port on **127.0.0.1 only**. It implements a
deliberately narrow MCP `2025-11-25` Streamable HTTP subset: exact `/mcp`, HTTP/1.1,
POST JSON, negotiated version header and JSON responses. Validate exact Host and
reject any browser Origin. GET (SSE), DELETE, OPTIONS, resume/session replay and
other paths/methods are unsupported. Native clients must accept JSON and SSE as
specified by MCP, although this broker returns JSON only.

One random 256-bit capability authorizes one bounded sequence: initialize,
initialized notification, at most two identical tool discoveries, then packet
read followed by application read exactly once. Maximum six messages and two
tool calls, concurrency one, unique bounded integer JSON-RPC request IDs.
Wrong/missing/replayed credentials or messages, extra tools, prompt/resource/
sampling operations, malformed schema and concurrent requests revoke access.
Authentication uses a constant-time digest comparison. The provider has no way
to obtain a second token or reset counts. A local process able to steal the
capability may cause denial of this short attempt; loopback is not a sandbox
against administrators or other processes with access to the child.

Request headers/body are capped at 8/16 KiB, responses at 128 KiB, connections at
two, and each request at three seconds. Oversized responses are rejected rather
than truncated. Errors contain only fixed codes and a null request ID; arbitrary
input, credentials and context are never logged or reflected.

The token exists only in Worker memory and a one-time bootstrap delivered to an
already controlled child's stdin. Its ephemeral object contains one `roost` MCP
server, two tool names, exact scope and expiry. No token in argv, environment,
file, repository, API/UI metadata or persistent event. The child environment is
an allowlist of OS plumbing and Python isolation switches with a System32-only
PATH; all inherited keys, profiles, Python hooks and provider settings are
excluded. No temporary file or ACL cleanup procedure is required in this stage.
JavaScript memory lifetime is not a guarantee of cryptographic zeroization.

## Proved versus unproved

Tests prove the Worker broker contract and fake-client flow, not upstream tool
containment. The bootstrap is a future adapter input; native Hermes is not
claimed to accept this stdin format. The declared restrictions require no native
tools or persistent state, one MCP server, serial calls and no prompts/resources/
sampling. They do not implement or certify those restrictions inside Hermes.

Pinned upstream source exposes enabled/disabled toolsets in `model_tools.py`,
but MCP configuration also loads portable plugin servers in
`tools/mcp_tool_config.py`. Tool selection, executable dispatch, configuration
loading, startup state and all alternate memory/kanban/scheduler/delegation/
session/browser/terminal/filesystem paths have not been demonstrated contained
in a live Windows session. Readiness therefore reports
`hermes_native_tools_isolation_unproven`, `hermes_compatibility_unproven`,
`hermes_output_cost_budget_unproven` and `hermes_stop_recovery_unproven`.
No permissive upstream option is treated as enforcement proof.

The next **unstarted** stage is one explicitly budgeted live read-only comparison
of Direct Codex and Hermes+Codex on the same synthetic pinned packet, model at
least 5.6, with no application writes. Its preflight must prove the native
adapter/configuration and isolation boundaries before any model call. Missing
containment, output/cost or stop/recovery evidence remains a blocker. No login,
model call, production claim, real Hermes session or automatic fallback was
introduced by this stage.

## Verification, rollout and rollback

Run `npm run test:agent-broker`, `npm run test:agent-provider`, existing Worker
lease/duration/context/protocol/writer/recovery/redaction suites and controlled
observer tests. API projection tests prove that broker evidence cannot change
admission; browser tests cover fixed PL/EN status on phone/tablet/desktop. Tests
use only synthetic data, local sockets and fake processes; no external MCP,
model, production task or new database is needed.

Update only the private Worker's exact policy tool names when adopting registry
v3; preserve installation manifest, credentials, mappings and previous config.
Restart observer normally after the tested release, keeping `enabled:false` and
production execution false. Verify health exact SHA, online/observe heartbeat,
unchanged data/secrets/volume and the separate installation/broker/pilot states.
Rollback restores the preceding config and image with execution still disabled;
there is no migration or broker state to restore.

Primary transport reference: [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
[MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle).
Pinned Hermes source: [official release](https://github.com/NousResearch/hermes-agent/tree/939e45c91d751fadd94dcd1b873ac3cb44846213).
