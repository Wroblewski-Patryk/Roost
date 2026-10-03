import { lstat, realpath, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sha = /^[a-f0-9]{40}$/;
const fail = () => { throw Object.assign(Error('release_git_materialization_unproven'), { retryable: false }); };
const equalPath = (a, b) => process.platform === 'win32'
  ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
  : path.resolve(a) === path.resolve(b);
async function plainDirectory(directory) {
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !equalPath(await realpath(directory), directory)) fail();
  return { dev: stat.dev, ino: stat.ino };
}
async function sameDirectory(directory, identity) {
  const current = await plainDirectory(directory);
  if (current.dev !== identity.dev || current.ino !== identity.ino) fail();
}
async function noObjectAlternates(objects) {
  // Do not allow this isolated repository to follow another repository's
  // alternate chain, HTTP object source or symbolic object-store entries.
  for (const entry of await readdir(objects, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) fail();
    if (entry.isDirectory()) {
      const subdirectory = path.join(objects, entry.name);
      await plainDirectory(subdirectory);
      for (const nested of await readdir(subdirectory, { withFileTypes: true })) {
        if (!nested.isFile() || nested.isSymbolicLink()) fail();
        if (entry.name === 'info' && ['alternates', 'http-alternates'].includes(nested.name)) fail();
      }
    } else if (!entry.isFile()) fail();
  }
}

/**
 * Populate a caller-owned empty bare directory without copying history through
 * stdout. `run(cwd, args, { limit })` must use the owned native Git executor,
 * --no-replace-objects, disabled hooks and disabled system/global configuration.
 * It receives no credentials here. Only the later isolated push may receive
 * credentials. The alternate is read-only; Git writes remain in `directory`.
 */
export async function materializeReleaseGitObjects({ canonicalDir, directory, commit, candidateTree, run }) {
  if (!sha.test(commit) || candidateTree !== undefined && !sha.test(candidateTree)
    || typeof run !== 'function' || !path.isAbsolute(canonicalDir) || !path.isAbsolute(directory)) fail();
  const source = path.resolve(canonicalDir), target = path.resolve(directory);
  // The caller owns this temporary directory; never initialize the source or
  // a descendant of it, even if a caller accidentally supplies that location.
  const relative = path.relative(source, target);
  if (!relative || !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) fail();
  const sourceIdentity = await plainDirectory(source), targetIdentity = await plainDirectory(target);
  if ((await readdir(target)).length !== 0) fail();
  const gitDirectory = path.join(source, '.git'), objects = path.join(gitDirectory, 'objects');
  const gitIdentity = await plainDirectory(gitDirectory), objectsIdentity = await plainDirectory(objects);
  await noObjectAlternates(objects);
  const read = async (cwd, args) => {
    const output = await run(cwd, args, { limit: 32768 });
    if (!Buffer.isBuffer(output) || output.length > 32768) fail();
    return output.toString('utf8').trim();
  };
  if (!equalPath(await read(source, ['rev-parse', '--absolute-git-dir']), gitDirectory)) fail();
  const common = await read(source, ['rev-parse', '--git-common-dir']);
  if (!equalPath(path.resolve(source, common), gitDirectory)) fail();
  if (await read(source, ['rev-parse', '--show-object-format']) !== 'sha1') fail();

  await read(target, ['init', '--bare', '--template=', '--initial-branch=roost-isolated', '.']);
  await sameDirectory(target, targetIdentity);
  await plainDirectory(path.join(target, 'objects'));
  await plainDirectory(path.join(target, 'objects', 'info'));
  // Git C quoting accepts these escapes. Forward slashes avoid Win32 escape
  // interpretation; JSON quoting leaves Unicode and spaces intact. Refuse
  // control characters rather than producing unsupported JSON \u escapes.
  const alternate = objects.replaceAll('\\', '/');
  if (/[\x00-\x1f\x7f]/.test(alternate)) fail();
  await writeFile(path.join(target, 'objects', 'info', 'alternates'), JSON.stringify(alternate) + '\n', { flag: 'wx', mode: 0o600 });
  // Retain only deterministic bare metadata, never copied canonical config,
  // includes, credential helpers, remote URLs, templates or hooks.
  await writeFile(path.join(target, 'config'), '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = true\n\tlogallrefupdates = false\n', { mode: 0o600 });
  if (await read(target, ['rev-parse', '--is-bare-repository']) !== 'true'
    || await read(target, ['rev-parse', '--verify', `${commit}^{commit}`]) !== commit) fail();
  const tree = await read(target, ['rev-parse', '--verify', `${commit}^{tree}`]);
  if (!sha.test(tree) || candidateTree !== undefined && tree !== candidateTree) fail();
  // --quiet suppresses the potentially huge object list, while the default
  // missing=error policy still fails if a reachable commit/tree/blob is absent.
  if (await read(target, ['rev-list', '--objects', '--missing=error', '--quiet', commit]) !== '') fail();
  await sameDirectory(source, sourceIdentity);
  await sameDirectory(gitDirectory, gitIdentity);
  await sameDirectory(objects, objectsIdentity);
  await sameDirectory(target, targetIdentity);
  return { commit, tree, ready: true };
}
