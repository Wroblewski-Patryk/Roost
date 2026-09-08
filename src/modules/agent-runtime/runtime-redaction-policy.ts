import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { env } from "../../config/env";
export const redactionPolicy = require(path.resolve(__dirname, "../../../scripts/lib/agent-runtime-redaction.cjs")) as {
  POLICY: string; MARKER: string;
  knownRuntimeSecrets(environment?: Record<string, unknown>, extra?: string[]): string[];
  sanitize(value: unknown, options?: { mode?: "required" | "diagnostic"; secrets?: string[] }): { value: any; findings: Finding[]; redacted: boolean; blocked: boolean; policy: string };
};
export type Finding = { category: string; location: string };
export type RedactionScope = { workspaceId: string; taskId?: string; executionId?: string; applicationId?: string; recordId?: string; correlationId?: string; surface: string };
export type RedactionState = { scope: RedactionScope; secrets: string[]; notices: Array<{ scope: RedactionScope; findings: Finding[] }>; incidentIds: string[]; flushing: boolean };
export const redactionState = new AsyncLocalStorage<RedactionState>();
export const runtimeSecrets = (extra: string[] = []) => redactionPolicy.knownRuntimeSecrets(process.env, [env.authTokenSecret, env.apiKeyHashSecret, env.integrationSecretKey, ...extra]);
export const safeRuntimeId = (id: unknown): string | undefined => typeof id === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ? id : undefined;
export function inspectRuntime(value: unknown, surface: string, mode: "required" | "diagnostic" = "diagnostic", scope: Partial<RedactionScope> = {}) {
  const state = redactionState.getStore();
  const result = redactionPolicy.sanitize(value, { mode, secrets: state?.secrets ?? runtimeSecrets() });
  if (result.findings.length && state && !state.flushing && state.notices.length < 64) state.notices.push({ scope: { ...state.scope, ...scope, surface }, findings: result.findings });
  return result;
}
export function requireRuntimeContent(value: unknown, surface: string, scope: Partial<RedactionScope> = {}) {
  const result = inspectRuntime(value, surface, "required", scope);
  if (result.blocked || result.redacted) throw new Error("agent_runtime_content_blocked");
}
