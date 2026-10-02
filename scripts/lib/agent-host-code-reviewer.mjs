import { spawn } from "node:child_process";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import { checkServerIdentity } from "node:tls";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { pinnedIpv4Lookup } from "./agent-host-handoff-client.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";

const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/), commit = z.string().regex(/^[a-f0-9]{40}$/);
export const codeReviewerConfigSchema = z.object({ agentId: id, credentialTarget: z.string().regex(/^Roost\/Gate(?:2|3)\/[A-Za-z0-9._-]{1,80}$/),
  grantId: id, certificateFingerprint: hash }).strict();
const line = z.string().trim().min(3).max(2000);
const lines = z.array(line).min(1).max(12);
const evidence = z.array(z.object({ kind: z.enum(["test", "artifact"]), reference: line, result: line,
  verdict: z.enum(["pass", "fail", "unknown"]).optional() }).strict()).min(1).max(12);
const reviewerDecision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), reviewedCommit: commit, evidenceDigest: hash,
    summary: line, evidence: evidence.refine(items => items.some(item => item.kind === "test" && item.verdict === "pass")) }).strict(),
  z.object({ decision: z.literal("reject"), reviewedCommit: commit, evidenceDigest: hash,
    summary: line, evidence, reproduction: lines, expected: line, observed: line,
    correction: z.object({ scope: lines, excluded: lines, outcome: line,
      competencies: z.array(z.string().trim().min(1).max(120)).min(1).max(30) }).strict() }).strict()
]);
const fail = (reason = "unproven") => { throw Object.assign(new Error("code_reviewer_unproven"), { protocolAdmission: true, retryable: false,
  details: { reason: /^[a-z][a-z0-9_]{2,80}$/.test(reason) ? reason : "unproven" },
  publicMessage: "Independent code review credential, transport or exact result could not be verified." }); };
const credentialScript = fileURLToPath(new URL("../roost-agent-credential.ps1", import.meta.url));
export async function readCodeReviewerCredential(config) {
  try {
    const parsed = codeReviewerConfigSchema.parse(config);
    const source = `$ErrorActionPreference='Stop'; . '${credentialScript.replaceAll("'", "''")}'; [Console]::Out.Write([RoostCredential]::Read('${parsed.credentialTarget}'))`;
    const argv = ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")];
    const key = await new Promise((resolve, reject) => {
      const child = spawn("powershell.exe", argv, { windowsHide: true, shell: false, stdio: ["ignore", "pipe", "ignore"] });
      let data = "", failed = false;
      const timer = setTimeout(() => { failed = true; child.kill(); }, 10000);
      child.stdout.on("data", chunk => { data += chunk.toString("utf8"); if (data.length > 256) { failed = true; child.kill(); } });
      child.once("error", () => { clearTimeout(timer); reject(new Error()); });
      child.once("close", code => { clearTimeout(timer); failed || code !== 0 ? reject(new Error()) : resolve(data); });
    });
    if (!/^cc_v1_[A-Za-z0-9_-]{32}$/.test(key)) fail();
    return key;
  } catch { fail("credential_unproven"); }
}

export async function reviewerApi({ baseUrl, config, key, route, method = "GET", body }) {
  let stage = "api_input_invalid";
  try {
    codeReviewerConfigSchema.parse(config);
    const origin = new URL(baseUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash
        || origin.pathname !== "/" || !/^\/v1\/agent-runtime\/tasks\/[a-f0-9-]{36}\/(?:review|actions\/review)$/.test(route)
        || !/^cc_v1_[A-Za-z0-9_-]{32}$/.test(key) || !["GET", "POST"].includes(method)) fail();
    stage = "api_dns_unproven";
    const addresses = await dnsLookup(origin.hostname, { all: true, family: 4, verbatim: true });
    if (!addresses.length || addresses.length > 16) fail();
    const address = addresses[0].address, lookup = pinnedIpv4Lookup(address);
    const payload = body === undefined ? null : JSON.stringify(body);
    if ((method === "POST") !== (payload !== null) || payload && Buffer.byteLength(payload) > 32768) fail();
    stage = "api_transport_unproven";
    const value = await new Promise((resolve, reject) => {
      const request = https.request({ protocol: "https:", hostname: origin.hostname, servername: origin.hostname,
        port: origin.port || "443", path: route, method, agent: false, lookup, rejectUnauthorized: true,
        minVersion: "TLSv1.2", timeout: 10000, maxHeaderSize: 8192,
        checkServerIdentity: (hostname, cert) => {
          const ordinary = checkServerIdentity(hostname, cert);
          if (ordinary) return ordinary;
          const actual = createHash("sha256").update(cert.raw ?? Buffer.alloc(0)).digest();
          return timingSafeEqual(actual, Buffer.from(config.certificateFingerprint, "hex")) ? undefined : Error("review_tls_pin_invalid");
        }, headers: { "X-API-Key": key, Accept: "application/json", "Content-Type": "application/json",
          "Cache-Control": "no-store", ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}) } }, response => {
        if (response.statusCode !== 200 || response.headers.location || response.headers["content-encoding"]) {
          stage = Number.isInteger(response.statusCode) ? `api_http_${response.statusCode}` : "api_response_invalid";
          response.destroy(); reject(new Error()); return;
        }
        let size = 0; const chunks = [];
        response.on("data", chunk => { size += chunk.length; if (size > 131072) { response.destroy(); reject(new Error()); } else chunks.push(chunk); });
        response.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error()); } });
        response.on("error", () => reject(new Error()));
      });
      request.on("error", () => reject(new Error()));
      request.on("timeout", () => { request.destroy(); reject(new Error()); });
      request.end(payload ?? undefined);
    });
    stage = "api_response_invalid";
    if (!value?.data || typeof value.data !== "object") fail(stage);
    return value.data;
  } catch { fail(stage); }
}

export const basisRevalidationSchema = z.object({ id, originalPinId: id, originalRevision: hash,
  originalMaterialVersion: hash, readyPinId: id, readyRevision: hash, readyPinDigest: hash,
  commit, actorUserId: id, createdAt: z.string().min(19).max(40).refine(value => Number.isFinite(Date.parse(value))) }).strict();

// This mapping is a trusted TLS API projection of an append-only server record,
// not client permission to replace the original native evidence. Review and the
// eventual decision bind the current material, including its new required basis.
export function codeReviewReferenceMatches(view, review) {
  const mapping = view?.result?.basisRevalidation;
  if (!mapping) return hash.safeParse(review?.verifiedEvidenceDigest).success
    && view?.materialVersion === review.verifiedEvidenceDigest;
  const parsed = basisRevalidationSchema.safeParse(mapping);
  if (!parsed.success || view.basisCurrent !== true || view.canReview !== true
    || view.grantAccess?.review_decision?.status !== "active"
    || !hash.safeParse(view.materialVersion).success || view.materialVersion === review?.verifiedEvidenceDigest) return false;
  const basis = parsed.data;
  return basis.originalMaterialVersion === review?.verifiedEvidenceDigest
    && basis.commit === review.reviewedCommit && basis.originalPinId !== basis.readyPinId
    && view.result?.pin?.pinId === basis.originalPinId && view.result?.pin?.revision === basis.originalRevision
    && view.task?.id === review.verifiedTaskId && view.result?.taskId === review.verifiedTaskId
    && view.result?.executionId === review.verifiedExecutionId
    && view.result?.resultRevision?.commit === review.reviewedCommit && view.approvalCommit === review.reviewedCommit;
}

export function validateCodeReviewView(view, review, reviewerAgentId) {
  try {
    if (!codeReviewReferenceMatches(view, review) || view.result?.executionId !== review.verifiedExecutionId
        || view.result?.resultRevision?.commit !== review.reviewedCommit || view.approvalCommit !== review.reviewedCommit
        || view.result?.contract?.taskRoles?.verifier?.id !== reviewerAgentId
        || view.result?.contract?.assignment?.agentId === reviewerAgentId || !view.canReview
        || view.grantAccess?.review_decision?.status === "blocked") fail();
    return view;
  } catch { fail("review_view_invalid"); }
}

export function prepareCodeReviewDecision({ finalResponse, view, review, config, readOnlyAudit }) {
  try {
    let parsed;
    try { parsed = JSON.parse(finalResponse.trim()); } catch { fail("model_json_invalid"); }
    const result = reviewerDecision.safeParse(parsed);
    if (!result.success) {
      const field = String(result.error.issues[0]?.path?.[0] ?? "root");
      fail(`model_schema_${/^[a-z][a-z0-9]{0,30}$/.test(field) ? field : "field"}`);
    }
    const candidate = result.data;
    if (!codeReviewReferenceMatches(view, review) || candidate.reviewedCommit !== review.reviewedCommit || candidate.evidenceDigest !== view.materialVersion
        || readOnlyAudit?.reviewedCommit !== review.reviewedCommit || readOnlyAudit?.verifiedEvidenceDigest !== view.materialVersion
        || readOnlyAudit?.verifiedExecutionId !== review.verifiedExecutionId) fail("model_binding_invalid");
    const { evidenceDigest: _evidenceDigest, reviewedCommit, ...decision } = candidate;
    const body = { grantId: config.grantId, requestId: randomUUID(), expectedVersion: view.expectedVersion,
      executionId: review.verifiedExecutionId, materialVersion: view.materialVersion, ...decision,
      ...(candidate.decision === "approve" ? { reviewedCommit } : {}) };
    const checked = guardHostContent(body, "required");
    if (checked.redacted || JSON.stringify(checked.value) !== JSON.stringify(body)) fail("model_content_blocked");
    return body;
  } catch (error) { if (error?.message === "code_reviewer_unproven") throw error; fail("model_result_unproven"); }
}
