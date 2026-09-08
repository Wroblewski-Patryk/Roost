import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { after } from "node:test";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

// Disposable fictional Git data only; never read another application checkout.
export async function syntheticHostWorkspace() {
  const temp = await realpath(os.tmpdir());
  const root = await realpath(await mkdtemp(path.join(temp, "roost-synthetic-host-")));
  const repository = path.join(root, "DemoApp"); await mkdir(repository);
  const git = args => promisify(execFile)("git", args, { cwd: repository, windowsHide: true, timeout: 10000 });
  await git(["init", "--initial-branch=main"]);
  await git(["-c", "user.name=Synthetic Test", "-c", "user.email=fixture@example.test", "commit", "--allow-empty", "-m", "Synthetic fixture"]);
  await git(["remote", "add", "origin", "https://github.com/example-org/DemoApp.git"]);
  after(async () => {
    const resolved = await realpath(root), relative = path.relative(temp, resolved);
    if (resolved !== root || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(resolved).startsWith("roost-synthetic-host-")) throw new Error("fixture_cleanup_boundary_invalid");
    await rm(resolved, { recursive: true, force: false });
  });
  return root;
}
