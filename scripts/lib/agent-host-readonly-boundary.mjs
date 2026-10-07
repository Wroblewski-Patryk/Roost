import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, openSync, fstatSync, closeSync } from "node:fs";
import path from "node:path";
import { captureNativeFootprint, nativeDigest, nativeRelative, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { acquireApplicationLease, assertApplicationLease, releaseApplicationLease } from "./agent-host-application-lease.mjs";
import { isHermesStartupReceipt } from "./agent-host-hermes-startup.mjs";
import { assertHermesBudgetReceipt, hermesBudgetReceiptMatches } from "./agent-host-hermes-budget.mjs";
import { isWindowsJobCleanupReceipt } from "./agent-host-windows-job.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { codeReviewReferenceMatches } from "./agent-host-code-reviewer.mjs";
import { collectQualifiedCrlfReviewDiff } from "./agent-host-review-crlf-diff.mjs";
import { isPrimaryReadOnlyReview, qualifyPrimaryReadOnlyReviewMaterial } from "./agent-host-code-reviewer-prior-audit.mjs";

const sealed = new WeakMap(), receipts = new WeakMap(), observedRepositoryIdentities = new WeakMap();
const hex = value => createHash("sha256").update(value).digest("hex");
const fail = (reason = "unproven") => { throw Object.assign(new Error("readonly_boundary_unproven"), { protocolAdmission: true,
  retryable: false, details: { reason: /^[a-z][a-z0-9_]{2,80}$/.test(reason) ? reason : "unproven" }, publicMessage: "Read-only inspection changed or cannot be proven; reconcile before another attempt." }); };
const preserveBoundaryFailure = (error, fallback) => fail(error?.protocolAdmission
  && /^[a-z][a-z0-9_]{2,80}$/.test(error.details?.reason ?? "") ? error.details.reason : fallback);
const frozen = value => { if (value && typeof value === "object") { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const git = (root, args, options = {}) => {
  const result = execFileSync("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args], {
  cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: options.binary ? 8388608 : 65536,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" }, encoding: options.binary ? undefined : "utf8" });
  return options.binary ? result : result.trim();
};
const hermesSources = ["toolsets.py", "model_tools.py", "cli.py", "agent/agent_init.py", "agent/coding_context.py", "hermes_cli/oneshot.py"];
function hermesToolSource(provider) {
  const root = path.dirname(path.dirname(path.dirname(provider.executablePath)));
  try { if (git(root, ["rev-parse", "HEAD"]) !== provider.commit) fail("tool_source_commit_changed"); }
  catch (error) { preserveBoundaryFailure(error, error?.code === "ETIMEDOUT" ? "tool_source_pin_timeout" : "tool_source_pin_unavailable"); }
  try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...hermesSources], {
    cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 4096 }); }
  catch (error) { fail(error?.status === 1 ? "tool_source_changed"
    : error?.code === "ETIMEDOUT" ? "tool_source_observation_timeout" : "tool_source_observation_unavailable"); }
  return { root, sourceDigest: nativeDigest(hermesSources.map(relative => {
    const file = path.join(root, relative), stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 256 * 1024) fail("tool_source_file_invalid");
    return [relative, hex(readFileSync(file))];
  })) };
}
export function qualifyHermesReadOnlyTools(provider, environment) {
  let stage = "tool_source_file_unavailable";
  try {
    const { root, sourceDigest } = hermesToolSource(provider);
    const script = `import sys,json;sys.path.insert(0,${JSON.stringify(root)});from toolsets import resolve_multiple_toolsets;from model_tools import get_tool_definitions;print(json.dumps([resolve_multiple_toolsets(['bot_room']),get_tool_definitions(enabled_toolsets=['bot_room'],quiet_mode=True)]))`;
    stage = "tool_qualification_unavailable";
    let output;
    try { output = execFileSync(path.join(root, "venv", "Scripts", "python.exe"), ["-I", "-B", "-c", script], {
      cwd: root, env: environment, windowsHide: true, shell: false, timeout: 30000, maxBuffer: 4096, encoding: "utf8" }); }
    catch (error) { fail(error?.code === "ETIMEDOUT" ? "tool_qualification_timeout" : "tool_qualification_unavailable"); }
    if (output.trim() !== "[[], []]") fail("tool_qualification_output_invalid");
    return Object.freeze({ sourceDigest, nativeTools: [] });
  } catch (error) { preserveBoundaryFailure(error, stage); }
}

function state(root, expected) {
  // Keep observation failures distinguishable from a changed snapshot without
  // publishing command output, process rows, addresses or repository paths.
  const observe = (kind, action) => {
    try { return action(); }
    catch (error) { fail(`${kind}_observation_${error?.code === "ETIMEDOUT" ? "timeout" : "unavailable"}`); }
  };
  const footprint = observe("repository", () => captureNativeFootprint(root, expected));
  // These are observations, not commands exposed to Hermes. A missing observer
  // cannot be reported as unchanged.
  const listening = process.platform === "win32"
    ? observe("tcp", () => execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
      "Get-NetTCPConnection -State Listen | Sort-Object LocalAddress,LocalPort,OwningProcess | ForEach-Object { '{0}|{1}|{2}' -f $_.LocalAddress,$_.LocalPort,$_.OwningProcess }"],
      { windowsHide: true, timeout: 10000, maxBuffer: 262144, encoding: "utf8" })) : "non_windows_test";
  // Docker's human-readable Status includes elapsed time (for example, "Up 3 minutes").
  // It changes while containers are untouched and makes a long bounded read look
  // like a side effect. State retains the stable running-container identity check.
  const docker = observe("docker", () => execFileSync("docker", ["ps", "--no-trunc", "--format", "{{.ID}}|{{.Image}}|{{.State}}|{{.Ports}}"],
    { windowsHide: true, shell: false, timeout: 30000, maxBuffer: 262144, encoding: "utf8" }));
  return { footprint, processDigest: hex(listening), dockerDigest: hex(docker) };
}

const sameSourceStat=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.nlink===b.nlink&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
// Windows lstat reports dev=0 while an open handle reports the volume device.
// Compare the inode and all material metadata across those APIs; each API's own
// before/after snapshot still compares its device as well.
const samePathHandleStat=(a,b)=>a.ino===b.ino&&a.nlink===b.nlink&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs
  &&(process.platform==="win32"&&a.dev===0n||a.dev===b.dev);
function fragmentSource(file){
  const identity=physicalIdentity(file,false);
  const before=lstatSync(file,{bigint:true});
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>1048576n)fail("read_fragment_source_invalid");
  let fd;
  try{
    fd=openSync(file,"r");
    const handleBefore=fstatSync(fd,{bigint:true});
    if(!samePathHandleStat(before,handleBefore))fail("read_fragment_source_changed");
    const bytes=readFileSync(fd);
    if(BigInt(bytes.length)!==before.size||!sameSourceStat(handleBefore,fstatSync(fd,{bigint:true}))
      ||!sameSourceStat(before,lstatSync(file,{bigint:true}))||physicalIdentity(file,false)!==identity)fail("read_fragment_source_changed");
    // Validate the entire source, including unselected lines. BOM and line
    // endings remain original bytes in the selected fragment.
    try{new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail("read_fragment_encoding_invalid");}
    return {bytes,stat:before,sha256:hex(bytes)};
  }finally{if(fd!==undefined)closeSync(fd);}
}
function selectedFragment(bytes,startLine,endLine){
  const offsets=[0];
  for(let i=0;i<bytes.length;i++)if(bytes[i]===10&&i+1<bytes.length)offsets.push(i+1);
  if(!bytes.length||endLine>offsets.length)fail("read_fragment_range_invalid");
  return bytes.subarray(offsets[startLine-1],offsets[endLine]??bytes.length);
}
function assertSelections(paths,fragments){
    if (!Array.isArray(paths) || !Array.isArray(fragments) || !paths.length&&!fragments.length
      || paths.length+fragments.length>32 || new Set(paths).size !== paths.length) fail("read_paths_invalid");
    const pathKey=p=>process.platform==="win32"?p.toLowerCase():p;
    const ranges=new Map();
    for(const fragment of fragments){
      if(!fragment||typeof fragment!=="object"||Array.isArray(fragment)
        ||Object.keys(fragment).sort().join(",")!=="endLine,path,startLine"||typeof fragment.path!=="string"
        ||!Number.isSafeInteger(fragment.startLine)||!Number.isSafeInteger(fragment.endLine)||fragment.startLine<1
        ||fragment.endLine<fragment.startLine||fragment.endLine-fragment.startLine+1>200)fail("read_fragment_selection_invalid");
      nativeRelative(fragment.path);
      const key=pathKey(fragment.path),previous=ranges.get(key)??[];
      if(paths.some(p=>typeof p==="string"&&pathKey(p)===key)
        ||previous.some(r=>fragment.startLine<=r.endLine&&fragment.endLine>=r.startLine))fail("read_fragment_selection_conflict");
      previous.push(fragment);ranges.set(key,previous);
    }
}
function assertRepositorySelection(evidence,boundary){
  const paths=boundary?.readPaths??[],fragments=boundary?.readFragments??[];
  assertSelections(paths,fragments);
  if(!Array.isArray(evidence?.files)||evidence.files.length!==paths.length+fragments.length)fail("repository_evidence_selection_mismatch");
  const {digest,...body}=evidence;
  if(digest!==nativeDigest(body))fail("repository_evidence_mismatch");
  let total=0;
  for(let i=0;i<evidence.files.length;i++){
    const file=evidence.files[i],selection=i<paths.length?null:fragments[i-paths.length];
    if(file?.path!==(selection?.path??paths[i])||file.mimeType!=="text/plain"||typeof file.content!=="string"
      ||!/^[a-f0-9]{64}$/.test(file.sha256??""))fail("repository_evidence_selection_mismatch");
    if(selection){
      if(Object.keys(file).sort().join(",")!=="content,mimeType,path,range,sha256,sourceSha256"
        ||Object.keys(file.range??{}).sort().join(",")!=="endLine,startLine"
        ||file.range?.startLine!==selection.startLine||file.range?.endLine!==selection.endLine
        ||!/^[a-f0-9]{64}$/.test(file.sourceSha256??"")||hex(Buffer.from(file.content,"utf8"))!==file.sha256)
        fail("repository_evidence_selection_mismatch");
    }else if(Object.keys(file).sort().join(",")!=="content,mimeType,path,sha256"||Buffer.byteLength(file.content)>32768)
      fail("repository_evidence_selection_mismatch");
    if((total+=Buffer.byteLength(file.content))>65536)fail("read_file_budget_exceeded");
  }
}
function assertFragmentProvenance(evidence,root){
  const sources=new Map();
  for(const entry of evidence.files){
    if(!entry.range)continue;
    let source=sources.get(entry.path);
    if(!source){source=fragmentSource(path.join(root,entry.path));sources.set(entry.path,source);}
    const bytes=selectedFragment(source.bytes,entry.range.startLine,entry.range.endLine);
    if(source.sha256!==entry.sourceSha256||hex(bytes)!==entry.sha256
      ||new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes)!==entry.content)fail("read_fragment_source_changed");
  }
}
// Model-only identity labels. The original native tree/digest stay unchanged.
// A serialized legacy receipt cannot acquire an unobserved Git object identity.
export function projectReadOnlyRepositoryIdentityDomains(evidence) {
  if (evidence?.schemaVersion !== "roost-readonly-repository-evidence-v1"
      || !/^[a-f0-9]{64}$/.test(evidence.tree ?? "") || !/^[a-f0-9]{40}$/.test(evidence.head ?? "")) return null;
  const observed = observedRepositoryIdentities.get(evidence);
  if (observed && (observed.nativeSnapshotSha256 !== evidence.tree || observed.commitOid !== evidence.head
      || observed.branch !== evidence.branch || observed.evidenceDigest !== evidence.digest)) fail("repository_identity_changed");
  return frozen({ schemaVersion: "roost-readonly-repository-identity-domains-v1", commitOid: evidence.head,
    nativeSnapshotSha256: evidence.tree, nativeSnapshotKind: "bounded_physical_native_repository_footprint",
    gitTreeObservation: observed ? "observed_from_same_bounded_collection" : "not_observed_in_this_receipt",
    ...(observed ? { gitTreeOid: observed.gitTreeOid } : {}) });
}

export function collectReadOnlyRepositoryEvidence({ repositoryPath, expected, paths = [], fragments = [], secrets = [], reviewMaterial = null, review = null }) {
  let stage = "repository_root_unavailable";
  try {
    assertSelections(paths,fragments);
    const root = realpathSync.native(repositoryPath), pre = state(root, expected);
    if (pre.footprint.dirty.length) fail("repository_dirty");
    stage = "repository_git_tree_unavailable";
    const gitTreeOid = git(root, ["rev-parse", expected.head + "^{tree}"]);
    if (!/^[a-f0-9]{40}$/.test(gitTreeOid)) fail("repository_git_tree_invalid");
    const files = []; let total = 0;
    for (const relative of paths) {
      stage = "read_file_observation_unavailable";
      nativeRelative(relative);
      const file = path.join(root, relative), stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 32768 || realpathSync.native(file) !== file) fail("read_file_invalid");
      stage = "read_file_untracked";
      if (git(root, ["ls-files", "--error-unmatch", "--", relative]) !== relative) fail("read_file_untracked");
      stage = "read_file_observation_unavailable";
      const bytes = readFileSync(file);
      if (bytes.length !== stat.size) fail("read_file_changed");
      if ((total += bytes.length) > 65536) fail("read_file_budget_exceeded");
      stage = "read_file_encoding_invalid";
      const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const inspected = guardHostContent({ relative, content }, "required", secrets);
      if (inspected.redacted || inspected.blocked || inspected.value?.content !== content
          || inspected.value?.relative !== relative) fail("read_file_redaction_blocked");
      files.push({ path: relative, mimeType: "text/plain", content: inspected.value.content, sha256: hex(bytes) });
    }
    const fragmentSources=new Map();
    for(const fragment of fragments){
      stage="read_fragment_observation_unavailable";
      const file=path.join(root,fragment.path);
      if(git(root,["ls-files","--error-unmatch","--",fragment.path])!==fragment.path)fail("read_file_untracked");
      let source=fragmentSources.get(file);
      if(!source){source=fragmentSource(file);fragmentSources.set(file,source);}
      const bytes=selectedFragment(source.bytes,fragment.startLine,fragment.endLine);
      if((total+=bytes.length)>65536)fail("read_file_budget_exceeded");
      const content=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);
      stage="read_file_redaction_blocked";
      const inspected=guardHostContent({relative:fragment.path,content},"required",secrets);
      if(inspected.redacted||inspected.blocked||inspected.value?.content!==content||inspected.value?.relative!==fragment.path)fail("read_file_redaction_blocked");
      files.push({path:fragment.path,mimeType:"text/plain",content,sha256:hex(bytes),sourceSha256:source.sha256,
        range:{startLine:fragment.startLine,endLine:fragment.endLine}});
    }
    const post = state(root, expected);
    if (pre.footprint.digest !== post.footprint.digest) fail("repository_changed");
    if (pre.processDigest !== post.processDigest) fail("process_changed");
    if (pre.dockerDigest !== post.dockerDigest) fail("docker_changed");
    stage = "repository_git_tree_unavailable";
    if (git(root, ["rev-parse", expected.head + "^{tree}"]) !== gitTreeOid) fail("repository_git_tree_changed");
    // The full source is read only for provenance and never projected. Recheck
    // it after the paired observations, including unselected source lines.
    for(const [file,source]of fragmentSources){
      const fresh=fragmentSource(file);
      if(!sameSourceStat(source.stat,fresh.stat)||source.sha256!==fresh.sha256)fail("read_fragment_source_changed");
    }
    let reviewed = null;
    if (review) {
      stage = "review_material_unavailable";
      if (isPrimaryReadOnlyReview(review)) {
        reviewed = qualifyPrimaryReadOnlyReviewMaterial(reviewMaterial, review, {
          head: expected.head, branch: expected.branch, tree: pre.footprint.digest
        });
      } else {
      if (!reviewMaterial || review.reviewedCommit !== expected.head
          || !codeReviewReferenceMatches(reviewMaterial, review)
          || reviewMaterial.result?.executionId !== review.verifiedExecutionId
          || reviewMaterial.result?.resultRevision?.commit !== review.reviewedCommit
          || reviewMaterial.result?.verification?.localCommit?.commit !== review.reviewedCommit
          || !reviewMaterial.result?.verification?.codingTests?.passed
          || git(root, ["rev-parse", `${review.reviewedCommit}^1`]) !== review.baselineCommit) fail("review_material_mismatch");
      stage = "review_diff_unavailable";
      const rawDiff = git(root, ["diff", "--binary", "--no-ext-diff", "--no-textconv",
        review.baselineCommit, review.reviewedCommit, "--"], { binary: true });
      const legacyDiff = rawDiff.toString("utf8").trim();
      const represented = collectQualifiedCrlfReviewDiff({ git: (args, options) => git(root, args, options),
        baselineCommit: review.baselineCommit, reviewedCommit: review.reviewedCommit,
        changedFiles: reviewMaterial.result.changedFiles,
        rawDiff: Buffer.byteLength(legacyDiff) <= 32768 ? legacyDiff : rawDiff });
      const { diff, certificate } = represented;
      if (!diff || Buffer.byteLength(diff) > 32768) fail("review_diff_invalid");
      const safe = guardHostContent({ diff }, "required", secrets);
      if (safe.redacted || safe.value?.diff !== diff) fail("review_diff_redaction_blocked");
      reviewed = { verifiedTaskId: review.verifiedTaskId, verifiedExecutionId: review.verifiedExecutionId,
        materialVersion: reviewMaterial.materialVersion,
        ...(reviewMaterial.result.basisRevalidation ? { originalMaterialVersion: review.verifiedEvidenceDigest, basisCurrent: reviewMaterial.basisCurrent,
          basisRevalidation: structuredClone(reviewMaterial.result.basisRevalidation) } : {}), baselineCommit: review.baselineCommit,
        reviewedCommit: review.reviewedCommit, changedFiles: reviewMaterial.result.changedFiles,
        codingTests: reviewMaterial.result.verification.codingTests,
        localCommit: reviewMaterial.result.verification.localCommit,
        nativeReview: reviewMaterial.result.verification.nativeReviewReceipt,
        diff, diffDigest: hex(diff), ...(certificate ? { diffCertificate: certificate } : {}) };
      }
      const checked = guardHostContent(reviewed, "required", secrets);
      if (checked.redacted || nativeDigest(checked.value) !== nativeDigest(reviewed)) fail("review_material_redaction_blocked");
    }
    const evidence = { schemaVersion: "roost-readonly-repository-evidence-v1", head: expected.head,
      branch: expected.branch, files, tree: pre.footprint.digest, processDigest: pre.processDigest, dockerDigest: pre.dockerDigest,
      ...(reviewed ? { reviewed } : {}) };
    const result = frozen({ ...evidence, digest: nativeDigest(evidence) });
    observedRepositoryIdentities.set(result, frozen({ commitOid: result.head, branch: result.branch,
      nativeSnapshotSha256: result.tree, gitTreeOid, evidenceDigest: result.digest }));
    return result;
  } catch (error) { preserveBoundaryFailure(error, stage); }
}

export function sealReadOnlyBoundary({ envelope, provider, repositoryPath, expected, writerLock, startupReceipt, budgetReceipt,
  repositoryEvidence, startupEnvironment }) {
  let stage = "startup_binding_invalid";
  try {
    assertRepositorySelection(repositoryEvidence,envelope.contract.nativeBoundary);
    if (envelope.contract.nativeBoundary?.profile !== "inspect-readonly" || envelope.contract.access.sandbox !== "read-only"
        || startupReceipt.toolsets.length !== 1 || startupReceipt.toolsets[0] !== "bot_room" || startupReceipt.expandedTools.length
        || startupReceipt.categories.length !== 1 || startupReceipt.categories[0] !== "repository_read"
        || !isHermesStartupReceipt(startupReceipt, envelope) || !hermesBudgetReceiptMatches(budgetReceipt, envelope, startupReceipt)) fail("startup_binding_invalid");
    stage = "budget_unavailable"; assertHermesBudgetReceipt(budgetReceipt);
    stage = "writer_unavailable"; assertWriterLock(writerLock);
    stage = "tool_qualification_unavailable";
    const tools = qualifyHermesReadOnlyTools(provider, startupEnvironment);
    stage = "repository_evidence_unavailable";
    if (repositoryEvidence?.head !== expected.head || repositoryEvidence.branch !== expected.branch) fail("repository_evidence_mismatch");
    if (repositoryEvidence.tree !== state(repositoryPath, expected).footprint.digest) fail("repository_changed");
    assertFragmentProvenance(repositoryEvidence,repositoryPath);
    stage = "application_lease_unavailable";
    const app = acquireApplicationLease({ writerLock, applicationId: envelope.identity.applicationId,
      attempt: envelope.identity.executionId, runtime: envelope.contract.nativeBoundary.runtime });
    const proof = Object.freeze({});
    sealed.set(proof, { envelope, provider, repositoryPath, expected: structuredClone(expected), writerLock,
      startupReceipt, budgetReceipt, repositoryEvidence, app, tools, consumed: false, complete: false });
    return proof;
  } catch (error) { preserveBoundaryFailure(error, stage); }
}

export function assertReadOnlyBoundary(proof, envelope) {
  try {
    const saved = sealed.get(proof);
    if (!saved || saved.envelope !== envelope || saved.consumed || saved.complete) fail("proof_invalid");
    assertRepositorySelection(saved.repositoryEvidence,envelope.contract.nativeBoundary);
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app); assertHermesBudgetReceipt(saved.budgetReceipt);
    if (!isHermesStartupReceipt(saved.startupReceipt, envelope)
        || saved.startupReceipt.expandedTools.length || saved.startupReceipt.toolsets.join() !== "bot_room") fail("startup_changed");
    if (hermesToolSource(saved.provider).sourceDigest !== saved.tools.sourceDigest) fail("tool_source_changed");
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree) fail("repository_changed");
    if (now.processDigest !== saved.repositoryEvidence.processDigest) fail("process_changed");
    if (now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail("docker_changed");
    assertFragmentProvenance(saved.repositoryEvidence,saved.repositoryPath);
    const body = { schemaVersion: "roost-hermes-readonly-boundary-v1", attemptId: envelope.identity.executionId,
      inputSeal: envelope.seal, preFootprintDigest: now.footprint.digest, canonicalRootDigest: now.footprint.rootIdentity,
      repositoryIdentityDigest: now.footprint.gitIdentity, oneWriterReference: nativeDigest(assertWriterLock(saved.writerLock).reference),
      applicationLeaseReference: assertApplicationLease(saved.app).reference,
      startupReceiptDigest: saved.startupReceipt.digest, budgetReceiptDigest: saved.budgetReceipt.digest,
      repositoryEvidenceDigest: saved.repositoryEvidence.digest, toolSourceDigest: saved.tools.sourceDigest,
      toolsets: ["bot_room"], nativeTools: [], readPaths: [...envelope.contract.nativeBoundary.readPaths],
      ...(envelope.contract.nativeBoundary.readFragments!==undefined
        ?{readFragments:structuredClone(envelope.contract.nativeBoundary.readFragments)}:{}) };
    const receipt = frozen({ ...body, digest: nativeDigest(body) });
    receipts.set(receipt, proof); return receipt;
  } catch (error) { if (error.message === "readonly_boundary_unproven" && error.protocolAdmission) throw error; fail("assertion_unavailable"); }
}

export function consumeReadOnlyBoundary(receipt, { cwd, environment, attempt, budgetReceipt }) {
  try {
    const proof = receipts.get(receipt), saved = sealed.get(proof);
    if (!saved || saved.consumed || saved.complete || cwd !== saved.repositoryPath
        || environment.HERMES_SAFE_MODE !== "1" || attempt !== saved.envelope.identity.executionId
        || budgetReceipt !== saved.budgetReceipt) fail("binding_changed");
    if (assertReadOnlyBoundary(proof, saved.envelope).digest !== receipt.digest) fail("receipt_changed");
    saved.consumed = true; return proof;
  } catch (error) { if (error.message === "readonly_boundary_unproven" && error.protocolAdmission) throw error; fail("consumption_unavailable"); }
}

export function authorizeReadOnlyResume(proof, assignment, runtime) {
  try {
    const saved = sealed.get(proof);
    if (!saved?.consumed || saved.complete || saved.resumeAuthorized || !assignment || !runtime) fail();
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app);
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    assertFragmentProvenance(saved.repositoryEvidence,saved.repositoryPath);
    saved.resumeAuthorized = true;
    return nativeDigest([saved.envelope.seal, saved.startupReceipt.digest, saved.budgetReceipt.digest,
      saved.repositoryEvidence.digest, assignment, runtime]);
  } catch { fail(); }
}

export function completeReadOnlyBoundary(proof, { ownedTreeReceipt, error } = {}) {
  try {
    const saved = sealed.get(proof);
    if (!saved || !saved.consumed || !saved.resumeAuthorized || saved.complete || error || !isWindowsJobCleanupReceipt(ownedTreeReceipt)
        || ownedTreeReceipt.attempt !== saved.envelope.identity.executionId || ownedTreeReceipt.activeProcesses !== 0
        || !ownedTreeReceipt.cleanup || !ownedTreeReceipt.jobClosed
        || ownedTreeReceipt.rootExit !== 0 || ownedTreeReceipt.terminationReason !== "root_exit") fail();
    saved.complete = true;
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    assertFragmentProvenance(saved.repositoryEvidence,saved.repositoryPath);
    assertApplicationLease(saved.app);
    releaseApplicationLease(saved.app);
    const review = saved.envelope.contract.nativeBoundary.inspectReadOnly;
    const body = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: saved.repositoryEvidence.digest,
      preTree: saved.repositoryEvidence.tree, postTree: now.footprint.digest, processState: "unchanged", dockerState: "unchanged",
      gitState: "unchanged", nativeTools: [], processCoverage: "listening_tcp_plus_owned_job_zero_processes",
      dockerCoverage: "running_container_list", ...(review.kind === "verifier" || review.kind === "code-reviewer"
        ? { verifiedExecutionId: review.verifiedExecutionId, verifiedEvidenceDigest: review.kind === "code-reviewer"
          ? saved.repositoryEvidence.reviewed.materialVersion : review.verifiedEvidenceDigest } : {}),
      ...(review.kind === "code-reviewer" ? { verifiedTaskId: review.verifiedTaskId, reviewedCommit: review.reviewedCommit,
        baselineCommit: review.baselineCommit, diffDigest: saved.repositoryEvidence.reviewed.diffDigest,
        ...(saved.repositoryEvidence.reviewed.diffCertificate ? {
          diffCertificateDigest: nativeDigest(saved.repositoryEvidence.reviewed.diffCertificate),
          originalDiffDigest: saved.repositoryEvidence.reviewed.diffCertificate.originalDiffDigest
        } : {}) } : {}) };
    return frozen({ ...body, digest: nativeDigest(body) });
  } catch { fail(); }
}

export function abortReadOnlyBoundary(proof, ownedTreeReceipt = null) {
  try {
    const saved = sealed.get(proof);
    if (!saved || saved.complete || saved.consumed && (!isWindowsJobCleanupReceipt(ownedTreeReceipt)
        || ownedTreeReceipt.attempt !== saved.envelope.identity.executionId || ownedTreeReceipt.activeProcesses !== 0)) fail();
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app);
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    assertFragmentProvenance(saved.repositoryEvidence,saved.repositoryPath);
    releaseApplicationLease(saved.app); saved.complete = true;
  } catch { fail(); }
}
