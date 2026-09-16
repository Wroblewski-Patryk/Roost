# Hermes attempt and budget qualification v1

RF-RUNTIME-005B9 [practical attempt policy](hermes-practical-attempt-budget-v1.md)
is implemented under ADR-004 v6: the owner accepts unavailable physical counters
and hard token/cost enforcement for the supervised pilot. coding-small-v1 uses
24 logical turns, retry setting 2, an original deadline of at most 900 seconds,
Windows Job cleanup and no automatic restart. Receipts keep unknowns null and
exit 0 is only a candidate for independent review. This supersedes B8's required
pre-dispatch budget boundary and proposed source-only B9; its source findings
below remain historical evidence. Real launch and all six flags stay false.

RF-RUNTIME-005B8, 2026-09-16. **BLOCKED** for an enforceable coding pilot.
Source-only qualification of Hermes **0.21.2**, commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`. No upstream module or test was executed.

The single missing control in this qualification is a **Worker-owned, pre-dispatch
budget enforcement boundary covering every physical model request and native tool
dispatch, including retries and finalization**. It must reserve a provable output
allowance before a request, reject route/reasoning drift and stop before an extra
dispatch. The selected public quiet CLI exposes no such boundary. A timer, final
usage report, transcript scan or estimated multiplier cannot substitute for it.
The existing native-tool confinement and other admission gates remain independent.

One Roost attempt is one sealed input, one process tree, one original deadline and
one audited result. It may contain many model/tool exchanges. It is **not** limited
to one model request. The historical `hermes_single_turn_enforcement_unproven`
blocker must not be cleared merely because `--oneshot` is present; its eventual
replacement must prove the bounded attempt described here. No flag is changed by
this document: `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted` all
remain **false**. `prepareProviderLaunch` still denies real Hermes execution.

## Selected path and counter meanings

The [B7 startup contract](hermes-minimal-startup-contract-v1.md) remains authoritative.
The selected command is `chat --cli --oneshot --quiet --query-file -` with explicit
`openai-codex`, packet model/reasoning and authorized `file[,terminal]` toolsets.
The explicit provider resolves to `codex_responses`, not the opt-in Codex App Server
runtime ([runtime_provider.py L550-L564](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/runtime_provider.py#L550-L564)).

| Quantity | Exact meaning and evidence |
| --- | --- |
| Roost attempt | Worker starts once and writes the sealed stdin once. A retry of the task requires a new audited execution/attempt and independently approved remaining authority/budget; no automatic process restart. [Quiet adapter](hermes-supervised-quiet-v1.md), [recovery](agent-host-recovery.md). |
| Hermes conversation run | Quiet calls `run_conversation` once and prints `final_response`; excluded Kanban environment could otherwise run a goal loop afterward. [cli.py L4065-L4117](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L4065-L4117). |
| Logical iteration / `api_call_count` | Incremented at outer-loop entry, before request preparation; one iteration contains a nested retry loop. It is not physical HTTP request count. [conversation_loop.py L1514-L1569](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L1514-L1569), [turn_iteration_prep.py L300-L363](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_iteration_prep.py#L300-L363). |
| IterationBudget | Per-agent consume/refund counter, reset at conversation start. Subagents have their own budgets and would add calls; delegation is excluded. `execute_code` can refund a tool round but is excluded from B7 tools. [iteration_budget.py L1-L56](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/iteration_budget.py#L1-L56), [turn_context.py L520-L531](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_context.py#L520-L531), [turn_tool_round.py L179-L193](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_tool_round.py#L179-L193). |
| Tool call | One requested tool invocation; a model response can contain multiple calls. Validation/deduplication is followed by dispatch of the remaining batch. Parallelism settings/concurrency limits are not aggregate call limits. [turn_tool_round.py L75-L152](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_tool_round.py#L75-L152), [tool_executor.py L1661-L1715](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/tool_executor.py#L1661-L1715). |
| Physical model request | Each actual Responses submission, including connect/stream retry, error recovery, continuation and iteration-summary request. Count attempted dispatches conservatively even when no usage arrives. A connection failure does not prove the server did no work. |
| Auth refresh | Credential maintenance, not a model turn; any subsequent model resubmission still consumes the physical request budget. A new account is not a technical retry. |

Flow: fresh CLI session → credentials/init → one conversation → consume logical
iteration → prepare request → nested API retry/recovery → normalize response →
validate/execute tool batch and repeat, or accept final text → finalization → quiet
exit. [cli.py L4384-L4436](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L4384-L4436),
[conversation_loop.py L1391-L1420](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L1391-L1420).
Tool errors are generally results for the model to react to, not a new Roost task.

## Call and retry inventory

The table covers the selected Responses path and its shared recovery branches.
“Immediate” means no backoff at that layer; lower-layer I/O may wait. None of these
internal counters is authoritatively exposed by the selected quiet interface:
**receipt retry/model/tool counts are null today**. A future enforcing receipt
counts at dispatch, not by parsing these messages. Any resubmission can consume
subscription quota; no monetary per-call charge is inferred. Unless explicitly
marked otherwise, recovery keeps the provider/model but changes request history
or connection state. Limits below are local to a streak/iteration, not additive
proof of an attempt-wide cap.

| Path / trigger | Limit, backoff, accounting and selected-policy treatment | Exact source |
| --- | --- | --- |
| Ordinary tool loop | `--max-turns N` → `max_iterations`; outer loop checks local count and remaining budget. Logical iterations can be refunded on recovery. Allow multiple controlled exchanges. | [cli.py L2727-L2737](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L2727-L2737), [conversation_loop.py L1514-L1540](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L1514-L1540). |
| SDK retry | Hermes creates OpenAI clients with default `max_retries=0`; request clients explicitly use 0. Do not multiply by the SDK's usual default or assume dependency behavior observed live. | [agent_runtime_helpers.py L1764-L1773](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_runtime_helpers.py#L1764-L1773), [client_lifecycle.py L425-L437](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/client_lifecycle.py#L425-L437). |
| Codex connect/mid-stream reconnect | Exactly 1 extra physical submission per `run_codex_stream` on listed transport exceptions, immediate. The original body is resubmitted; partial delivery can therefore spend quota twice. APIConnectionError propagates to the outer recovery. After a terminal response, a drain error does not trigger replay. Same active client/model. | [codex_runtime.py L867-L874](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/codex_runtime.py#L867-L874), [L952-L1038](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/codex_runtime.py#L952-L1038). |
| Generic API/HTTP/stream error | `agent.api_max_retries` defaults 3 and is clamped to at least 1. Despite the name, ordinary loop permits R attempts, not R extra retries. Backoff base 2 s, exponential cap 60 s plus up to 50% jitter; positive Retry-After/header/body wins, capped at 600 s. Set R=2 for the candidate; count all physical submissions, including nested reconnect. | [agent_init.py L1350-L1354](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_init.py#L1350-L1354), [turn_api_error.py L129-L169](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_api_error.py#L129-L169), [turn_recovery.py L1019-L1088](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L1019-L1088), [retry_utils.py L66-L79](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/retry_utils.py#L66-L79). |
| Primary transport rebuild after exhaustion | Once per retry-state object, resets retry_count to 0, so permits another R ordinary attempts, not merely one extra call. Wait `min(3+R,8)` seconds. Restores saved primary runtime, including model/provider/credentials; no provider fallback, but continuity must not be inferred from a log line. With R=2 this layer alone permits 4 logical submissions, each potentially reconnecting. | [turn_api_error.py L325-L346](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_api_error.py#L325-L346), [agent_runtime_helpers.py L885-L899](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_runtime_helpers.py#L885-L899), [L936-L974](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_runtime_helpers.py#L936-L974). |
| Malformed/empty response envelope | R attempts shared with retry_count; backoff base 5 s, cap 120 s plus 50% jitter. Terminal failed result after exhaustion; eager fallback exists but must remain empty. Distinct from valid response with empty content below. | [turn_response_check.py L245-L317](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_response_check.py#L245-L317). |
| 401 refresh / expiring token | One forced refresh per `TurnRetryState`, then immediate model retry before generic counter increment. Resolver may refresh at startup too. Refresh itself posts once (default 20 s timeout, minimum 5); rejected refresh may re-import same-owner CLI credentials. No model call in refresh itself; subsequent replay counts. No login/reauthorization or account rotation authorized. B4 attestation and accepted undetectable-account-change risk remain, not replaced by an identity probe. | [turn_recovery.py L312-L331](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L312-L331), [client_lifecycle.py L554-L589](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/client_lifecycle.py#L554-L589), [auth_codex.py L321-L383](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L321-L383), [L408-L479](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L408-L479). |
| Credential-pool recovery | Runs before generic retry increment; rate/auth/billing can refresh or rotate credentials and retry. Bound depends on private pool state, not `--max-turns` or empty provider fallbacks. It can change account. Forbidden policy path; no private pool was inspected, and B7's startup receipt does not prove this consumer disabled. Do not treat it as an accepted retry. | [turn_recovery.py L468-L499](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L468-L499), [agent_runtime_helpers.py L788-L882](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_runtime_helpers.py#L788-L882). |
| Unicode / rejected image repair | Up to 2 Unicode sanitization passes; image-rejection text-only switch once while vision flag is true. Image-too-large and multimodal-tool-content each one per retry state; corrupt-image removal retries only when something was removed. Immediate, before generic retry count. Text-only pilot excludes intentional image inputs/tools; unexpected repair must not silently weaken task content. | [turn_recovery.py L194-L247](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L194-L247), [L502-L555](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L502-L555). |
| Reasoning/signature repair | Thinking-signature removal once; invalid encrypted reasoning replay disabled once while enabled; native-compaction rejection once if enabled. A reasoning-mandatory repair also has a one-shot latch. Immediate retries. No model switch, but request semantics change. Keep native compaction off; reject any effective reasoning below the sealed selection. | [turn_recovery.py L364-L439](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L364-L439), [L534-L547](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_recovery.py#L534-L547). |
| Context overflow / 413 / output cap | Compression attempt counter defaults 3, can rearm on later progress. Compress-and-restart refunds the outer iteration; output-cap repair may lower cap and retry. Compression disabled is not itself a global request counter or proof no recovery path runs. Keep compression off and fail on exhausted/unknown budget proof. | [turn_overflow.py L119-L158](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_overflow.py#L119-L158), [L277-L311](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_overflow.py#L277-L311), [turn_iteration_prep.py L443-L470](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_iteration_prep.py#L443-L470), [conversation_loop.py L1500-L1503](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L1500-L1503). |
| Codex incomplete response | Counter increments on incomplete normalization; n<3 continues, third consecutive incomplete returns partial. Thus 2 further continuations after the first incomplete, not 3 extra requests; resets on a non-incomplete response. Immediate, consumes subsequent outer iterations. Preserves interim text/reasoning and may nudge. | [turn_truncation.py L444-L536](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_truncation.py#L444-L536), [turn_response_intake.py L172-L181](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_response_intake.py#L172-L181). |
| Length/partial-stream recovery | Shared length branch: text continues while n<4 (3 further requests); truncated tool call can retry 4 times inside retry loop. No explicit sleep. It can increase ephemeral output allowance and turn reasoning off for a thinking-only non-stub. Selected Codex finish-reason derivation routes max-output exhaustion to incomplete, not length; this shared branch is not counted as an unconditional Codex retry. Never authorize limit escalation or reasoning downgrade if reached. | [turn_response_check.py L45-L80](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_response_check.py#L45-L80), [turn_truncation.py L235-L346](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_truncation.py#L235-L346), [turn_iteration_prep.py L495-L505](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_iteration_prep.py#L495-L505). |
| Incomplete scratchpad | 2 additional outer-loop requests; third failure returns partial. Immediate, counter resets on valid content. | [turn_response_intake.py L155-L170](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_response_intake.py#L155-L170). |
| Invalid tool name / JSON | All-invalid names: 3 strikes, 2 further model attempts; mixed valid/invalid batch may execute valid calls. Invalid JSON: 2 immediate further attempts, third injects error results and resets counter, so cycles can repeat until outer limit. Truncated JSON refuses dispatch and returns partial. Counts cannot be derived from number of successful tools. | [turn_tool_validation.py L69-L214](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_tool_validation.py#L69-L214). |
| Empty visible answer | One post-tool nudge; up to 2 thinking-prefill continuations; then up to 3 empty retries per streak (1 if known costly; repeated deterministic empties can stop earlier), base 5 s cap 60 s plus 50% jitter. Quota/cost is not guaranteed known for Codex. Partial streamed/prior housekeeping content may instead become final. | [turn_empty_response.py L44-L92](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_empty_response.py#L44-L92), [L164-L289](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_empty_response.py#L164-L289), [empty_response_guard.py L229-L237](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/empty_response_guard.py#L229-L237). |
| Intent/acknowledgment and stop nudges | Up to 2 acknowledgment/continue-intent nudges per streak; dropped-tool-call guard up to 3 where finish reason supports it. Verification, pre_verify hooks and Kanban can also continue the loop. They consume outer iterations but are not transport retries. Plugin/hooks/Kanban remain excluded; candidate explicitly disables optional verification/intent continuations. | [turn_final_response.py L116-L224](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_final_response.py#L116-L224), [turn_stop_gates.py L104-L174](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_stop_gates.py#L104-L174). |
| Escaped outer processing errors | Local processing errors stop immediately; other escaped errors bounded by min(8,N), also stop near iteration cap. Immediate next iteration, not task restart. Some exits do not set failed, hence exit 0 is insufficient. | [conversation_loop.py L230-L232](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L230-L232), [turn_loop_errors.py L139-L161](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_loop_errors.py#L139-L161). |
| Iteration-exhaustion summary | When no preserved final answer exists, finalizer requests a toolless summary outside N. Up to 2 summary calls if first empty, each with Codex's possible reconnect: up to 4 physical submissions on this path. No outer counter consumption. Failure can still yield explanatory final text. | [turn_finalizer.py L119-L172](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_finalizer.py#L119-L172), [chat_completion_helpers.py L2074-L2079](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/chat_completion_helpers.py#L2074-L2079), [L2108-L2154](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/chat_completion_helpers.py#L2108-L2154). |
| Provider/model fallback and refunded restarts | Error, malformed/empty output, refusal/content-filter and exhaustion can activate configured fallback. Both B7 fallback lists remain empty. Redirect/rebuilt-message restart accumulator bounded by R; compression refund has separate accounting. No fallback, redirect input or whole-task replay authorized. | [turn_api_error.py L284-L346](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_api_error.py#L284-L346), [turn_truncation.py L551-L606](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_truncation.py#L551-L606), [turn_iteration_prep.py L384-L505](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_iteration_prep.py#L384-L505). |

Other-provider branches (Anthropic/Vertex/Nous/Copilot/xAI/Bedrock, grammar repair),
App Server, MoA, delegation, auxiliary title/review/compression calls, interactive
redirects and Kanban goal repetition are not alternate pilot routes. B7 excludes
their route/tool/config/environment prerequisites. A main retry count of 1 or 2
does not disable the separately latched repairs, pool recovery or final summary.
Do not publish a guessed formula such as N×R as a hard bound.

## Hard-budget findings and one selected pilot policy

The selected class is **`coding-small-v1`**, for one bounded text/code repair plus
focused local checks in the approved workspace. It allows useful tools and multiple
iterations; larger work must be split and approved separately, not self-upgraded.
These are proposed contract values for implementation, not measured usage or live
authorization. No second class or automatic escalation is selected.

| Limit | Selected value/rule | Upstream versus Worker enforcement |
| --- | --- | --- |
| Process/task attempts | One spawn and one stdin write; zero automatic restarts/resumes. | Worker, using original Ready/input/attempt. Existing packet maxAttempts does not authorize immediate retry in this process. |
| Logical iterations | `--max-turns 24`; exact positive integer, no unlimited/default/zero fallback. | Upstream loop limit only, including noted refunds and outside-loop summary. Enough for inspect/edit/check/fix/report, not a physical request guarantee. |
| Ordinary API attempts | `agent.api_max_retries: 2`. | Upstream per-iteration value (1 ordinary retry), plus separately inventoried recovery. No synthetic zero-retry claim. |
| Physical model dispatches | Hard ceiling **64** across all main, reconnect, recovery and finalization requests. Every uncertain dispatch consumes a slot; no refund. | Required Worker pre-dispatch permits; **unavailable on selected CLI**. 64 gives headroom over 24 productive iterations without granting unlimited nested recovery. |
| Native tool dispatches | Hard ceiling **96**, maximum **8** in a model batch; at most **1** side-effecting tool in flight. All file/terminal/process_manage invocations count, including failures. | Required Worker admission before each call; **unavailable on selected native path**. Built-in parallel_tool_calls is true when tools are present, and executor worker limits do not enforce these caps. [codex.py L594-L598](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex.py#L594-L598). |
| Wall clock | Pilot requires accepted maxDurationSeconds ≤900. Original server startedAt is never reset. Stop begins at deadline minus existing 5 s margin; any earlier lease/cancel/authority stop wins. `--run-budget` gets the remaining whole seconds at sealing, refreshed only by resealing before launch if necessary, never above original remaining allowance. | Worker duration guard plus native Job is authoritative. Hermes's 80% notice and implicit stale timeout cap are advisory, including a 60 s timeout floor and explicit-configuration exceptions. No OS-freeze or remote inference cancellation guarantee. [parser L250-L258](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/_parser.py#L250-L258), [run_agent.py L558-L582](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/run_agent.py#L558-L582), [Worker duration](../../scripts/lib/agent-host-execution-duration.mjs). |
| Output/reasoning tokens | At most min(packet.maxOutputTokens, **32768**) for the entire attempt, including partial/retried/summary generation and reasoning. No self-raised limit. | Existing packet demands a true hard cap. Codex backend branch does not forward max_tokens as max_output_tokens; it is only added in the non-Codex branch. Even reliable post-response usage can overshoot. Required provider-enforced reservation/control is **unproven**; deny rather than estimate tokens from text. [codex.py L643-L654](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex.py#L643-L654), [output contract](execution-packet-contract.md#hard-output-token-admission-rf-host-010), [current guard](../../scripts/lib/agent-host-output-budget.mjs). |
| Input/context | Existing 131072-byte sealed initial payload remains. A proposed **131072-byte complete serialized request ceiling per dispatch** also covers accumulated tool content; it is a byte policy, not a token count. Reject oversized requests; no auxiliary summarizer or automatic larger context/model. | Upstream context limits/estimates and tool-result truncation are not a Roost aggregate token guarantee. Worker cannot see the complete internal request today. Tool budget is character persistence size, and read_file has a pinned infinite per-result threshold. [budget_config.py L1-L51](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/budget_config.py#L1-L51). |
| Output transport | Existing stdout 131072 bytes, stderr 32768 bytes; fatal UTF-8/redaction failure stops. | Worker byte limits, not generated-token/cost caps. |
| Monetary cost / subscription quota | `cost: null`, `subscriptionQuotaConsumed: null`; no invented dollars or “free usage”. | Upstream labels this route subscription_included; no per-call monetary cap or account quota proof supplied by quiet. Wall/call limits reduce exposure but do not establish token/quota consumption. [usage_pricing.py L338-L346](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/usage_pricing.py#L338-L346). |

Candidate argv appends `--max-turns 24 --run-budget <remaining-seconds>` to B7,
without changing query transport, model/provider/tools or accepted startup effects.
Candidate profile keeps both fallback lists empty, compression/checkpoints/auxiliary
review/title/memory/skills tools/MCP/plugins/telemetry disabled and safe mode on,
and adds `agent.max_turns: 24`, `agent.api_max_retries: 2`,
`agent.intent_ack_continuation: false`, `agent.stall_guards: false` and
`agent.verify_on_stop: false`. These disable optional prompt nudges, not ordinary
task verification or the separately inventoried repair loops. No invented disable
flags: [agent_init.py L1327-L1354](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/agent_init.py#L1327-L1354),
[verification_stop.py L50-L76](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/verification_stop.py#L50-L76).

The exact model is one of Roost's existing allowlist (`gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-6-astra`); numeric prefix comparisons do not
grant new models. Effective reasoning must equal the approved packet value. The
pinned transport clamps unsupported effort values: `ultra` is not in its selected
Codex wire vocabulary. Therefore an ultra packet must be rejected for this provider,
not silently mapped to max or another model. This is a source finding about this
pin, not an amendment of the general Roost allowlist.
[reasoning_effort.py L25-L37](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/reasoning_effort.py#L25-L37),
[codex.py L201-L231](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex.py#L201-L231),
[Roost selection](../../scripts/lib/agent-host-model-policy.mjs).

## Checkpoint, resume and termination

With no resume/continue flag, the CLI starts an empty conversation and a new session
ID. It nevertheless opens SessionDB and persists conversation/tool history; quiet
is **not ephemeral**. `store:false` in the API payload does not disable local
session persistence. Filesystem checkpoints are separately disabled by B7 config
and absence of --checkpoints. No private session database was read in this atom.
[cli.py L2817-L2840](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L2817-L2840),
[L2752-L2759](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L2752-L2759),
[turn_tool_round.py L118-L152](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_tool_round.py#L118-L152).

Successful text completion, exhausted iteration/repair counters, refusal, provider
failure, persistence failure, cancellation and Worker deadline are different
outcomes. A summary after exhaustion is incomplete work, not success. Quiet exits
1 only when the returned result has failed=true; partial/completed=false paths can
exit 0. Keyboard interruption has an explicit 130 path. The internal finalizer has
richer fields which quiet does not print as a trusted protocol.
[turn_finalizer.py L436-L456](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_finalizer.py#L436-L456),
[L537-L549](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_finalizer.py#L537-L549),
[cli.py L4073-L4117](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/cli.py#L4073-L4117).

After interruption Worker must stop the entire owned Job and confirm zero active
processes before relinquishing ownership; ambiguous cleanup keeps reconciliation
blocked. A later attempt may use only a separately approved Roost checkpoint
contract (original attempt linkage, exact dirty-byte evidence, fresh authority and
budget). This atom neither implements resume nor promotes a Hermes session ID to
replay authority. No automatic old-session selection, prompt-driven resume, CLI
restart, Kanban continuation or hidden retry of the task is permitted.

## Observable facts and minimal fail-closed receipt

Without stream-json, the current trustworthy observations are Worker attempt/input
identity, process exit code/signal, Worker wall/monotonic times, stop trigger,
bounded stdout/stderr byte counts, redaction/UTF-8 verdict, native Job cleanup proof
and workspace evidence digests. Final stdout remains **untrusted process text**;
exit 0 means process exited, not acceptance criteria met or budget exhaustion absent.
Do not parse natural-language summaries as control messages.

`--usage-file` belongs to the separate top-level `-z/--oneshot PROMPT` implementation,
not this `chat --oneshot --quiet` path. Switching to it would change the startup
contract and does not provide pre-dispatch enforcement anyway.
[parser L113-L123](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/_parser.py#L113-L123),
[main.py L135-L158](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/main.py#L135-L158).

The proposed `roost-hermes-attempt-budget-v1` receipt contains only:

- Schema/policy/pin, attempt/input/Ready/startup receipt digests, selected limit class
  and exact finite limits, approved model/provider/reasoning/toolset identifiers.
- Original deadline, process start/end, monotonic elapsed milliseconds; Worker exit
  class: process_exited, process_failed, interrupted, deadline, authority_lost,
  output_rejected, cleanup_unconfirmed or budget_proof_missing.
- One-spawn/one-stdin/no-resume facts, output byte counts and digests, workspace
  evidence digest, native cleanup reference, and `taskCompletion: unverified` until
  independent review. No raw stderr, paths, prompts, task content, auth data or session DB.
- Enforcement source per limit. Physical model/tool/transport-retry/token counts
  remain **null/unavailable** unless produced by the mandatory trusted dispatch
  boundary; neither zero nor a CLI-reported estimate suffices. Monetary cost and
  subscription quota stay null. Missing/expired/mismatched proof denies admission;
  no serialized self-declared receipt may clear a blocker.

The missing boundary must also prevent permits being reused, reset or expanded by
retry, finalization, new threads or a forged provider response. A passive observer
that notices limit N+1 after it has already happened is containment, not a hard cap.
Killing a local process cannot prove the remote service stopped already accepted
generation. Output reservations require a provider-enforced ceiling; unsupported
consumer-Codex behavior remains denied under the existing output-budget contract.

## Minimal next implementation delta and decision

One selected contract is `coding-small-v1`: exact public argv/config, original
Worker wall-clock/Job, all-dispatch permits and a fail-closed nonsensitive receipt.
It is **not yet READY_FOR_IMPLEMENTATION as an executable pilot**. The missing
enforcement boundary is the reason for **BLOCKED**; do not request an impossible
hard-cap proof from `--max-turns`, logs or quiet output. No accepted risk waiver of
the packet's output-token invariant is inferred.

Once a supported enforcement point is qualified, the smallest implementation is:

1. Extend the existing startup/profile policy with the sealed finite values and
   exact reasoning compatibility checks; keep B3/B5/B7 historical bytes/versioning.
2. Extend the existing Worker admission with the single attempt ledger and
   pre-dispatch permits, count retries/summary calls and tools atomically, reserve
   output allowance, reject absent proof/route drift and keep the original deadline.
   Do not build another scheduler, retry engine, provider router or framework.
3. Join that proof to the existing quiet result/native cleanup/workspace receipt;
   fail on unknown completion/budget proof, and add synthetic exhaustion, N+1,
   concurrent-dispatch, replay, retry/reset, summary, clock and cleanup tests.
   All live flags remain false until separate admission and pilot authorization.

Only adding flags and a new JSON receipt would implement declarations, not the
missing control. Native tool confinement is still separate: one terminal dispatch
can run arbitrary nested work, so even 96 admitted tools would not bound shell
commands or grant filesystem/network authority.

**Exactly one next atom proposed: RF-RUNTIME-005B9 — source-only qualification of a
supported Worker pre-dispatch enforcement point for the selected budget contract.**
It must resolve or reject that one boundary for exact standard CLI/Codex/native
tools, without a fork, private entrypoint, new framework, credential inspection or
model run. If no supported point exists, return that specific incompatibility to
the owner; do not substitute an unapproved proxy, weaken budgets or implement
receipt-only scaffolding. Not started by B8.

## Static verification

Tests were read as source, not run: [run-budget timeout exceptions](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/agent/test_run_budget.py#L122-L184),
[summary on iteration exhaustion](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/run_agent/test_verification_continuation_budget.py#L108-L124),
[bounded outer errors](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/run_agent/test_92450_outer_error_retry_bound.py#L88-L110),
[incomplete-response continuation](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/run_agent/test_run_agent_codex_responses.py#L2434-L2481),
[wire reasoning normalization](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/agent/transports/test_codex_transport.py#L42-L87).
They support source interpretation, not a new PASS for running Hermes.

PASS: both repository documentation validators, 519 local-link targets across the
10 changed documents, 82 source-link ranges in 41 source/test files with normalized
local bytes matching the exact Git blobs, scoped privacy/CSV inspection and
`git diff --check`. Default agent context is 67666 bytes, within its budget.
Runtime tests/typecheck/lint/build are
not rerun for this docs-only atom. No private profile, credential store, runtime,
loader, OAuth, model, MCP or agent tool was accessed or executed; no public lookup
was needed. The B7 private migration and all six false gates remain unchanged.
