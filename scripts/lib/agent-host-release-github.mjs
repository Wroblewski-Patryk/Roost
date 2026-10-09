import https from 'node:https';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import releaseContract from './agent-host-release-contract.cjs';
import { materializeReleaseGitObjects } from './agent-host-release-git-materialization.mjs';
import { temporaryWindowsJobLauncher, startWindowsJob, isWindowsJobReceipt } from './agent-host-windows-job.mjs';
import { hasReleaseProcessScope, runReleaseNativeProcess, minimalReleaseEnvironment } from './agent-host-release-process.mjs';

const sha = /^[a-f0-9]{40}$/;
// Bound ancestry work while permitting an independently reviewed repair series.
const maximumReleaseCommits = 100;
// Git for Windows accepts NUL, but rejects Node's Win32 device path \\.\nul.
const gitNull = process.platform === 'win32' ? 'NUL' : os.devNull;
const fail = (code, uncertain = false) => { throw Object.assign(Error(code), { uncertain, retryable: false }); };
const ref = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,159}$/.test(value)
    || /\.\.|@\{|\/\//.test(value) || /[/.]$/.test(value) || value.endsWith('.lock')) fail('release_git_ref_invalid');
  return value;
};
function repository(manifest) {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(manifest.repository.url);
  if (!match) fail('release_git_repository_invalid');
  ref(manifest.repository.defaultBranch); ref(manifest.repository.candidateBranch);
  if (manifest.repository.defaultBranch === manifest.repository.candidateBranch) fail('release_git_main_push_denied');
  return `${match[1]}/${match[2]}`;
}
export function githubReleaseTransport({ method, route, token, body }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const request = https.request({ hostname: 'api.github.com', port: 443, path: route, method,
      minVersion: 'TLSv1.2', rejectUnauthorized: true, agent: false, timeout: 15000,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Roost-Governed-Release',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) } }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > 2_000_000) response.destroy(); else chunks.push(chunk); });
      response.on('error', () => reject(Error('release_git_transport_uncertain')));
      response.on('end', () => { try { resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
        catch { reject(Error('release_git_transport_uncertain')); } });
    });
    request.on('error', () => reject(Error('release_git_transport_uncertain')));
    request.on('timeout', () => request.destroy()); request.end(payload ?? undefined);
  });
}
// No repository hooks, configured helpers, redirects or credential-bearing stderr
// participate in the upload. Only this deterministic child receives the credential.
async function git(cwd, args, { input, token, limit = 128_000_000 } = {}) {
  if (hasReleaseProcessScope()) {
    const environment = { ...minimalReleaseEnvironment(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull,
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0',
      ...(token ? { GIT_CONFIG_COUNT: '3', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraHeader',
        GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
        GIT_CONFIG_KEY_1: 'http.followRedirects', GIT_CONFIG_VALUE_1: 'false', GIT_CONFIG_KEY_2: 'credential.helper', GIT_CONFIG_VALUE_2: '' } : {}) };
    return runReleaseNativeProcess('git', { argv: ['--no-replace-objects', '-c', 'core.hooksPath='+gitNull,
      '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', cwd, ...args],
      cwd, environment, input: input ?? '', durationMs: 30000, maxBytes: Math.min(limit, 131072) });
  }
  // A credential-bearing upload owns every Git/helper descendant in a kernel
  // Job. Controller loss or timeout kills that tree before reconciliation.
  if (token) {
    if (process.platform !== 'win32' || input) fail('release_git_containment_required');
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
      TMP: process.env.TMP, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull,
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_COUNT: '3',
      GIT_CONFIG_KEY_0: 'http.https://github.com/.extraHeader',
      GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
      GIT_CONFIG_KEY_1: 'http.followRedirects', GIT_CONFIG_VALUE_1: 'false',
      GIT_CONFIG_KEY_2: 'credential.helper', GIT_CONFIG_VALUE_2: '' };
    const located = spawnSync('where.exe', ['git.exe'], { env, windowsHide: true, encoding: 'utf8', timeout: 5000, maxBuffer: 32768 });
    const executable = located.status === 0 ? located.stdout.trim().split(/\r?\n/)[0] : null;
    if (!executable || !path.isAbsolute(executable)) fail('release_git_executable_unproven');
    return temporaryWindowsJobLauncher(async artifact => {
      const chunks = []; let bytes = 0;
      const job = await startWindowsJob(artifact, { executable,
        argv: ['--no-replace-objects', '-c', 'core.hooksPath=' + gitNull, '-C', cwd, ...args],
        cwd, environment: env, input: '', durationMs: 60000,
        onData: (channel, data) => { if (channel === 'stdout') { bytes += data.length;
          if (bytes > Math.min(limit, 131072)) throw Error('release_git_output_limit'); chunks.push(data); } } });
      const receipt = await job.completion;
      if (!isWindowsJobReceipt(receipt) || receipt.rootExit !== 0 || receipt.terminationReason !== 'root_exit') fail('release_git_process_failed');
      return Buffer.concat(chunks);
    });
  }
  return new Promise((resolve, reject) => {
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
      TMP: process.env.TMP, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull,
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
    if (token) Object.assign(env, { GIT_CONFIG_COUNT: '3', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraHeader',
      GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
      GIT_CONFIG_KEY_1: 'http.followRedirects', GIT_CONFIG_VALUE_1: 'false',
      GIT_CONFIG_KEY_2: 'credential.helper', GIT_CONFIG_VALUE_2: '' });
    const child = spawn('git', ['--no-replace-objects', '-c', 'core.hooksPath=' + gitNull,
      '-C', cwd, ...args], { env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    const chunks = []; let bytes = 0;
    const timer = setTimeout(() => child.kill(), 60000);
    child.stdout.on('data', c => { bytes += c.length; if (bytes > limit) child.kill(); else chunks.push(c); });
    child.once('error', () => { clearTimeout(timer); reject(Error('release_git_process_failed')); });
    child.once('close', code => { clearTimeout(timer); code === 0 && bytes <= limit
      ? resolve(Buffer.concat(chunks)) : reject(Error('release_git_process_failed')); });
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
export async function inspectReleaseCheckout(manifest, commit, baseCommit, candidateTree) {
  repository(manifest);
  if (![commit, baseCommit, candidateTree].every(v => sha.test(v))) fail('release_git_identity_invalid');
  const directory = await realpath(manifest.repository.canonicalDir);
  if (path.resolve(directory).toLowerCase() !== path.resolve(manifest.repository.canonicalDir).toLowerCase()) fail('release_git_directory_changed');
  const read = async args => (await git(directory, args, { limit: 32768 })).toString('utf8').trim();
  if (await read(['status', '--porcelain']) !== '' || await read(['rev-parse', 'HEAD']) !== commit
    || await read(['branch', '--show-current']) !== manifest.repository.candidateBranch
    || await read(['rev-parse', `${commit}^{tree}`]) !== candidateTree) fail('release_git_checkout_changed');
  try {
    await read(['merge-base', '--is-ancestor', baseCommit, commit]);
    const count=await read(['rev-list', '--count', '--max-count='+String(maximumReleaseCommits+1), `${baseCommit}..${commit}`]);
    if(!/^[1-9][0-9]{0,2}$/.test(count)||Number(count)>maximumReleaseCommits)fail('release_git_checkout_changed');
  } catch { fail('release_git_checkout_changed'); }
  const origin = (await read(['remote', 'get-url', 'origin'])).replace(/\.git$/, '');
  if (origin !== manifest.repository.url.replace(/\.git$/, '')) fail('release_git_origin_changed');
  return { commit, tree: candidateTree, baseCommit };
}
async function uploadExactCommit(manifest, commit, token, candidateTree) {
  const prefix = path.join(os.tmpdir(), 'roost-release-objects-');
  const directory = await mkdtemp(prefix);
  try {
    await materializeReleaseGitObjects({ canonicalDir: manifest.repository.canonicalDir, directory, commit, candidateTree, run: git });
    await git(directory, ['push', '--porcelain', manifest.repository.url, `${commit}:refs/heads/${ref(manifest.repository.candidateBranch)}`], { token });
  } finally {
    const absolute = path.resolve(directory);
    if (path.dirname(absolute) !== path.resolve(os.tmpdir()) || !path.basename(absolute).startsWith('roost-release-objects-')) fail('release_git_cleanup_scope_invalid');
    await rm(absolute, { recursive: true, force: true });
  }
}
export function createGithubReleaseAdapter({ credential, transport = githubReleaseTransport, upload = uploadExactCommit }) {
  const call = async (method, route, body) => {
    let response;
    try { response = await transport({ method, route, body, token: await credential() }); }
    catch { fail('release_git_remote_uncertain', method !== 'GET'); }
    if (!response || !Number.isInteger(response.status)) fail('release_git_remote_uncertain', method !== 'GET');
    if (response.status >= 500) fail('release_git_remote_uncertain', method !== 'GET');
    return response;
  };
  const required = async (method, route, body) => { const r = await call(method, route, body);
    if (r.status < 200 || r.status >= 300) fail('release_git_remote_rejected'); return r.body; };
  const inspect = async (manifest, {allowArchived=false}={}) => {
    const name = repository(manifest), repo = await required('GET', `/repos/${name}`);
    // The certification target is private. A retained application may already
    // be public; the governed path never changes repository visibility.
    if (typeof repo.private !== 'boolean' || !releaseContract.retainsApplication(manifest) && repo.private !== true
      || repo.archived && !allowArchived || repo.default_branch !== manifest.repository.defaultBranch
      || repo.full_name?.toLowerCase() !== name.toLowerCase()) fail('release_git_repository_changed');
    const main = await required('GET', `/repos/${name}/git/ref/heads/${manifest.repository.defaultBranch}`);
    if (!sha.test(main.object?.sha)) fail('release_git_remote_invalid');
    const base=await required('GET',`/repos/${name}/git/commits/${main.object.sha}`);
    if(!sha.test(base.tree?.sha))fail('release_git_remote_invalid');
    return { remoteBase: main.object.sha,remoteTree:base.tree.sha };
  };
  const candidate = async manifest => { const r = await call('GET', `/repos/${repository(manifest)}/git/ref/heads/${manifest.repository.candidateBranch}`);
    if (r.status === 404) return null; if (r.status !== 200 || !sha.test(r.body.object?.sha)) fail('release_git_remote_invalid'); return r.body.object.sha; };
  const pull = async (manifest, number) => { if (!Number.isSafeInteger(number) || number < 1) fail('release_git_pr_invalid');
    const p = await required('GET', `/repos/${repository(manifest)}/pulls/${number}`);
    if (p.base?.ref !== manifest.repository.defaultBranch || p.head?.ref !== manifest.repository.candidateBranch
      || p.head?.repo?.full_name?.toLowerCase() !== repository(manifest).toLowerCase()) fail('release_git_pr_scope_changed');
    return p; };
  const proof = p => ({ pullRequestNumber: p.number, prHeadCommit: p.head.sha, prMerged: p.merged === true,
    ...(p.merged ? { mergedCommit: p.merge_commit_sha } : {}) });
  const anchoredPublication = binding => binding.gitPublicationBase !== undefined || binding.compatibleArtifactRecovery !== undefined;
  const publicationBase = binding => {
    if (binding.gitPublicationBase && (!releaseContract.gitPublicationBaseSchema.safeParse(binding.gitPublicationBase).success
      || binding.predecessor || binding.baselineRestart || binding.baselineAdoption
      || binding.successorBasis || binding.publishedGitBasis)) fail('release_git_publication_base_scope_invalid');
    if (binding.compatibleArtifactRecovery !== undefined && (!releaseContract.isComposeManifest(binding.manifest)
      || ['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','successorBasis','publishedGitBasis'].some(k=>binding[k]!==undefined))) fail('release_git_publication_base_scope_invalid');
    return releaseContract.releaseGitPublicationBase(binding);
  };
  const inspectBase = async (manifest, binding) => {
    if (anchoredPublication(binding) && !releaseContract.isComposeManifest(manifest)) fail('release_git_publication_base_scope_invalid');
    const base = publicationBase(binding), state = await inspect(manifest);
    if (state.remoteBase !== base.commit || anchoredPublication(binding) && state.remoteTree !== base.tree)
      fail('release_git_base_changed');
    return state;
  };
  const baseEvidence = (binding, state) => anchoredPublication(binding)
    ? { remoteBase: state.remoteBase, remoteBaseTree: state.remoteTree } : {};
  const exactCandidate = async (manifest, binding) => {
    const base = publicationBase(binding);
    if (anchoredPublication(binding)) {
      const original = await required('GET', `/repos/${repository(manifest)}/git/commits/${base.commit}`);
      if (original.tree?.sha !== base.tree) fail('release_git_base_changed');
    }
    const c = await required('GET', `/repos/${repository(manifest)}/git/commits/${binding.commit}`);
    if (c.tree?.sha !== binding.candidateTree || !Array.isArray(c.parents) || !c.parents.length
      || c.parents.length>maximumReleaseCommits || c.parents.some(p=>!sha.test(p?.sha)) || binding.commit===base.commit)
      fail('release_git_exact_fastforward_required');
    if(c.parents.length!==1||c.parents[0].sha!==base.commit){
      const proof=await required('GET', `/repos/${repository(manifest)}/compare/${base.commit}...${binding.commit}?per_page=${maximumReleaseCommits}`);
      if(proof.status!=='ahead'||proof.base_commit?.sha!==base.commit||proof.merge_base_commit?.sha!==base.commit
        ||!Number.isInteger(proof.total_commits)||proof.total_commits<1||proof.total_commits>maximumReleaseCommits
        ||proof.ahead_by!==proof.total_commits||proof.behind_by!==0||!Array.isArray(proof.commits)||proof.commits.length!==proof.total_commits
        ||proof.commits.some(p=>!sha.test(p?.sha))||new Set(proof.commits.map(p=>p.sha)).size!==proof.total_commits
        ||proof.commits.at(-1)?.sha!==binding.commit)fail('release_git_exact_fastforward_required');
    }
    return c;
  };
  const findPull = async (manifest, binding) => {
    const prs = await required('GET', `/repos/${repository(manifest)}/pulls?state=all&head=${encodeURIComponent(repository(manifest).split('/')[0] + ':' + manifest.repository.candidateBranch)}&base=${encodeURIComponent(manifest.repository.defaultBranch)}&per_page=100`);
    if (!Array.isArray(prs) || prs.length >= 100) fail('release_git_pr_ambiguous');
    if (binding && anchoredPublication(binding)) {
      const eligible = [];
      for (const row of prs) {
        const observed = await pull(manifest, row.number);
        // Only an authenticated, actually merged predecessor is history.
        // It supplies no PR/review/merge evidence for this new exact commit.
        if (observed.state === 'closed' && observed.merged === true
          && observed.merge_commit_sha === publicationBase(binding).commit) continue;
        if (observed.head.sha !== binding.commit) fail('release_git_pr_ambiguous');
        eligible.push(observed);
      }
      if (eligible.length > 1) fail('release_git_pr_ambiguous');
      return eligible[0] ?? null;
    }
    if (prs.length > 1) fail('release_git_pr_ambiguous');
    return prs[0] ? pull(manifest, prs[0].number) : null;
  };
  return {
    inspect,
    async push(manifest, binding) {
      const state = await inspectBase(manifest, binding), head = await candidate(manifest);
      const oldPublishedHead = anchoredPublication(binding) && head === publicationBase(binding).commit;
      if (head && head !== binding.commit && !oldPublishedHead) fail('release_git_base_changed');
      if (!head || oldPublishedHead) { try { await upload(manifest, binding.commit, await credential(), binding.candidateTree); } catch { fail('release_git_push_uncertain', true); } }
      if (await candidate(manifest) !== binding.commit) fail('release_git_push_uncertain', true);
      await exactCandidate(manifest, binding);
      return { remoteCommit: binding.commit, remoteBase: state.remoteBase, remoteTree: binding.candidateTree,
        ...baseEvidence(binding, state) };
    },
    async createPullRequest(manifest, binding) {
      const state = await inspectBase(manifest, binding);
      if (await candidate(manifest) !== binding.commit) fail('release_git_base_changed');
      const candidateEvidence = anchoredPublication(binding) ? {remoteCommit:binding.commit,remoteTree:(await exactCandidate(manifest,binding)).tree.sha} : {};
      const p = await findPull(manifest, binding) ?? await required('POST', `/repos/${repository(manifest)}/pulls`, {
        title: `Governed release ${binding.commit.slice(0, 12)}`, head: manifest.repository.candidateBranch,
        base: manifest.repository.defaultBranch, body: `Roost independent decision ${binding.reviewId}; exact commit ${binding.commit}; material ${binding.materialVersion}.` });
      if (p.head?.sha !== binding.commit || p.state !== 'open') fail('release_git_pr_changed');
      return { ...proof(p), ...candidateEvidence, ...baseEvidence(binding, state) };
    },
    async recordIndependentReview(manifest, binding, number) {
      const state = anchoredPublication(binding) ? await inspectBase(manifest, binding) : null;
      const p = await pull(manifest, number);
      if (p.head.sha !== binding.commit || p.merged || p.state !== 'open') fail('release_git_pr_changed');
      const candidateEvidence = anchoredPublication(binding) ? {remoteCommit:binding.commit,remoteTree:(await exactCandidate(manifest,binding)).tree.sha} : {};
      // A broker may be the PR author. The independent Roost decision is authoritative;
      // a GitHub COMMENT records that decision without pretending to be another person.
      await required('POST', `/repos/${repository(manifest)}/pulls/${number}/reviews`, {
        commit_id: binding.commit, event: 'COMMENT', body: `Roost independent acceptance: decision ${binding.reviewId}, material ${binding.materialVersion}, commit ${binding.commit}.` });
      return { ...proof(p), ...candidateEvidence, reviewApproved: true, ...(state ? baseEvidence(binding, state) : {}) };
    },
    async merge(manifest, binding, number) {
      const p = await pull(manifest, number), state = await inspectBase(manifest, binding);
      if (p.head.sha !== binding.commit || p.merged || p.state !== 'open'
        ) fail('release_git_base_changed');
      await exactCandidate(manifest, binding);
      await required('PATCH', `/repos/${repository(manifest)}/git/refs/heads/${manifest.repository.defaultBranch}`, { sha: binding.commit, force: false });
      const merged = await pull(manifest, number), main = await inspect(manifest);
      if (!merged.merged || merged.merge_commit_sha !== binding.commit || main.remoteBase !== binding.commit
        || anchoredPublication(binding) && main.remoteTree !== binding.candidateTree) fail('release_git_merge_uncertain', true);
      return { ...proof(merged), remoteCommit: main.remoteBase, remoteTree: binding.candidateTree,
        ...baseEvidence(binding, state) };
    },
    async reconcile(manifest, binding, operation, number) {
      if (anchoredPublication(binding) && !releaseContract.isComposeManifest(manifest)) fail('release_git_publication_base_scope_invalid');
      const state = await inspect(manifest), head = await candidate(manifest), base = publicationBase(binding);
      if (anchoredPublication(binding) && !(operation === 'merge' && state.remoteBase === binding.commit)
        && (state.remoteBase !== base.commit || state.remoteTree !== base.tree)) fail('release_git_base_changed');
      if (operation === 'push') {
        if (state.remoteBase !== base.commit) fail('release_git_base_changed');
        if (head === binding.commit) await exactCandidate(manifest, binding);
        return head === binding.commit ? { status: 'succeeded', evidence: { remoteCommit: head, ...state, remoteTree: binding.candidateTree, ...baseEvidence(binding, state) } }
          : head === null || anchoredPublication(binding) && head === base.commit
            ? { status: 'absent', evidence: { ...state,remoteCommit:state.remoteBase, absenceVerified: true } } : fail('release_git_remote_changed');
      }
      const p = number ? await pull(manifest, number) : await findPull(manifest, binding);
      if (operation === 'pr' && !p && head === binding.commit && state.remoteBase === base.commit)
        return { status: 'absent', evidence: { ...state,remoteCommit:state.remoteBase, absenceVerified: true } };
      if (!p || p.head.sha !== binding.commit) fail('release_git_reconciliation_unproven');
      if (operation === 'pr' && p.state === 'open' && !p.merged && state.remoteBase === base.commit)
        return { status: 'succeeded', evidence: {...proof(p),remoteCommit:binding.commit,remoteTree:(await exactCandidate(manifest,binding)).tree.sha,...baseEvidence(binding,state)} };
      if (operation === 'review') {
        const reviews = await required('GET', `/repos/${repository(manifest)}/pulls/${p.number}/reviews?per_page=100`);
        if (!Array.isArray(reviews) || reviews.length >= 100) fail('release_git_reconciliation_unproven');
        const expected = `Roost independent acceptance: decision ${binding.reviewId}, material ${binding.materialVersion}, commit ${binding.commit}.`;
        if (reviews.some(r => r.commit_id === binding.commit && r.body === expected && r.state === 'COMMENTED'))
          return { status: 'succeeded', evidence: { ...proof(p),remoteCommit:binding.commit,remoteTree:(await exactCandidate(manifest,binding)).tree.sha, reviewApproved: true,...baseEvidence(binding,state) } };
        if (state.remoteBase === base.commit && !p.merged && p.state === 'open')
          return { status: 'absent', evidence: { ...state,remoteCommit:state.remoteBase, ...proof(p), absenceVerified: true } };
      }
      if (operation === 'merge') {
        if (state.remoteBase === binding.commit && p.merged && p.merge_commit_sha === binding.commit) {
          if (anchoredPublication(binding)) {
            if (state.remoteTree !== binding.candidateTree) fail('release_git_remote_changed');
            await exactCandidate(manifest,binding);
          }
          return { status: 'succeeded', evidence: { ...proof(p), remoteCommit: binding.commit, remoteTree: binding.candidateTree,
            ...(anchoredPublication(binding) ? {remoteBase:base.commit,remoteBaseTree:base.tree} : {}) } };
        }
        if (state.remoteBase === base.commit && !p.merged && p.state === 'open')
          return { status: 'absent', evidence: { ...proof(p), ...state,remoteCommit:state.remoteBase, absenceVerified: true } };
      }
      fail('release_git_reconciliation_unproven');
    },
    async archive(manifest) { await required('PATCH', `/repos/${repository(manifest)}`, { archived: true });
      const repo = await required('GET', `/repos/${repository(manifest)}`);
      if (!repo.archived || !repo.private) fail('release_git_archive_uncertain', true); return { repositoryArchived: true }; },
    async verifyArchive(manifest){const repo=await required('GET',`/repos/${repository(manifest)}`);
      if(!repo.archived||!repo.private)fail('release_git_archive_unproven');return{repositoryArchived:true};},
    async reconcileArchive(manifest){const repo=await required('GET',`/repos/${repository(manifest)}`);
      if(!repo.private)fail('release_git_repository_changed');return{status:repo.archived?'succeeded':'absent',evidence:repo.archived?{repositoryArchived:true}:{repositoryArchived:false,absenceVerified:true}};}
  };
}
