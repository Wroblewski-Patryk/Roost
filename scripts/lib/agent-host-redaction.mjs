import policy from "./agent-runtime-redaction.cjs";
import { StringDecoder } from "node:string_decoder";
export function guardHostContent(value, mode = "required", extra = []) {
  const result = policy.sanitize(value, { mode, secrets: policy.knownRuntimeSecrets(process.env, extra) });
  if (result.blocked) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true, retryable: false });
  return result;
}
export function hostTransport(body, extra = []) {
  if (typeof body !== "string" || Buffer.byteLength(body) > policy.LIMITS.bytes) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true });
  let input;
  try { input = JSON.parse(body); } catch { throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true }); }
  const { leaseToken, ...content } = input;
  const result = guardHostContent(content, content.checkpoint ? "required" : "diagnostic", [...extra, leaseToken]);
  return { body: JSON.stringify({ ...result.value, ...(leaseToken === undefined ? {} : { leaseToken }) }), redacted: result.redacted };
}
// Bound the complete diagnostic stream before retaining or parsing it. A full
// batch allows the shared policy to inspect strings split across JSONL events.
export async function* boundedRunnerLines(stream) {
  let pending = "", bytes = 0;
  const decoder = new StringDecoder("utf8");
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > policy.LIMITS.bytes) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true });
    pending += decoder.write(chunk);
    let end;
    while ((end = pending.indexOf("\n")) >= 0) {
      if (end > policy.LIMITS.string) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true });
      yield pending.slice(0, end); pending = pending.slice(end + 1);
    }
    if (pending.length > policy.LIMITS.string) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true });
  }
  pending += decoder.end();
  if (pending) yield pending;
}
export async function readHostResponse(response) {
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body ?? []) {
    bytes += chunk.length;
    if (bytes > policy.LIMITS.bytes) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true, retryable: false });
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true, retryable: false }); }
}
