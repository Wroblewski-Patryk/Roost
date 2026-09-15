import { StringDecoder } from "node:string_decoder";
import contract from "./agent-host-hermes-launch-contract.cjs";
import { modelSelectionSchema } from "./agent-host-model-policy.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";

// Public CLI JSONL decoder only. Not a process launcher, token-cap enforcer or
// proof of side-effect prevention. Not attached to a live Hermes while blocked.
export function createHermesStreamGuard({ modelSelection, maxDurationSeconds, secrets = [],
  signal, now = () => performance.now() }) {
  const parsed = modelSelectionSchema.safeParse(modelSelection);
  if (!parsed.success) throw Error("execution_model_policy_invalid");
  const selection = parsed.data;
  if (!Number.isInteger(maxDurationSeconds) || maxDurationSeconds < 1 || maxDurationSeconds > 3600) throw Error("hermes_stream_budget_invalid");
  const start = now(), decoder = new StringDecoder("utf8"), stderrDecoder = new StringDecoder("utf8");
  let failure, closed = false, session = null, result = null, pending = "", text = "", stderr = "";
  let stdoutBytes = 0, stderrBytes = 0, events = 0;
  function fail(code) { failure ??= Object.assign(new Error(code), { retryable: false }); throw failure; }
  function check() {
    if (failure) throw failure;
    if (closed) fail("hermes_stream_closed");
    if (signal?.aborted) fail("hermes_stream_cancelled");
    if (now() - start >= maxDurationSeconds * 1000) fail("hermes_stream_timeout");
  }
  const finite = n => Number.isSafeInteger(n) && n >= 0;
  function event(line) {
    if (Buffer.byteLength(line) > contract.lineBytes || ++events > contract.maxEvents) fail("hermes_stream_limit");
    let e; try { e = JSON.parse(line); } catch { fail("hermes_stream_invalid"); }
    if (!e || !finite(e.timestamp) || result) fail("hermes_stream_sequence");
    if (e.type === "system") {
      if (session || e.subtype !== "init" || e.model !== selection.model
          || typeof e.session_id !== "string" || !e.session_id || e.session_id.length > 256) fail("hermes_stream_identity");
      session = e.session_id;
    } else if (!session) fail("hermes_stream_sequence");
    else if (e.type === "text") {
      if (typeof e.text !== "string") fail("hermes_stream_invalid");
      text += e.text;
    } else if (e.type === "result") {
      if (e.session_id !== session || !Number.isInteger(e.exit_code) || typeof e.text !== "string"
          || !finite(e.duration_ms) || !e.tokens || !["input", "output", "total", "cache_read", "cache_write"].every(k => finite(e.tokens[k]))) fail("hermes_stream_invalid");
      result = { ...e };
    } else if (["tool_use", "tool_result"].includes(e.type)) {
      // No native/MCP tool surface is qualified yet. Detect, never claim this
      // post-event rejection prevented the underlying command from executing.
      fail("hermes_stream_tool_unqualified");
    } else fail("hermes_stream_event_unknown");
    try { guardHostContent(e, "required", secrets); } catch { fail("hermes_stream_sensitive"); }
  }
  return Object.freeze({
    write(channel, chunk) {
      check();
      if (!Buffer.isBuffer(chunk) || !["stdout", "stderr"].includes(channel)) fail("hermes_stream_invalid");
      if (channel === "stderr") {
        stderrBytes += chunk.length;
        if (stderrBytes > contract.stderrBytes) fail("hermes_stream_limit");
        stderr += stderrDecoder.write(chunk); return;
      }
      stdoutBytes += chunk.length;
      if (stdoutBytes > contract.stdoutBytes) fail("hermes_stream_limit");
      pending += decoder.write(chunk);
      let end;
      while ((end = pending.indexOf("\n")) >= 0) { event(pending.slice(0, end)); pending = pending.slice(end + 1); }
      if (Buffer.byteLength(pending) > contract.lineBytes) fail("hermes_stream_limit");
    },
    finish(exitCode) {
      check(); pending += decoder.end(); stderr += stderrDecoder.end(); if (pending) event(pending);
      if (!result || !result.text.trim() || result.exit_code !== exitCode || exitCode !== 0 || result.error) fail("hermes_stream_failed");
      try { guardHostContent({ text, final: result.text, stderr }, "required", secrets); }
      catch { fail("hermes_stream_sensitive"); }
      closed = true;
      return Object.freeze({ finalResponse: result.text, sessionId: session,
        usage: Object.freeze({ ...result.tokens }), accounting: "reported_final_only", treeStopped: false });
    }
  });
}
