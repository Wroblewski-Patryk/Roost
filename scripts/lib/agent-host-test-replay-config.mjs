import { readFileSync, lstatSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";

export const testReplayConfigSchema = z.object({
  schemaVersion: z.literal("roost-coding-test-replay-config-v1"),
  candidateCommit: z.string().regex(/^[a-f0-9]{40}$/),
  baselineCommit: z.string().regex(/^[a-f0-9]{40}$/),
  branch: z.string().min(1).max(200),
  projectionPaths: z.array(z.string().min(1).max(512)).min(1).max(8),
  assetPaths: z.array(z.string().min(1).max(512)).min(1).max(8),
  temporaryParent: z.string().min(1).max(1024),
  expectedFailure: z.object({ fullName: z.string().min(1).max(1000),
    messageIncludes: z.array(z.string().min(1).max(1000)).min(2).max(8) }).strict()
}).strict();

// Installation configuration is independent of model text. Reopen the same
// physical private file before every replay authority check.
export function prepareTestReplayConfiguration({ filename, repositoryPath, candidateCommit, branch }) {
  const fail = () => { throw Object.assign(new Error("coding_test_replay_config_unproven"),
    { protocolAdmission: true, retryable: false }); };
  try {
    if (!path.isAbsolute(filename) || filename === repositoryPath
        || !path.relative(repositoryPath, filename).startsWith("..")) fail();
    const read = () => {
      const identity = physicalIdentity(filename, false), stat = lstatSync(filename, { bigint: true });
      if (stat.size > 16384n) fail();
      const bytes = readFileSync(filename), after = lstatSync(filename, { bigint: true });
      if (BigInt(bytes.length) !== stat.size || after.ino !== stat.ino || after.mtimeNs !== stat.mtimeNs
          || physicalIdentity(filename, false) !== identity) fail();
      return { identity, digest: createHash("sha256").update(bytes).digest("hex"), bytes };
    };
    const pin = read(), config = testReplayConfigSchema.parse(JSON.parse(pin.bytes));
    if (config.candidateCommit !== candidateCommit || config.branch !== branch) fail();
    return { config: Object.freeze(config), assertUnchanged() {
      const current = read(); if (current.identity !== pin.identity || current.digest !== pin.digest) fail();
    } };
  } catch { fail(); }
}
