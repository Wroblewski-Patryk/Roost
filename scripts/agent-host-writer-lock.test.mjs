import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(process.cwd(), "scripts", ".writer-lock-test-"));
  t.after(async () => {
    await unlink(path.join(directory, writerLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  });
  return directory;
}

test("simultaneous hosts can acquire only one writer slot", async (t) => {
  const directory = await fixture(t);
  const attempts = await Promise.allSettled([acquireWriterLock(directory), acquireWriterLock(directory)]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.match(attempts.find((attempt) => attempt.status === "rejected").reason.message, /agent_host_writer_locked/);
  await attempts.find((attempt) => attempt.status === "fulfilled").value.release();
  const next = await acquireWriterLock(directory);
  await next.release();
});

test("an independent process cannot take the active writer slot", async (t) => {
  const directory = await fixture(t);
  const lock = await acquireWriterLock(directory);
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; try { await acquireWriterLock(${JSON.stringify(directory)}); process.exitCode = 1; } catch (error) { process.exitCode = error.message === 'agent_host_writer_locked' ? 0 : 2; }`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  const [code] = await once(child, "close");
  assert.equal(code, 0);
  await lock.release();
});

test("a dead owner is not automatically reclaimed", async (t) => {
  const directory = await fixture(t);
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; await acquireWriterLock(${JSON.stringify(directory)}); process.exit(0);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  await assert.rejects(acquireWriterLock(directory), /agent_host_writer_locked/);
});

test("release does not delete a lock whose ownership changed", async (t) => {
  const directory = await fixture(t);
  const lock = await acquireWriterLock(directory);
  const lockPath = path.join(directory, writerLockFilename);
  await writeFile(lockPath, JSON.stringify({ ownerNonce: "different-owner" }));
  await assert.rejects(lock.release(), /agent_host_writer_lock_owner_changed/);
  assert.equal(JSON.parse(await readFile(lockPath, "utf8")).ownerNonce, "different-owner");
});

test("an empty lock left by a crashed acquisition still blocks another writer", async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, writerLockFilename), "");
  await assert.rejects(acquireWriterLock(directory), /agent_host_writer_locked/);
});
