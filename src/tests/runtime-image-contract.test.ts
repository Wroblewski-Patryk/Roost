import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

test("runtime image contains source modules imported by the TypeScript seed", async () => {
  const root = resolve(__dirname, "../..");
  const [dockerfile, seed] = await Promise.all([
    readFile(resolve(root, "Dockerfile"), "utf8"),
    readFile(resolve(root, "prisma/seed.ts"), "utf8"),
  ]);

  assert.match(seed, /from ["']\.\.\/src\//);
  assert.match(dockerfile, /COPY --from=build \/app\/src \.\/src/);
});
